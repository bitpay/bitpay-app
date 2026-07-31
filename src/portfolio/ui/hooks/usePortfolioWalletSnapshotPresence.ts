import {useEffect, useState} from 'react';
import type {SnapshotIndexV2} from '../../core/pnl/snapshotStore';
import {getPortfolioRuntimeClient} from '../../runtime/portfolioRuntime';
import {buildCommittedPortfolioRevisionToken} from '../common';
import type {Wallet} from '../../../store/wallet/wallet.models';
import {useAppSelector} from '../../../utils/hooks';

type PortfolioWalletSnapshotPresenceState = {
  hasAnySnapshots: boolean;
  hasAllSnapshots: boolean;
  hasSnapshotsByWalletId: Record<string, boolean>;
  loading: boolean;
  checked: boolean;
};

type CachedSnapshotPresence = {
  hasAnySnapshots: boolean;
  hasAllSnapshots: boolean;
  hasSnapshotsByWalletId: Record<string, boolean>;
};

const getEmptySnapshotPresenceState =
  (): PortfolioWalletSnapshotPresenceState => ({
    hasAnySnapshots: false,
    hasAllSnapshots: false,
    hasSnapshotsByWalletId: {},
    loading: false,
    checked: true,
  });

const getCachedSnapshotPresenceState = (
  cachedPresence: CachedSnapshotPresence | undefined,
  loading: boolean,
): PortfolioWalletSnapshotPresenceState => ({
  hasAnySnapshots: cachedPresence?.hasAnySnapshots ?? true,
  hasAllSnapshots: cachedPresence?.hasAllSnapshots ?? true,
  hasSnapshotsByWalletId: cachedPresence?.hasSnapshotsByWalletId ?? {},
  loading,
  checked: !!cachedPresence,
});

const snapshotPresenceByWalletIdsKey = new Map<
  string,
  CachedSnapshotPresence
>();
const MAX_SNAPSHOT_PRESENCE_CACHE_ENTRIES = 50;

const getCachedSnapshotPresence = (
  walletIdsKey: string,
): CachedSnapshotPresence | undefined => {
  const cached = snapshotPresenceByWalletIdsKey.get(walletIdsKey);
  if (!cached) {
    return undefined;
  }

  snapshotPresenceByWalletIdsKey.delete(walletIdsKey);
  snapshotPresenceByWalletIdsKey.set(walletIdsKey, cached);
  return cached;
};

const cacheSnapshotPresence = (
  walletIdsKey: string,
  presence: CachedSnapshotPresence,
): void => {
  snapshotPresenceByWalletIdsKey.delete(walletIdsKey);
  snapshotPresenceByWalletIdsKey.set(walletIdsKey, presence);

  while (
    snapshotPresenceByWalletIdsKey.size > MAX_SNAPSHOT_PRESENCE_CACHE_ENTRIES
  ) {
    const oldestKey = snapshotPresenceByWalletIdsKey.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    snapshotPresenceByWalletIdsKey.delete(oldestKey);
  }
};

function snapshotIndexHasRows(
  index: SnapshotIndexV2 | null | undefined,
): boolean {
  return (
    Array.isArray(index?.chunks) &&
    index.chunks.some(chunk => Number(chunk?.rows) > 0)
  );
}

function getSortedUniqueWalletIds(wallets: Wallet[]): string[] {
  return Array.from(
    new Set(
      (Array.isArray(wallets) ? wallets : [])
        .map(wallet => String(wallet?.id || '').trim())
        .filter(Boolean),
    ),
  ).sort();
}

export default function usePortfolioWalletSnapshotPresence(args: {
  wallets: Wallet[];
  enabled?: boolean;
}): PortfolioWalletSnapshotPresenceState {
  const enabled = args.enabled !== false;
  const committedPortfolioRevisionToken = useAppSelector(({PORTFOLIO}) => {
    return enabled
      ? buildCommittedPortfolioRevisionToken({
          lastPopulatedAt: PORTFOLIO.lastPopulatedAt,
        })
      : '';
  });

  const walletIds = getSortedUniqueWalletIds(args.wallets);
  const walletIdsKey = walletIds.join('|');
  const cachedSnapshotPresence = walletIdsKey
    ? getCachedSnapshotPresence(walletIdsKey)
    : undefined;

  const [state, setState] = useState<PortfolioWalletSnapshotPresenceState>(
    getCachedSnapshotPresenceState(cachedSnapshotPresence, false),
  );

  useEffect(() => {
    if (!enabled) {
      setState(getEmptySnapshotPresenceState());
      return;
    }

    const requestedWalletIds = walletIdsKey ? walletIdsKey.split('|') : [];

    if (!requestedWalletIds.length) {
      setState(getEmptySnapshotPresenceState());
      return;
    }

    let cancelled = false;
    const cachedPresenceForRequest = getCachedSnapshotPresence(walletIdsKey);
    setState(getCachedSnapshotPresenceState(cachedPresenceForRequest, true));

    Promise.all(
      requestedWalletIds.map(async walletId => {
        const index = await getPortfolioRuntimeClient().getSnapshotIndex({
          walletId,
        });
        return snapshotIndexHasRows(index);
      }),
    )
      .then(results => {
        if (cancelled) {
          return;
        }

        const hasAnySnapshots = results.some(Boolean);
        const hasAllSnapshots = results.every(Boolean);
        const hasSnapshotsByWalletId = requestedWalletIds.reduce<
          Record<string, boolean>
        >((presenceByWalletId, walletId, index) => {
          presenceByWalletId[walletId] = !!results[index];
          return presenceByWalletId;
        }, {});
        cacheSnapshotPresence(walletIdsKey, {
          hasAnySnapshots,
          hasAllSnapshots,
          hasSnapshotsByWalletId,
        });
        setState({
          hasAnySnapshots,
          hasAllSnapshots,
          hasSnapshotsByWalletId,
          loading: false,
          checked: true,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setState(
          getCachedSnapshotPresenceState(cachedPresenceForRequest, false),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [committedPortfolioRevisionToken, enabled, walletIdsKey]);

  return state;
}

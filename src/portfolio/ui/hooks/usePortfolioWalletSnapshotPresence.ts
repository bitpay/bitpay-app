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
  const committedPortfolioRevisionToken = useAppSelector(({PORTFOLIO}) => {
    return buildCommittedPortfolioRevisionToken({
      lastPopulatedAt: PORTFOLIO.lastPopulatedAt,
    });
  });

  const walletIds = getSortedUniqueWalletIds(args.wallets);
  const walletIdsKey = walletIds.join('|');
  const cachedSnapshotPresence = walletIdsKey
    ? snapshotPresenceByWalletIdsKey.get(walletIdsKey)
    : undefined;

  const [state, setState] = useState<PortfolioWalletSnapshotPresenceState>(
    getCachedSnapshotPresenceState(cachedSnapshotPresence, false),
  );

  useEffect(() => {
    if (args.enabled === false) {
      setState(getEmptySnapshotPresenceState());
      return;
    }

    const requestedWalletIds = walletIdsKey ? walletIdsKey.split('|') : [];

    if (!requestedWalletIds.length) {
      setState(getEmptySnapshotPresenceState());
      return;
    }

    let cancelled = false;
    const cachedPresenceForRequest =
      snapshotPresenceByWalletIdsKey.get(walletIdsKey);
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
        snapshotPresenceByWalletIdsKey.set(walletIdsKey, {
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
  }, [args.enabled, committedPortfolioRevisionToken, walletIdsKey]);

  return state;
}

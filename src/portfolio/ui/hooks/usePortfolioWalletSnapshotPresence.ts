import {useEffect, useMemo, useState} from 'react';
import type {SnapshotIndexV2} from '../../core/pnl/snapshotStore';
import {getPortfolioRuntimeClient} from '../../runtime/portfolioRuntime';
import {buildCommittedPortfolioRevisionToken} from '../common';
import type {Wallet} from '../../../store/wallet/wallet.models';
import {useAppSelector} from '../../../utils/hooks';

type PortfolioWalletSnapshotPresenceState = {
  hasAnySnapshots: boolean;
  hasAllSnapshots: boolean;
  loading: boolean;
  checked: boolean;
};

type CachedSnapshotPresence = {
  hasAnySnapshots: boolean;
  hasAllSnapshots: boolean;
};

const snapshotPresenceByWalletIdsKey = new Map<
  string,
  CachedSnapshotPresence
>();

function snapshotIndexHasRows(
  index: SnapshotIndexV2 | null | undefined,
): boolean {
  if (!Array.isArray(index?.chunks) || !index.chunks.length) {
    return false;
  }

  return index.chunks.some(chunk => Number(chunk?.rows) > 0);
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

  const walletIds = useMemo(() => {
    return getSortedUniqueWalletIds(args.wallets);
  }, [args.wallets]);
  const walletIdsKey = useMemo(() => walletIds.join('|'), [walletIds]);
  const cachedSnapshotPresence = useMemo(() => {
    return walletIdsKey
      ? snapshotPresenceByWalletIdsKey.get(walletIdsKey)
      : undefined;
  }, [walletIdsKey]);

  const [state, setState] = useState<PortfolioWalletSnapshotPresenceState>({
    hasAnySnapshots: cachedSnapshotPresence?.hasAnySnapshots ?? true,
    hasAllSnapshots: cachedSnapshotPresence?.hasAllSnapshots ?? true,
    loading: false,
    checked: !!cachedSnapshotPresence,
  });

  useEffect(() => {
    if (args.enabled === false) {
      setState({
        hasAnySnapshots: false,
        hasAllSnapshots: false,
        loading: false,
        checked: true,
      });
      return;
    }

    const requestedWalletIds = walletIdsKey ? walletIdsKey.split('|') : [];

    if (!requestedWalletIds.length) {
      setState({
        hasAnySnapshots: false,
        hasAllSnapshots: false,
        loading: false,
        checked: true,
      });
      return;
    }

    let cancelled = false;
    const cachedPresenceForRequest =
      snapshotPresenceByWalletIdsKey.get(walletIdsKey);
    setState({
      hasAnySnapshots: cachedPresenceForRequest?.hasAnySnapshots ?? true,
      hasAllSnapshots: cachedPresenceForRequest?.hasAllSnapshots ?? true,
      loading: true,
      checked: !!cachedPresenceForRequest,
    });

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
        snapshotPresenceByWalletIdsKey.set(walletIdsKey, {
          hasAnySnapshots,
          hasAllSnapshots,
        });
        setState({
          hasAnySnapshots,
          hasAllSnapshots,
          loading: false,
          checked: true,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setState({
          hasAnySnapshots: cachedPresenceForRequest?.hasAnySnapshots ?? true,
          hasAllSnapshots: cachedPresenceForRequest?.hasAllSnapshots ?? true,
          loading: false,
          checked: !!cachedPresenceForRequest,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [args.enabled, committedPortfolioRevisionToken, walletIdsKey]);

  return state;
}

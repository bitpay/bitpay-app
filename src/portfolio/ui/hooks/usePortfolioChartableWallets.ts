import {useMemo} from 'react';
import type {Wallet} from '../../../store/wallet/wallet.models';
import {useAppSelector} from '../../../utils/hooks';

type WalletMarkerMap = {[walletId: string]: unknown} | undefined;
const EMPTY_DISABLED_WALLET_MARKERS: WalletMarkerMap = {};

const addMarkedWalletIds = (
  out: Set<string>,
  markersByWalletId: WalletMarkerMap,
) => {
  Object.entries(markersByWalletId || {}).forEach(([walletId, marker]) => {
    const normalizedWalletId = String(walletId || '').trim();
    if (normalizedWalletId && marker) {
      out.add(normalizedWalletId);
    }
  });
};

/**
 * The wallets the portfolio charts can include: those without an
 * invalid-decimals marker or a quarantine. Shared by the balance chart and
 * the per-key change so both describe the same set of wallets.
 */
export const filterPortfolioChartableWallets = <T extends Pick<Wallet, 'id'>>(
  wallets: T[],
  invalidDecimalsByWalletId: WalletMarkerMap,
  quarantinesByWalletId: WalletMarkerMap,
): T[] => {
  const quarantinedWalletIds = new Set<string>();
  addMarkedWalletIds(quarantinedWalletIds, invalidDecimalsByWalletId);
  addMarkedWalletIds(quarantinedWalletIds, quarantinesByWalletId);
  if (!quarantinedWalletIds.size) {
    return wallets;
  }

  return (wallets || []).filter(wallet => {
    const walletId = String(wallet?.id || '').trim();
    return !walletId || !quarantinedWalletIds.has(walletId);
  });
};

export default function usePortfolioChartableWallets(args: {
  enabled?: boolean;
  wallets: Wallet[];
}): Wallet[] {
  const enabled = args.enabled !== false;
  const invalidDecimalsByWalletId = useAppSelector(({PORTFOLIO}) =>
    enabled
      ? PORTFOLIO.invalidDecimalsByWalletId
      : EMPTY_DISABLED_WALLET_MARKERS,
  );
  const quarantinesByWalletId = useAppSelector(({PORTFOLIO}) =>
    enabled ? PORTFOLIO.quarantinesByWalletId : EMPTY_DISABLED_WALLET_MARKERS,
  );

  return useMemo(() => {
    if (!enabled) {
      return [];
    }

    return filterPortfolioChartableWallets(
      args.wallets,
      invalidDecimalsByWalletId,
      quarantinesByWalletId,
    );
  }, [args.wallets, enabled, invalidDecimalsByWalletId, quarantinesByWalletId]);
}

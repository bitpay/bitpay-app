import {useMemo} from 'react';
import type {Wallet} from '../../../store/wallet/wallet.models';
import {useAppSelector} from '../../../utils/hooks';

type WalletMarkerMap = {[walletId: string]: unknown} | undefined;

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

export default function usePortfolioChartableWallets(args: {
  enabled?: boolean;
  wallets: Wallet[];
}): Wallet[] {
  const enabled = args.enabled !== false;
  const invalidDecimalsByWalletId = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.invalidDecimalsByWalletId,
  );
  const quarantinesByWalletId = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.quarantinesByWalletId,
  );

  return useMemo(() => {
    if (!enabled) {
      return [];
    }

    const quarantinedWalletIds = new Set<string>();
    addMarkedWalletIds(quarantinedWalletIds, invalidDecimalsByWalletId);
    addMarkedWalletIds(quarantinedWalletIds, quarantinesByWalletId);
    if (!quarantinedWalletIds.size) {
      return args.wallets;
    }

    return (args.wallets || []).filter(wallet => {
      const walletId = String(wallet?.id || '').trim();
      return !walletId || !quarantinedWalletIds.has(walletId);
    });
  }, [args.wallets, enabled, invalidDecimalsByWalletId, quarantinesByWalletId]);
}

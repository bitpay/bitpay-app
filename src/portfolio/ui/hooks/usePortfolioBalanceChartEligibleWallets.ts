import {useMemo} from 'react';
import type {Wallet} from '../../../store/wallet/wallet.models';
import {useAppDispatch} from '../../../utils/hooks';
import {mapWalletsToStoredWallets} from '../common';
import usePortfolioChartableWallets from './usePortfolioChartableWallets';

/**
 * Resolves the exact wallet set used by the balance-chart runtime.
 *
 * `usePortfolioChartableWallets` removes quarantined wallets first. The
 * runtime mapping then applies credential, network and unit-decimal guards.
 * Cache lookups must use this final set or they may target a different scope
 * from the chart query.
 */
export default function usePortfolioBalanceChartEligibleWallets(args: {
  enabled?: boolean;
  wallets: Wallet[];
}): Wallet[] {
  const enabled = args.enabled !== false;
  const dispatch = useAppDispatch();
  const chartableWallets = usePortfolioChartableWallets({
    wallets: args.wallets,
    enabled,
  });

  return useMemo(() => {
    if (!enabled || !chartableWallets.length) {
      return [];
    }

    return mapWalletsToStoredWallets({
      dispatch,
      wallets: chartableWallets,
    }).eligibleWallets;
  }, [chartableWallets, dispatch, enabled]);
}

import {useMemo} from 'react';
import {selectHasCompletedFullPortfolioPopulate} from '../../../store/portfolio/portfolio.selectors';
import type {Wallet} from '../../../store/wallet/wallet.models';
import {useAppSelector} from '../../../utils/hooks';
import {
  hasCompletedPopulateForWallets,
  walletsHaveNonZeroLiveBalance,
} from '../../../utils/portfolio/assets';
import usePortfolioChartableWallets from './usePortfolioChartableWallets';

export type PortfolioScopeChartReadiness = {
  canRenderBalanceChart: boolean;
  chartableWallets: Wallet[];
  hasAnyWalletBalance: boolean;
  hasCompletedScopePopulate: boolean;
};

export default function usePortfolioScopeChartReadiness(args: {
  enabled?: boolean;
  wallets: Wallet[];
}): PortfolioScopeChartReadiness {
  const enabled = args.enabled !== false;
  const populateStatus = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.populateStatus,
  );
  const hasCompletedFullPortfolioPopulate = useAppSelector(
    selectHasCompletedFullPortfolioPopulate,
  );
  const chartableWallets = usePortfolioChartableWallets({
    wallets: args.wallets,
    enabled,
  });
  const hasAnyWalletBalance = useMemo(
    () => walletsHaveNonZeroLiveBalance(chartableWallets),
    [chartableWallets],
  );
  const hasCompletedScopePopulate = useMemo(() => {
    if (hasCompletedFullPortfolioPopulate) {
      return true;
    }

    return hasCompletedPopulateForWallets({
      populateStatus,
      wallets: chartableWallets,
      requireAllWalletsInScope: true,
    });
  }, [chartableWallets, hasCompletedFullPortfolioPopulate, populateStatus]);

  return {
    canRenderBalanceChart:
      enabled && hasAnyWalletBalance && hasCompletedScopePopulate,
    chartableWallets,
    hasAnyWalletBalance,
    hasCompletedScopePopulate,
  };
}

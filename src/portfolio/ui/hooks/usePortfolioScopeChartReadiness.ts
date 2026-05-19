import type {Wallet} from '../../../store/wallet/wallet.models';
import usePortfolioBalanceChartReadiness from './usePortfolioBalanceChartReadiness';

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
  const readiness = usePortfolioBalanceChartReadiness(args);

  return {
    canRenderBalanceChart: readiness.canRenderBalanceChart,
    chartableWallets: readiness.chartableWallets,
    hasAnyWalletBalance: readiness.hasHistoricalChartData,
    hasCompletedScopePopulate: readiness.hasCompletedScopePopulate,
  };
}

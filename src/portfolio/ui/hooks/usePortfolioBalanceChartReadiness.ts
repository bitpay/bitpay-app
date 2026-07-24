import {shallowEqual} from 'react-redux';
import {selectHasCompletedFullPortfolioPopulate} from '../../../store/portfolio/portfolio.selectors';
import type {Wallet} from '../../../store/wallet/wallet.models';
import {useAppSelector} from '../../../utils/hooks';
import {
  hasCompletedPopulateForWallets,
  isPopulateLoadingForWallets,
  walletsHaveNonZeroLiveBalance,
} from '../../../utils/portfolio/assets';
import usePortfolioChartableWallets from './usePortfolioChartableWallets';
import usePortfolioWalletSnapshotPresence from './usePortfolioWalletSnapshotPresence';

export type PortfolioBalanceChartReadiness = {
  canRenderBalanceChart: boolean;
  chartableWallets: Wallet[];
  hasChartableWallets: boolean;
  hasCompletedScopePopulate: boolean;
  hasHistoricalChartData: boolean;
  isChartDataPending: boolean;
  isScopePopulateLoading: boolean;
  isSnapshotPresenceLoading: boolean;
  isBalanceChartDataReadyToQuery: boolean;
  shouldRenderZeroBalanceChart: boolean;
  shouldPreserveStaleBalanceChart: boolean;
  shouldMountBalanceChart: boolean;
  shouldShowChartLoader: boolean;
};

export default function usePortfolioBalanceChartReadiness(args: {
  enabled?: boolean;
  hideAllBalances?: boolean;
  renderZeroBalanceChartWhenNoSnapshots?: boolean;
  wallets: Wallet[];
}): PortfolioBalanceChartReadiness {
  const enabled = args.enabled !== false;
  const hasCompletedFullPortfolioPopulate = useAppSelector(state =>
    enabled ? selectHasCompletedFullPortfolioPopulate(state) : false,
  );
  const chartableWallets = usePortfolioChartableWallets({
    wallets: args.wallets,
    enabled,
  });
  const hasChartableWallets = chartableWallets.length > 0;
  const baseEnabled = enabled && !args.hideAllBalances && hasChartableWallets;

  const {hasCompletedScopePopulate, isScopePopulateLoading} = useAppSelector(
    ({PORTFOLIO}) => {
      if (!baseEnabled) {
        return {
          hasCompletedScopePopulate: false,
          isScopePopulateLoading: false,
        };
      }

      const populateStatus = PORTFOLIO.populateStatus;
      return {
        hasCompletedScopePopulate:
          hasCompletedFullPortfolioPopulate ||
          hasCompletedPopulateForWallets({
            populateStatus,
            wallets: chartableWallets,
            requireAllWalletsInScope: true,
          }),
        isScopePopulateLoading: isPopulateLoadingForWallets({
          populateStatus,
          wallets: chartableWallets,
        }),
      };
    },
    shallowEqual,
  );
  const canCheckSnapshotPresence = baseEnabled && hasCompletedScopePopulate;
  const snapshotPresence = usePortfolioWalletSnapshotPresence({
    wallets: chartableWallets,
    enabled: canCheckSnapshotPresence,
  });

  const isSnapshotPresenceLoading =
    canCheckSnapshotPresence &&
    (!snapshotPresence.checked || snapshotPresence.loading);
  const hasHistoricalChartData =
    canCheckSnapshotPresence &&
    snapshotPresence.checked &&
    snapshotPresence.hasAnySnapshots;
  const hasNonZeroLiveBalance =
    baseEnabled && walletsHaveNonZeroLiveBalance(chartableWallets);
  const isBalanceChartDataReadyToQuery =
    canCheckSnapshotPresence &&
    !isScopePopulateLoading &&
    !isSnapshotPresenceLoading;
  const shouldPreserveStaleBalanceChart =
    hasHistoricalChartData && isScopePopulateLoading;
  const shouldRenderZeroBalanceChart =
    isBalanceChartDataReadyToQuery &&
    args.renderZeroBalanceChartWhenNoSnapshots === true &&
    snapshotPresence.checked &&
    !snapshotPresence.hasAnySnapshots &&
    !hasNonZeroLiveBalance;
  const isChartDataPending =
    canCheckSnapshotPresence &&
    !isBalanceChartDataReadyToQuery &&
    !shouldPreserveStaleBalanceChart;
  const canRenderBalanceChart =
    (isBalanceChartDataReadyToQuery &&
      (hasHistoricalChartData || shouldRenderZeroBalanceChart)) ||
    shouldPreserveStaleBalanceChart;
  const shouldShowChartLoader =
    !canRenderBalanceChart && (isChartDataPending || isScopePopulateLoading);
  const shouldMountBalanceChart =
    canRenderBalanceChart || shouldShowChartLoader;

  return {
    canRenderBalanceChart,
    chartableWallets,
    hasChartableWallets,
    hasCompletedScopePopulate,
    hasHistoricalChartData,
    isBalanceChartDataReadyToQuery,
    isChartDataPending,
    isScopePopulateLoading,
    isSnapshotPresenceLoading,
    shouldRenderZeroBalanceChart,
    shouldPreserveStaleBalanceChart,
    shouldMountBalanceChart,
    shouldShowChartLoader,
  };
}

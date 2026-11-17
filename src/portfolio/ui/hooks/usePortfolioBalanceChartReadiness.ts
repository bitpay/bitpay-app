import {useMemo} from 'react';
import {shallowEqual} from 'react-redux';
import {selectHasCompletedFullPortfolioPopulate} from '../../../store/portfolio/portfolio.selectors';
import type {Wallet} from '../../../store/wallet/wallet.models';
import {useAppSelector} from '../../../utils/hooks';
import {
  getPopulateProgressForWallets,
  hasCompletedPopulateForWallets,
  isPopulateLoadingForWallets,
  walletsHaveNonZeroLiveBalance,
  type PortfolioPopulateProgress,
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
  /**
   * Wallet counts for the populate running over this chart's scope, or
   * undefined when none is running (or counts are unknown).
   */
  populateProgress?: PortfolioPopulateProgress;
  isSnapshotPresenceLoading: boolean;
  isBalanceChartDataReadyToQuery: boolean;
  shouldRenderZeroBalanceChart: boolean;
  shouldPreserveStaleBalanceChart: boolean;
  shouldMountBalanceChart: boolean;
  shouldShowChartLoader: boolean;
};

export default function usePortfolioBalanceChartReadiness(args: {
  enabled?: boolean;
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
  const baseEnabled = enabled && hasChartableWallets;

  const {
    hasCompletedScopePopulate,
    isScopePopulateLoading,
    populateCompleted,
    populateTotal,
  } = useAppSelector(({PORTFOLIO}) => {
    if (!baseEnabled) {
      return {
        hasCompletedScopePopulate: false,
        isScopePopulateLoading: false,
        populateCompleted: 0,
        populateTotal: 0,
      };
    }

    const populateStatus = PORTFOLIO.populateStatus;
    const scopePopulateLoading = isPopulateLoadingForWallets({
      populateStatus,
      wallets: chartableWallets,
    });
    // Only track counts while this scope is populating; otherwise the counts
    // stay at 0 so progress ticks elsewhere do not re-render this screen.
    const progress = scopePopulateLoading
      ? getPopulateProgressForWallets({
          populateStatus,
          wallets: chartableWallets,
        })
      : undefined;
    return {
      hasCompletedScopePopulate:
        hasCompletedFullPortfolioPopulate ||
        hasCompletedPopulateForWallets({
          populateStatus,
          wallets: chartableWallets,
          requireAllWalletsInScope: true,
        }),
      isScopePopulateLoading: scopePopulateLoading,
      populateCompleted: progress?.completed ?? 0,
      populateTotal: progress?.total ?? 0,
    };
  }, shallowEqual);
  const populateProgress = useMemo<PortfolioPopulateProgress | undefined>(
    () =>
      populateTotal > 0
        ? {completed: populateCompleted, total: populateTotal}
        : undefined,
    [populateCompleted, populateTotal],
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
    populateProgress,
    shouldRenderZeroBalanceChart,
    shouldPreserveStaleBalanceChart,
    shouldMountBalanceChart,
    shouldShowChartLoader,
  };
}

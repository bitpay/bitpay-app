import {useMemo} from 'react';
import {selectHasCompletedFullPortfolioPopulate} from '../../../store/portfolio/portfolio.selectors';
import type {Wallet} from '../../../store/wallet/wallet.models';
import {useAppSelector} from '../../../utils/hooks';
import {
  hasCompletedPopulateForWallets,
  isPopulateLoadingForWallets,
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
  shouldMountBalanceChart: boolean;
  shouldShowChartLoader: boolean;
};

export default function usePortfolioBalanceChartReadiness(args: {
  enabled?: boolean;
  hideAllBalances?: boolean;
  wallets: Wallet[];
}): PortfolioBalanceChartReadiness {
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
  const hasChartableWallets = chartableWallets.length > 0;
  const baseEnabled = enabled && !args.hideAllBalances && hasChartableWallets;

  const hasCompletedScopePopulate = useMemo(() => {
    if (!baseEnabled) {
      return false;
    }

    if (hasCompletedFullPortfolioPopulate) {
      return true;
    }

    return hasCompletedPopulateForWallets({
      populateStatus,
      wallets: chartableWallets,
      requireAllWalletsInScope: true,
    });
  }, [
    baseEnabled,
    chartableWallets,
    hasCompletedFullPortfolioPopulate,
    populateStatus,
  ]);
  const canCheckSnapshotPresence = baseEnabled && hasCompletedScopePopulate;
  const snapshotPresence = usePortfolioWalletSnapshotPresence({
    wallets: chartableWallets,
    enabled: canCheckSnapshotPresence,
  });

  const isScopePopulateLoading = useMemo(() => {
    return (
      baseEnabled &&
      isPopulateLoadingForWallets({
        populateStatus,
        wallets: chartableWallets,
      })
    );
  }, [baseEnabled, chartableWallets, populateStatus]);

  const isSnapshotPresenceLoading =
    canCheckSnapshotPresence &&
    (!snapshotPresence.checked || snapshotPresence.loading);
  const hasHistoricalChartData =
    canCheckSnapshotPresence &&
    snapshotPresence.checked &&
    snapshotPresence.hasAnySnapshots;
  const isChartDataPending =
    canCheckSnapshotPresence &&
    (isSnapshotPresenceLoading || isScopePopulateLoading);
  const canRenderBalanceChart =
    canCheckSnapshotPresence && hasHistoricalChartData;
  const shouldShowChartLoader = !canRenderBalanceChart && isChartDataPending;
  const shouldMountBalanceChart =
    canRenderBalanceChart || shouldShowChartLoader;

  return {
    canRenderBalanceChart,
    chartableWallets,
    hasChartableWallets,
    hasCompletedScopePopulate,
    hasHistoricalChartData,
    isChartDataPending,
    isScopePopulateLoading,
    isSnapshotPresenceLoading,
    shouldMountBalanceChart,
    shouldShowChartLoader,
  };
}

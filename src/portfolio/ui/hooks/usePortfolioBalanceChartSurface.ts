import {useCallback, useEffect, useMemo, useState} from 'react';
import type {Wallet} from '../../../store/wallet/wallet.models';

export type PortfolioBalanceChartSurfaceChangeRowData = {
  percent: number;
  deltaFiatFormatted?: string;
  rangeLabel?: string;
};

export type PortfolioBalanceChartSurfaceAnalysisPoint = {
  timestamp?: number;
  totalFiatBalance?: number;
  totalPnlChange?: number;
  totalPnlPercent?: number;
  totalCryptoBalanceFormatted?: string;
};

export function usePortfolioBalanceChartSurface(args: {
  wallets: Wallet[];
  quoteCurrency: string;
  fallbackBalance?: number;
  fallbackCurrency?: string;
  enabled?: boolean;
  resetKey?: string;
}) {
  const enabled = args.enabled !== false;
  const [selectedBalance, setSelectedBalance] = useState<number | undefined>();
  const [displayedBalance, setDisplayedBalance] = useState<
    number | undefined
  >();
  const [displayedAnalysisPoint, setDisplayedAnalysisPoint] = useState<
    PortfolioBalanceChartSurfaceAnalysisPoint | undefined
  >();
  const [changeRowData, setChangeRowData] = useState<
    PortfolioBalanceChartSurfaceChangeRowData | undefined
  >();

  const walletIdsSignature = useMemo(() => {
    return (args.wallets || [])
      .map(wallet => String(wallet?.id || ''))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join('|');
  }, [args.wallets]);

  useEffect(() => {
    setSelectedBalance(undefined);
    setDisplayedBalance(undefined);
    setDisplayedAnalysisPoint(undefined);
    setChangeRowData(undefined);
  }, [args.quoteCurrency, args.resetKey, enabled, walletIdsSignature]);

  const onDisplayedAnalysisPointChange = useCallback(
    (point?: PortfolioBalanceChartSurfaceAnalysisPoint) => {
      setDisplayedAnalysisPoint(point);
      setDisplayedBalance(point?.totalFiatBalance);
    },
    [],
  );

  const chartDrivenBalance =
    enabled &&
    (typeof selectedBalance === 'number' ||
      typeof displayedBalance === 'number')
      ? selectedBalance ?? displayedBalance
      : undefined;
  const displayedTopBalance =
    typeof chartDrivenBalance === 'number'
      ? chartDrivenBalance
      : args.fallbackBalance;
  const displayedTopBalanceCurrency =
    typeof chartDrivenBalance === 'number'
      ? args.quoteCurrency
      : args.fallbackCurrency || args.quoteCurrency;
  const chartCallbacks = useMemo(
    () => ({
      onSelectedBalanceChange: setSelectedBalance,
      onDisplayedAnalysisPointChange,
      onChangeRowData: setChangeRowData,
    }),
    [onDisplayedAnalysisPointChange],
  );

  return useMemo(
    () => ({
      selectedBalance,
      displayedBalance,
      displayedAnalysisPoint,
      changeRowData,
      chartDrivenBalance,
      displayedTopBalance,
      displayedTopBalanceCurrency,
      chartCallbacks,
    }),
    [
      changeRowData,
      chartCallbacks,
      chartDrivenBalance,
      displayedAnalysisPoint,
      displayedBalance,
      displayedTopBalance,
      displayedTopBalanceCurrency,
      selectedBalance,
    ],
  );
}

export default usePortfolioBalanceChartSurface;

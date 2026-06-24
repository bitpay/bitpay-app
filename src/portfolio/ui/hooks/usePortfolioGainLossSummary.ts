import {useEffect, useMemo, useRef, useState} from 'react';
import {useIsFocused} from '@react-navigation/native';
import type {FiatRateInterval} from '../../../store/rate/rate.models';
import type {Wallet} from '../../../store/wallet/wallet.models';
import {HISTORIC_RATES_CACHE_DURATION} from '../../../constants/wallet';
import type {PortfolioGainLossSummary} from '../../../utils/portfolio/assets';
import {BALANCE_GAIN_LOSS_SUMMARY_SCOPE_IDENTITY_KEY} from '../../../utils/portfolio/chartCache';
import {runPortfolioChartQuery} from '../common';
import {usePortfolioBalanceChartScope} from './usePortfolioBalanceChartScope';
import usePortfolioHistoricalRateDepsCache from './usePortfolioHistoricalRateDepsCache';

function buildUnavailableSummaryPart(): PortfolioGainLossSummary['today'] {
  return {
    deltaFiat: 0,
    percentRatio: 0,
    available: false,
  };
}

function buildSummaryPart(args: {
  totalFiatBalance: number | undefined;
  totalPnlChange: number | undefined;
  totalPnlPercent: number | undefined;
  liveFiatTotal: number;
}): PortfolioGainLossSummary['today'] {
  const hasRuntimeData =
    (typeof args.totalFiatBalance === 'number' && args.totalFiatBalance > 0) ||
    !(args.liveFiatTotal > 0);

  if (!hasRuntimeData) {
    return buildUnavailableSummaryPart();
  }

  return {
    deltaFiat:
      typeof args.totalPnlChange === 'number' &&
      Number.isFinite(args.totalPnlChange)
        ? args.totalPnlChange
        : 0,
    percentRatio:
      typeof args.totalPnlPercent === 'number' &&
      Number.isFinite(args.totalPnlPercent)
        ? args.totalPnlPercent / 100
        : 0,
    available: true,
  };
}

function usePortfolioGainLossSummaryTimeframe(args: {
  asOfMs: number;
  chartDataRevisionSig: string;
  currentRatesByAssetId: Record<string, number>;
  currentRatesSignature: string;
  isFocused: boolean;
  liveFiatTotal: number;
  quoteCurrency: string;
  scopeId: string;
  storedWalletRequestSig: string;
  storedWallets: ReturnType<
    typeof usePortfolioBalanceChartScope
  >['storedWallets'];
  timeframe: FiatRateInterval;
}) {
  const {
    revision: historicalRateCacheRevision,
    shouldWaitForReady: shouldWaitForHistoricalRates,
  } = usePortfolioHistoricalRateDepsCache({
    wallets: args.storedWallets,
    quoteCurrency: args.quoteCurrency,
    timeframes: [args.timeframe],
    maxAgeMs: HISTORIC_RATES_CACHE_DURATION * 1000,
    enabled: !!args.quoteCurrency,
  });

  const inFlightRequestKeyRef = useRef<string | undefined>(undefined);
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [summaryPart, setSummaryPart] = useState<
    PortfolioGainLossSummary['today']
  >(() => buildUnavailableSummaryPart());

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!args.isFocused || !args.storedWallets.length) {
      inFlightRequestKeyRef.current = undefined;
      setLoading(false);
      setError(undefined);
      setSummaryPart(buildUnavailableSummaryPart());
      return;
    }

    if (shouldWaitForHistoricalRates) {
      setLoading(true);
      setError(undefined);
      return;
    }

    const requestKey = [
      args.timeframe,
      args.scopeId,
      args.chartDataRevisionSig,
      args.storedWalletRequestSig,
      args.currentRatesSignature,
      historicalRateCacheRevision,
    ].join('|');
    if (inFlightRequestKeyRef.current === requestKey) {
      return;
    }

    inFlightRequestKeyRef.current = requestKey;
    setLoading(true);
    setError(undefined);
    setSummaryPart(buildUnavailableSummaryPart());

    runPortfolioChartQuery({
      wallets: args.storedWallets,
      quoteCurrency: args.quoteCurrency,
      timeframe: args.timeframe,
      maxPoints: 2,
      currentRatesByAssetId: args.currentRatesByAssetId,
      asOfMs: args.asOfMs,
    })
      .then(chart => {
        if (
          !isMountedRef.current ||
          inFlightRequestKeyRef.current !== requestKey
        ) {
          return;
        }

        const lastPointIndex = Array.isArray(chart?.timestamps)
          ? chart.timestamps.length - 1
          : -1;
        setSummaryPart(
          lastPointIndex >= 0
            ? buildSummaryPart({
                totalFiatBalance: chart.totalFiatBalance?.[lastPointIndex],
                totalPnlChange: chart.totalPnlChange?.[lastPointIndex],
                totalPnlPercent: chart.totalPnlPercent?.[lastPointIndex],
                liveFiatTotal: args.liveFiatTotal,
              })
            : buildUnavailableSummaryPart(),
        );
        setError(undefined);
      })
      .catch(err => {
        if (
          !isMountedRef.current ||
          inFlightRequestKeyRef.current !== requestKey
        ) {
          return;
        }

        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (
          !isMountedRef.current ||
          inFlightRequestKeyRef.current !== requestKey
        ) {
          return;
        }

        inFlightRequestKeyRef.current = undefined;
        setLoading(false);
      });
  }, [
    args.asOfMs,
    args.chartDataRevisionSig,
    args.currentRatesByAssetId,
    args.currentRatesSignature,
    args.isFocused,
    args.liveFiatTotal,
    args.quoteCurrency,
    args.scopeId,
    args.storedWalletRequestSig,
    args.storedWallets,
    args.timeframe,
    historicalRateCacheRevision,
    shouldWaitForHistoricalRates,
  ]);

  return {
    error,
    loading,
    summaryPart,
  };
}

export function usePortfolioGainLossSummary(args: {
  wallets: Wallet[];
  liveFiatTotal: number;
}) {
  const isFocused = useIsFocused();
  const {
    asOfMs,
    chartDataRevisionSig,
    currentRatesByAssetId,
    currentRatesSignature,
    quoteCurrency,
    scopeId,
    storedWalletRequestSig,
    storedWallets,
  } = usePortfolioBalanceChartScope({
    wallets: args.wallets,
    balanceOffset: 0,
    scopeIdentityKey: BALANCE_GAIN_LOSS_SUMMARY_SCOPE_IDENTITY_KEY,
  });

  const today = usePortfolioGainLossSummaryTimeframe({
    asOfMs,
    chartDataRevisionSig,
    currentRatesByAssetId,
    currentRatesSignature,
    isFocused,
    liveFiatTotal: args.liveFiatTotal,
    quoteCurrency,
    scopeId,
    storedWalletRequestSig,
    storedWallets,
    timeframe: '1D',
  });
  const total = usePortfolioGainLossSummaryTimeframe({
    asOfMs,
    chartDataRevisionSig,
    currentRatesByAssetId,
    currentRatesSignature,
    isFocused,
    liveFiatTotal: args.liveFiatTotal,
    quoteCurrency,
    scopeId,
    storedWalletRequestSig,
    storedWallets,
    timeframe: 'ALL',
  });

  const summary: PortfolioGainLossSummary = useMemo(() => {
    return {
      quoteCurrency,
      today: today.summaryPart,
      total: total.summaryPart,
    };
  }, [quoteCurrency, today.summaryPart, total.summaryPart]);

  return {
    summary,
    loading: today.loading || total.loading,
    error: today.error || total.error,
  };
}

export default usePortfolioGainLossSummary;

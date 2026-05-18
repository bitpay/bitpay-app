import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {GraphPoint} from 'react-native-graph';
import type {FiatRateInterval} from '../../store/rate/rate.models';
import {FIAT_RATE_SERIES_TARGET_POINTS} from '../../store/rate/rate.models';
import {HISTORIC_RATES_CACHE_DURATION} from '../../constants/wallet';
import type {HydratedBalanceChartSeries} from '../../utils/portfolio/chartCache';
import {
  buildBalanceHistoryChartChangeRowData,
  getDisplayedBalanceHistoryAnalysisPoint,
  getSelectedBalanceHistoryValue,
  type ChangeRowData,
} from './balanceHistoryChartSelection';
import {
  formatRangeOrSelectedPointLabel,
  getRangeLabelForFiatTimeframe,
} from './fiatTimeframes';
import {runPortfolioBalanceChartViewModelQuery} from '../../portfolio/ui/common';
import type {PortfolioBalanceChartScope} from '../../portfolio/ui/hooks/usePortfolioBalanceChartScope';
import usePortfolioHistoricalRateDepsCache from '../../portfolio/ui/hooks/usePortfolioHistoricalRateDepsCache';
import haptic from '../haptic-feedback/haptic';
import {buildHydratedSeriesFromBalanceChartViewModel} from '../../utils/portfolio/balanceChartData';
import type {PnlAnalysisPoint} from '../../portfolio/core/pnl/analysisStreaming';
import {scheduleAfterInteractionsAndFrames} from '../../utils/scheduleAfterInteractionsAndFrames';

type VisibleSeriesState = {
  series: HydratedBalanceChartSeries;
  timeframe: FiatRateInterval;
  queryRevisionKey: string;
  quoteCurrency: string;
  scopeId: string;
  seriesSignature: string;
};

type VisibleSeriesCandidate = Omit<VisibleSeriesState, 'seriesSignature'>;

type BalanceChartCallbackAnalysisPoint = {
  timestamp?: number;
  totalFiatBalance?: number;
  totalPnlChange?: number;
  totalPnlPercent?: number;
  totalCryptoBalanceFormatted?: string;
};

type BalanceChartCallbackChangeRowData = {
  percent: number;
  deltaFiatFormatted?: string;
  rangeLabel?: string;
};

export type UseBalanceChartDisplayModelArgs = {
  scope: PortfolioBalanceChartScope;
  initialSelectedTimeframe: FiatRateInterval;
  balanceOffset: number;
  showLoaderWhenNoSnapshots: boolean;
  t: (key: string) => string;
  onSelectedBalanceChange?: (balance?: number) => void;
  onChangeRowData?: (data?: BalanceChartCallbackChangeRowData) => void;
  onDisplayedAnalysisPointChange?: (
    point?: BalanceChartCallbackAnalysisPoint,
  ) => void;
  onSelectedTimeframeChange?: (timeframe: FiatRateInterval) => void;
  onSelectionActiveChange?: (active: boolean) => void;
};

export type BalanceChartDisplayModel = {
  selectedTimeframe: FiatRateInterval;
  onTimeframeSelect: (timeframe: FiatRateInterval) => void;
  visibleSeries?: HydratedBalanceChartSeries;
  visibleTimeframe: FiatRateInterval;
  visibleQuoteCurrency: string;
  isLoading: boolean;
  pendingOverlayVisible: boolean;
  shouldShowLoader: boolean;
  error?: Error;
  selectedPoint?: GraphPoint;
  displayedAnalysisPoint?: PnlAnalysisPoint;
  displayedChangeRowData?: ChangeRowData;
  hasRenderableSeries: boolean;
  hasAnyWallets: boolean;
  queryRevisionKey: string;
  onGestureStarted: () => void;
  onGestureEnded: () => void;
  onPointSelected: (point: GraphPoint) => void;
};

const PENDING_CHART_OVERLAY_DELAY_MS = 120;

const getFinitePointTimestamp = (point: GraphPoint | undefined): number => {
  const timestamp = point?.date?.getTime?.();
  return typeof timestamp === 'number' && Number.isFinite(timestamp)
    ? timestamp
    : 0;
};

const getFinitePointValue = (point: GraphPoint | undefined): number => {
  const value = point?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

export const getBalanceChartSeriesSignature = ({
  series,
  timeframe,
  quoteCurrency,
  queryRevisionKey,
  scopeId,
}: {
  series: HydratedBalanceChartSeries;
  timeframe: FiatRateInterval;
  quoteCurrency: string;
  queryRevisionKey: string;
  scopeId: string;
}): string => {
  const points = series.graphPoints || [];
  const firstPoint = points[0];
  const lastPoint = points.length ? points[points.length - 1] : undefined;

  return [
    scopeId,
    timeframe,
    quoteCurrency,
    queryRevisionKey,
    String(points.length),
    String(getFinitePointTimestamp(firstPoint)),
    String(getFinitePointValue(firstPoint)),
    String(getFinitePointTimestamp(lastPoint)),
    String(getFinitePointValue(lastPoint)),
  ].join('|');
};

export const areGraphPointsEquivalent = (
  left?: GraphPoint[],
  right?: GraphPoint[],
): boolean => {
  if (left === right) {
    return true;
  }
  if (!left || !right || left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index++) {
    if (
      left[index]?.date?.getTime?.() !== right[index]?.date?.getTime?.() ||
      left[index]?.value !== right[index]?.value
    ) {
      return false;
    }
  }

  return true;
};

const preserveGraphPointsWhenEquivalent = (
  previous: HydratedBalanceChartSeries | undefined,
  next: HydratedBalanceChartSeries,
): HydratedBalanceChartSeries => {
  if (
    !previous ||
    !areGraphPointsEquivalent(previous.graphPoints, next.graphPoints)
  ) {
    return next;
  }

  return {
    ...next,
    graphPoints: previous.graphPoints,
    minPoint: previous.minPoint,
    maxPoint: previous.maxPoint,
  };
};

export function useBalanceChartDisplayModel({
  scope,
  initialSelectedTimeframe,
  balanceOffset,
  showLoaderWhenNoSnapshots,
  t,
  onSelectedBalanceChange,
  onChangeRowData,
  onDisplayedAnalysisPointChange,
  onSelectedTimeframeChange,
  onSelectionActiveChange,
}: UseBalanceChartDisplayModelArgs): BalanceChartDisplayModel {
  const {
    asOfMs,
    chartDataRevisionSig,
    currentRatesByAssetId,
    currentRatesSignature,
    currentSpotRatesSignature,
    quoteCurrency: committedQueryQuoteCurrency,
    scopeId,
    sortedWalletIds,
    storedWalletRequestSig,
    storedWallets,
  } = scope;
  const hasAnyWallets = useMemo(
    () =>
      storedWallets.some(wallet => {
        const walletId = String(
          wallet?.walletId || wallet?.summary?.walletId || '',
        );
        return !!walletId && !!wallet;
      }),
    [storedWallets],
  );

  const [selectedTimeframe, setSelectedTimeframe] = useState<FiatRateInterval>(
    initialSelectedTimeframe,
  );
  const [visibleState, setVisibleState] = useState<
    VisibleSeriesState | undefined
  >();
  const [selectedPoint, setSelectedPoint] = useState<GraphPoint | undefined>();
  const [loading, setLoading] = useState(hasAnyWallets);
  const [pendingOverlayVisible, setPendingOverlayVisible] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const activeRequestIdRef = useRef(0);
  const gestureStartedRef = useRef(false);
  const lastHapticPointTsRef = useRef<number | undefined>(undefined);
  const pendingSelectedTimestampRef = useRef<number | undefined>(undefined);
  const shouldPreserveSelectionOnQueryRef = useRef(true);
  const selectedPointRef = useRef<GraphPoint | undefined>(undefined);
  const visibleStateRef = useRef<VisibleSeriesState | undefined>(undefined);
  const onSelectedBalanceChangeRef = useRef(onSelectedBalanceChange);
  const onSelectionActiveChangeRef = useRef(onSelectionActiveChange);
  const animateNextSeriesCommitRef = useRef(false);

  useEffect(() => {
    onSelectedBalanceChangeRef.current = onSelectedBalanceChange;
  }, [onSelectedBalanceChange]);

  useEffect(() => {
    onSelectionActiveChangeRef.current = onSelectionActiveChange;
  }, [onSelectionActiveChange]);

  useEffect(() => {
    selectedPointRef.current = selectedPoint;
  }, [selectedPoint]);

  useEffect(() => {
    visibleStateRef.current = visibleState;
  }, [visibleState]);

  useEffect(() => {
    setSelectedTimeframe(initialSelectedTimeframe);
  }, [initialSelectedTimeframe]);

  useEffect(() => {
    setVisibleState(prev => {
      if (
        !prev ||
        (prev.scopeId === scopeId &&
          prev.quoteCurrency === committedQueryQuoteCurrency)
      ) {
        return prev;
      }

      return undefined;
    });
    pendingSelectedTimestampRef.current = undefined;
    gestureStartedRef.current = false;
    lastHapticPointTsRef.current = undefined;
    setSelectedPoint(undefined);
    onSelectedBalanceChangeRef.current?.(undefined);
  }, [committedQueryQuoteCurrency, scopeId]);

  const commitVisibleSeries = useCallback(
    (candidate: VisibleSeriesCandidate) => {
      setVisibleState(prev => {
        const candidateSignature = getBalanceChartSeriesSignature(candidate);
        const sameVisibleOwner =
          prev?.scopeId === candidate.scopeId &&
          prev?.quoteCurrency === candidate.quoteCurrency &&
          prev?.timeframe === candidate.timeframe;
        const graphPointsEquivalent =
          sameVisibleOwner &&
          areGraphPointsEquivalent(
            prev?.series.graphPoints,
            candidate.series.graphPoints,
          );

        if (
          prev &&
          sameVisibleOwner &&
          graphPointsEquivalent &&
          prev.seriesSignature === candidateSignature
        ) {
          animateNextSeriesCommitRef.current = false;
          return prev;
        }

        const animated =
          animateNextSeriesCommitRef.current &&
          prev?.timeframe !== candidate.timeframe;
        animateNextSeriesCommitRef.current = false;
        const series = animated
          ? candidate.series
          : preserveGraphPointsWhenEquivalent(prev?.series, candidate.series);

        return {
          ...candidate,
          series,
          seriesSignature: getBalanceChartSeriesSignature({
            ...candidate,
            series,
          }),
        };
      });
    },
    [],
  );

  const {
    revision: historicalRateCacheRevision,
    shouldWaitForReady: shouldWaitForHistoricalRates,
  } = usePortfolioHistoricalRateDepsCache({
    wallets: storedWallets,
    quoteCurrency: committedQueryQuoteCurrency,
    timeframes: [selectedTimeframe],
    maxAgeMs: HISTORIC_RATES_CACHE_DURATION * 1000,
    enabled: !!committedQueryQuoteCurrency,
  });

  const queryRevisionKey = useMemo(() => {
    return [
      scopeId,
      selectedTimeframe,
      chartDataRevisionSig,
      storedWalletRequestSig,
      currentRatesSignature,
      currentSpotRatesSignature,
      historicalRateCacheRevision,
    ].join('|');
  }, [
    chartDataRevisionSig,
    currentRatesSignature,
    currentSpotRatesSignature,
    historicalRateCacheRevision,
    scopeId,
    selectedTimeframe,
    storedWalletRequestSig,
  ]);

  const chartQueryArgsRef = useRef({
    wallets: storedWallets,
    quoteCurrency: committedQueryQuoteCurrency,
    timeframe: selectedTimeframe,
    maxPoints: FIAT_RATE_SERIES_TARGET_POINTS,
    currentRatesByAssetId,
    dataRevisionSig: chartDataRevisionSig,
    walletIds: sortedWalletIds,
    balanceOffset,
    asOfMs,
    summaryCacheRevisionSig: [
      currentSpotRatesSignature,
      historicalRateCacheRevision,
    ].join('|'),
  });
  chartQueryArgsRef.current = {
    wallets: storedWallets,
    quoteCurrency: committedQueryQuoteCurrency,
    timeframe: selectedTimeframe,
    maxPoints: FIAT_RATE_SERIES_TARGET_POINTS,
    currentRatesByAssetId,
    dataRevisionSig: chartDataRevisionSig,
    walletIds: sortedWalletIds,
    balanceOffset,
    asOfMs,
    summaryCacheRevisionSig: [
      currentSpotRatesSignature,
      historicalRateCacheRevision,
    ].join('|'),
  };

  useEffect(() => {
    if (shouldWaitForHistoricalRates) {
      setLoading(true);
      setError(undefined);
      return;
    }

    const chartQueryArgs = chartQueryArgsRef.current;

    if (!chartQueryArgs.wallets.length) {
      setLoading(false);
      setError(undefined);
      setVisibleState(undefined);
      return;
    }

    let cancelled = false;
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    setLoading(true);
    setError(undefined);

    const visibleOwner = visibleStateRef.current;
    const shouldDeferQueryStart =
      !visibleOwner ||
      visibleOwner.scopeId !== scopeId ||
      visibleOwner.quoteCurrency !== committedQueryQuoteCurrency;

    const runChartQuery = () => {
      if (cancelled || activeRequestIdRef.current !== requestId) {
        return;
      }

      runPortfolioBalanceChartViewModelQuery(chartQueryArgs)
        .then(viewModel => {
          if (cancelled || activeRequestIdRef.current !== requestId) {
            return;
          }

          const hydratedSeries =
            buildHydratedSeriesFromBalanceChartViewModel(viewModel);

          if (!hydratedSeries) {
            setLoading(false);
            return;
          }

          commitVisibleSeries({
            series: hydratedSeries,
            timeframe: chartQueryArgs.timeframe,
            queryRevisionKey,
            quoteCurrency: chartQueryArgs.quoteCurrency,
            scopeId,
          });
          setLoading(false);
        })
        .catch(err => {
          if (cancelled || activeRequestIdRef.current !== requestId) {
            return;
          }

          setLoading(false);
          setError(err instanceof Error ? err : new Error(String(err)));
        });
    };

    const scheduledQuery = shouldDeferQueryStart
      ? scheduleAfterInteractionsAndFrames({
          callback: runChartQuery,
          onError: err => {
            if (cancelled || activeRequestIdRef.current !== requestId) {
              return;
            }

            setLoading(false);
            setError(err instanceof Error ? err : new Error(String(err)));
          },
        })
      : undefined;

    if (!scheduledQuery) {
      runChartQuery();
    }

    return () => {
      cancelled = true;
      scheduledQuery?.cancel();
    };
  }, [
    commitVisibleSeries,
    chartDataRevisionSig,
    committedQueryQuoteCurrency,
    queryRevisionKey,
    shouldWaitForHistoricalRates,
    scopeId,
    sortedWalletIds,
  ]);

  useEffect(() => {
    shouldPreserveSelectionOnQueryRef.current = false;
    gestureStartedRef.current = false;
    lastHapticPointTsRef.current = undefined;
    pendingSelectedTimestampRef.current = undefined;
    setSelectedPoint(undefined);
    onSelectedBalanceChangeRef.current?.(undefined);
  }, [selectedTimeframe]);

  useEffect(() => {
    const activeSelectedPoint = selectedPointRef.current;
    const visibleOwner = visibleStateRef.current;
    const canPreserveSelection =
      shouldPreserveSelectionOnQueryRef.current &&
      activeSelectedPoint &&
      visibleOwner?.scopeId === scopeId &&
      visibleOwner?.quoteCurrency === committedQueryQuoteCurrency;

    if (canPreserveSelection) {
      pendingSelectedTimestampRef.current = activeSelectedPoint.date.getTime();
    }

    shouldPreserveSelectionOnQueryRef.current = true;
    gestureStartedRef.current = false;
    lastHapticPointTsRef.current = undefined;
    setSelectedPoint(undefined);
    onSelectedBalanceChangeRef.current?.(undefined);
  }, [committedQueryQuoteCurrency, queryRevisionKey, scopeId]);

  useEffect(() => {
    onSelectionActiveChangeRef.current?.(!!selectedPoint);
  }, [selectedPoint]);

  const activeVisibleState =
    visibleState?.scopeId === scopeId &&
    visibleState?.quoteCurrency === committedQueryQuoteCurrency
      ? visibleState
      : undefined;
  const visibleSeries = activeVisibleState?.series;
  const visibleTimeframe = activeVisibleState?.timeframe ?? selectedTimeframe;
  const visibleQuoteCurrency =
    activeVisibleState?.quoteCurrency ?? committedQueryQuoteCurrency;

  useEffect(() => {
    const pendingTimestamp = pendingSelectedTimestampRef.current;
    if (
      typeof pendingTimestamp !== 'number' ||
      !Number.isFinite(pendingTimestamp)
    ) {
      return;
    }
    if (!visibleSeries?.graphPoints?.length) {
      return;
    }
    if (!visibleSeries.pointByTimestamp.has(pendingTimestamp)) {
      pendingSelectedTimestampRef.current = undefined;
      return;
    }

    const matchingPoint = visibleSeries.graphPoints.find(
      point => point.date.getTime() === pendingTimestamp,
    );
    if (!matchingPoint) {
      pendingSelectedTimestampRef.current = undefined;
      return;
    }

    pendingSelectedTimestampRef.current = undefined;
    setSelectedPoint(matchingPoint);
    onSelectedBalanceChangeRef.current?.(
      getSelectedBalanceHistoryValue({
        point: matchingPoint,
        activeSeries: visibleSeries,
        balanceOffset,
      }),
    );
  }, [balanceOffset, queryRevisionKey, visibleSeries]);

  const rangeLabel = useMemo(
    () => getRangeLabelForFiatTimeframe(t, visibleTimeframe),
    [visibleTimeframe, t],
  );

  const displayedRangeMs = useMemo(() => {
    const firstTimestamp = visibleSeries?.analysisPoints?.[0]?.timestamp;
    const lastTimestamp =
      visibleSeries?.analysisPoints?.[
        (visibleSeries.analysisPoints?.length || 1) - 1
      ]?.timestamp;

    return typeof firstTimestamp === 'number' &&
      typeof lastTimestamp === 'number'
      ? Math.max(0, lastTimestamp - firstTimestamp)
      : undefined;
  }, [visibleSeries]);

  const displayedAnalysisPoint = useMemo(() => {
    return getDisplayedBalanceHistoryAnalysisPoint({
      selectedPoint,
      activeSeries: visibleSeries,
    });
  }, [selectedPoint, visibleSeries]);

  const displayedChangeRowData = useMemo<ChangeRowData | undefined>(() => {
    return buildBalanceHistoryChartChangeRowData({
      displayedAnalysisPoint,
      quoteCurrency: visibleQuoteCurrency,
      label: formatRangeOrSelectedPointLabel({
        rangeLabel,
        selectedTimeframe: visibleTimeframe,
        selectedDate: selectedPoint?.date,
        displayedRangeMs,
      }),
    });
  }, [
    displayedAnalysisPoint,
    displayedRangeMs,
    rangeLabel,
    selectedPoint?.date,
    visibleQuoteCurrency,
    visibleTimeframe,
  ]);

  useEffect(() => {
    onChangeRowData?.(
      displayedChangeRowData
        ? {
            percent: displayedChangeRowData.percent,
            deltaFiatFormatted: displayedChangeRowData.deltaFiatFormatted,
            rangeLabel: displayedChangeRowData.rangeLabel,
          }
        : undefined,
    );
  }, [displayedChangeRowData, onChangeRowData]);

  useEffect(() => {
    onDisplayedAnalysisPointChange?.(
      displayedAnalysisPoint
        ? {
            timestamp: displayedAnalysisPoint.timestamp,
            totalFiatBalance: displayedAnalysisPoint.totalFiatBalance,
            totalPnlChange: displayedAnalysisPoint.totalPnlChange,
            totalPnlPercent: displayedAnalysisPoint.totalPnlPercent,
            totalCryptoBalanceFormatted:
              displayedAnalysisPoint.totalCryptoBalanceFormatted,
          }
        : undefined,
    );
  }, [displayedAnalysisPoint, onDisplayedAnalysisPointChange]);

  const hasRenderableSeries = !!visibleSeries?.graphPoints?.length;
  const isBusy = loading;
  const shouldDelayPendingOverlay = isBusy && hasRenderableSeries;

  useEffect(() => {
    if (!shouldDelayPendingOverlay) {
      setPendingOverlayVisible(false);
      return;
    }

    const timeout = setTimeout(() => {
      setPendingOverlayVisible(true);
    }, PENDING_CHART_OVERLAY_DELAY_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [shouldDelayPendingOverlay]);

  const shouldShowLoader =
    pendingOverlayVisible ||
    (isBusy && !hasRenderableSeries) ||
    (!hasRenderableSeries && showLoaderWhenNoSnapshots && hasAnyWallets);

  const onGestureStarted = useCallback(() => {
    if (!hasRenderableSeries) {
      return;
    }

    gestureStartedRef.current = true;
    lastHapticPointTsRef.current = undefined;
    haptic('impactLight');
  }, [hasRenderableSeries]);

  const onGestureEnded = useCallback(() => {
    if (!gestureStartedRef.current && !selectedPoint) {
      return;
    }

    gestureStartedRef.current = false;
    lastHapticPointTsRef.current = undefined;
    setSelectedPoint(undefined);
    onSelectedBalanceChangeRef.current?.(undefined);
    haptic('impactLight');
  }, [selectedPoint]);

  const onPointSelected = useCallback(
    (point: GraphPoint) => {
      if (!gestureStartedRef.current) {
        return;
      }

      const pointTs = point.date.getTime();

      setSelectedPoint(point);
      onSelectedBalanceChangeRef.current?.(
        getSelectedBalanceHistoryValue({
          point,
          activeSeries: visibleSeries,
          balanceOffset,
        }),
      );

      if (lastHapticPointTsRef.current !== pointTs) {
        haptic('impactLight');
        lastHapticPointTsRef.current = pointTs;
      }
    },
    [balanceOffset, visibleSeries],
  );

  const onTimeframeSelect = useCallback(
    (timeframe: FiatRateInterval) => {
      if (timeframe === selectedTimeframe) {
        return;
      }

      setSelectedPoint(undefined);
      onSelectedBalanceChangeRef.current?.(undefined);
      onSelectionActiveChangeRef.current?.(false);
      animateNextSeriesCommitRef.current = true;
      onSelectedTimeframeChange?.(timeframe);
      setSelectedTimeframe(timeframe);
    },
    [onSelectedTimeframeChange, selectedTimeframe],
  );

  return {
    selectedTimeframe,
    onTimeframeSelect,
    visibleSeries,
    visibleTimeframe,
    visibleQuoteCurrency,
    isLoading: loading,
    pendingOverlayVisible,
    shouldShowLoader,
    error,
    selectedPoint,
    displayedAnalysisPoint,
    displayedChangeRowData,
    hasRenderableSeries,
    hasAnyWallets,
    queryRevisionKey,
    onGestureStarted,
    onGestureEnded,
    onPointSelected,
  };
}

export default useBalanceChartDisplayModel;

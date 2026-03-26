import {
  type Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import type {GraphPoint} from 'react-native-graph';
import type {FiatRateInterval} from '../../store/rate/rate.models';
import type {HydratedBalanceChartSeries} from '../../utils/portfolio/chartCache';
import {formatRangeOrSelectedPointLabel} from './fiatTimeframes';
import haptic from '../haptic-feedback/haptic';
import type {
  BalanceHistoryChartOrchestrationAction,
  TimeframeChartStateByTimeframe,
} from './balanceHistoryChartOrchestration';
import {
  areBalanceHistoryChartChangeRowDataEqual,
  buildBalanceHistoryChartChangeRowData,
  getDisplayedBalanceHistoryAnalysisPoint,
  getSelectedBalanceHistoryValue,
  type ChangeRowData,
} from './balanceHistoryChartSelection';

export const useBalanceHistoryChartSelectionState = (args: {
  activeSeries?: HydratedBalanceChartSeries;
  cachedSelectedSeries?: HydratedBalanceChartSeries;
  selectedTimeframe: FiatRateInterval;
  displayedTimeframe: FiatRateInterval;
  rangeLabel: string;
  quoteCurrency: string;
  balanceOffset: number;
  timeframeStateByTimeframe: TimeframeChartStateByTimeframe<
    HydratedBalanceChartSeries,
    ChangeRowData
  >;
  dispatchTimeframeState: Dispatch<
    BalanceHistoryChartOrchestrationAction<
      HydratedBalanceChartSeries,
      ChangeRowData
    >
  >;
  onSelectedBalanceChangeRef: MutableRefObject<
    ((balance?: number) => void) | undefined
  >;
  onChangeRowData?: (data: ChangeRowData) => void;
}) => {
  const [selectedPoint, setSelectedPoint] = useState<GraphPoint | undefined>();
  const gestureStarted = useRef(false);
  const lastHapticPointTsRef = useRef<number | undefined>(undefined);

  const clearSelection = useCallback(() => {
    gestureStarted.current = false;
    lastHapticPointTsRef.current = undefined;
    setSelectedPoint(undefined);
    args.onSelectedBalanceChangeRef.current?.(undefined);
  }, [args.onSelectedBalanceChangeRef]);

  const rangeOrSelectedPointLabel = useMemo(() => {
    const displayedSeries = args.activeSeries || args.cachedSelectedSeries;
    const firstTimestamp = displayedSeries?.analysisPoints?.[0]?.timestamp;
    const lastTimestamp =
      displayedSeries?.analysisPoints?.[
        (displayedSeries.analysisPoints?.length || 1) - 1
      ]?.timestamp;
    const displayedRangeMs =
      typeof firstTimestamp === 'number' &&
      typeof lastTimestamp === 'number' &&
      Number.isFinite(firstTimestamp) &&
      Number.isFinite(lastTimestamp)
        ? Math.max(0, lastTimestamp - firstTimestamp)
        : undefined;

    return formatRangeOrSelectedPointLabel({
      rangeLabel: args.rangeLabel,
      selectedTimeframe: args.displayedTimeframe,
      selectedDate: selectedPoint?.date,
      displayedRangeMs,
    });
  }, [
    args.activeSeries,
    args.cachedSelectedSeries,
    args.displayedTimeframe,
    args.rangeLabel,
    selectedPoint?.date,
  ]);

  const displayedAnalysisPoint = useMemo(() => {
    return getDisplayedBalanceHistoryAnalysisPoint({
      selectedPoint,
      activeSeries: args.activeSeries,
      cachedSelectedSeries: args.cachedSelectedSeries,
    });
  }, [args.activeSeries, args.cachedSelectedSeries, selectedPoint]);

  const resolvedChangeRowData = useMemo(() => {
    return buildBalanceHistoryChartChangeRowData({
      displayedAnalysisPoint,
      quoteCurrency: args.quoteCurrency,
      label: rangeOrSelectedPointLabel,
    });
  }, [displayedAnalysisPoint, args.quoteCurrency, rangeOrSelectedPointLabel]);

  useEffect(() => {
    if (!resolvedChangeRowData) {
      return;
    }

    // While a newly selected timeframe is pending we may still be rendering
    // the previously displayed series; don't cache that data under the new key.
    if (args.displayedTimeframe !== args.selectedTimeframe) {
      return;
    }

    const existing =
      args.timeframeStateByTimeframe[args.selectedTimeframe]
        ?.lastResolvedChangeRowData;
    if (
      areBalanceHistoryChartChangeRowDataEqual(existing, resolvedChangeRowData)
    ) {
      return;
    }

    args.dispatchTimeframeState({
      type: 'setResolvedChangeRowData',
      timeframe: args.selectedTimeframe,
      data: resolvedChangeRowData,
    });
  }, [
    args.displayedTimeframe,
    args.dispatchTimeframeState,
    args.selectedTimeframe,
    args.timeframeStateByTimeframe,
    resolvedChangeRowData,
  ]);

  const displayedChangeRowData =
    resolvedChangeRowData ||
    args.timeframeStateByTimeframe[args.selectedTimeframe]
      ?.lastResolvedChangeRowData;

  useEffect(() => {
    if (!displayedChangeRowData) {
      return;
    }

    args.onChangeRowData?.({
      percent: displayedChangeRowData.percent,
      deltaFiatFormatted: displayedChangeRowData.deltaFiatFormatted,
      rangeLabel: displayedChangeRowData.rangeLabel,
    });
  }, [displayedChangeRowData, args.onChangeRowData]);

  const onGestureStarted = useCallback(() => {
    gestureStarted.current = true;
    lastHapticPointTsRef.current = undefined;
  }, []);

  const onGestureEnded = useCallback(() => {
    haptic('impactLight');
    clearSelection();
  }, [clearSelection]);

  const onPointSelected = useCallback(
    (point: GraphPoint) => {
      if (!gestureStarted.current || !args.activeSeries) {
        return;
      }

      setSelectedPoint(point);
      const pointTs = point.date.getTime();
      if (lastHapticPointTsRef.current !== pointTs) {
        haptic('impactLight');
        lastHapticPointTsRef.current = pointTs;
      }

      args.onSelectedBalanceChangeRef.current?.(
        getSelectedBalanceHistoryValue({
          point,
          activeSeries: args.activeSeries,
          balanceOffset: args.balanceOffset,
        }),
      );
    },
    [args.activeSeries, args.balanceOffset, args.onSelectedBalanceChangeRef],
  );

  return {
    displayedChangeRowData,
    clearSelection,
    onGestureStarted,
    onGestureEnded,
    onPointSelected,
  };
};

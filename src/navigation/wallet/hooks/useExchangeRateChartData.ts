import {useMemo} from 'react';
import type {GraphPoint} from 'react-native-graph';
import {
  CachedFiatRateInterval,
  FiatRateInterval,
  FiatRatePoint,
  FIAT_RATE_SERIES_TARGET_POINTS,
} from '../../../store/rate/rate.models';
import {calculatePercentageDifference} from '../../../utils/helper-methods';
import {getFiatTimeframeMetadata} from '../../../utils/fiatTimeframes';
import {
  normalizeGraphPointsForChart,
  recomputeMinMaxFromGraphPoints,
} from '../../../utils/portfolio/chartGraph';
import {downsampleSeries} from '../../../utils/portfolio/rate';
import {
  ensureSortedByTsAsc,
  lowerBoundByTs,
} from '../../../utils/portfolio/timeSeries';

export type ChartDisplayDataType = GraphPoint;

export interface ChartExtremaPointType {
  index: number;
  point: ChartDisplayDataType;
}

export interface ChartDataType {
  data: ChartDisplayDataType[];
  percentChange: number;
  priceChange: number;
  renderedMaxPoint?: ChartExtremaPointType;
  renderedMinPoint?: ChartExtremaPointType;
}

export const defaultDisplayData: ChartDataType = {
  data: [],
  percentChange: 0,
  priceChange: 0,
  renderedMaxPoint: undefined,
  renderedMinPoint: undefined,
};

const SPOT_RATE_MATCH_EPSILON = 1e-12;
const buildRenderedExtremaPoint = (
  index: number,
  point: ChartDisplayDataType | undefined,
): ChartExtremaPointType | undefined => {
  return point ? {index, point} : undefined;
};

type FormatExchangeRateChartDataOptions = {
  assumeSortedByTsAsc?: boolean;
};

export const formatExchangeRateChartData = (
  historicFiatRates: Array<{ts: number; rate: number}>,
  options: FormatExchangeRateChartDataOptions = {},
): ChartDataType => {
  const ratesSorted = options.assumeSortedByTsAsc
    ? historicFiatRates
    : ensureSortedByTsAsc(historicFiatRates);
  if (!ratesSorted.length) {
    return defaultDisplayData;
  }
  const targetLen = FIAT_RATE_SERIES_TARGET_POINTS;
  const rates = downsampleSeries(ratesSorted, targetLen, {
    strategy: 'lttb',
    mode: 'per_coin',
  });
  const scaledData = normalizeGraphPointsForChart(
    rates.map(value => ({
      date: new Date(value.ts),
      value: value.rate,
    })),
  ) as ChartDisplayDataType[];
  const {maxIndex, maxPoint, minIndex, minPoint} =
    recomputeMinMaxFromGraphPoints(scaledData);
  const renderedMaxPoint = buildRenderedExtremaPoint(maxIndex, maxPoint);
  const renderedMinPoint = buildRenderedExtremaPoint(minIndex, minPoint);

  if (rates.length < 2) {
    return {
      data: scaledData,
      percentChange: 0,
      priceChange: 0,
      renderedMaxPoint,
      renderedMinPoint,
    };
  }
  const percentChange = calculatePercentageDifference(
    rates[rates.length - 1].rate,
    rates[0].rate,
  );

  return {
    data: scaledData,
    percentChange,
    priceChange: rates[rates.length - 1].rate - rates[0].rate,
    renderedMaxPoint,
    renderedMinPoint,
  };
};

type Args = {
  selectedSeriesPoints: FiatRatePoint[] | undefined;
  selectedTimeframe: FiatRateInterval;
  seriesDataInterval: CachedFiatRateInterval;
  currentFiatRate: number | undefined;
};

type Result = {
  pointsForChartRaw: FiatRatePoint[] | undefined;
  displayData: ChartDataType | undefined;
};

type PrepareExchangeRateChartPointsArgs = Args & {
  nowMs?: number;
};

export const prepareExchangeRateChartPoints = ({
  selectedSeriesPoints,
  selectedTimeframe,
  seriesDataInterval,
  currentFiatRate,
  nowMs,
}: PrepareExchangeRateChartPointsArgs): FiatRatePoint[] | undefined => {
  if (!selectedSeriesPoints) {
    return undefined;
  }

  const pointsSortedByTs = ensureSortedByTsAsc(selectedSeriesPoints);
  const {windowMs} = getFiatTimeframeMetadata(selectedTimeframe);
  const pointsToDisplay =
    seriesDataInterval === 'ALL' && typeof windowMs === 'number'
      ? pointsSortedByTs.slice(
          lowerBoundByTs(
            pointsSortedByTs,
            (typeof nowMs === 'number' ? nowMs : Date.now()) - windowMs,
          ),
        )
      : pointsSortedByTs;

  if (!pointsToDisplay.length) {
    return pointsToDisplay;
  }
  if (!Number.isFinite(currentFiatRate)) {
    return pointsToDisplay;
  }

  const lastIdx = pointsToDisplay.length - 1;
  const last = pointsToDisplay[lastIdx];
  if (
    !last ||
    Math.abs(last.rate - currentFiatRate) <= SPOT_RATE_MATCH_EPSILON
  ) {
    return pointsToDisplay;
  }

  // Never mutate cached series points in Redux; only override in-memory for rendering.
  const copy = [...pointsToDisplay];
  copy[lastIdx] = {...last, rate: currentFiatRate};
  return copy;
};

const useExchangeRateChartData = ({
  selectedSeriesPoints,
  selectedTimeframe,
  seriesDataInterval,
  currentFiatRate,
}: Args): Result => {
  const pointsForChartRaw = useMemo<FiatRatePoint[] | undefined>(() => {
    return prepareExchangeRateChartPoints({
      selectedSeriesPoints,
      selectedTimeframe,
      seriesDataInterval,
      currentFiatRate,
    });
  }, [
    currentFiatRate,
    selectedSeriesPoints,
    selectedTimeframe,
    seriesDataInterval,
  ]);

  const displayData = useMemo(() => {
    if (typeof pointsForChartRaw === 'undefined') {
      return undefined;
    }
    return formatExchangeRateChartData(pointsForChartRaw, {
      assumeSortedByTsAsc: true,
    });
  }, [pointsForChartRaw]);

  return {
    pointsForChartRaw,
    displayData,
  };
};

export default useExchangeRateChartData;

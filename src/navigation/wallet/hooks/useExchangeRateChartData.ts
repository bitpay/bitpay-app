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

const findFiniteExtremaPointIndexes = (
  points: FiatRatePoint[],
): {
  maxIndex?: number;
  minIndex?: number;
} => {
  let minIndex: number | undefined;
  let maxIndex: number | undefined;
  let minRate = Number.POSITIVE_INFINITY;
  let maxRate = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < points.length; index++) {
    const rate = points[index]?.rate;
    if (!Number.isFinite(rate)) {
      continue;
    }

    if (minIndex == null || rate < minRate) {
      minRate = rate;
      minIndex = index;
    }
    if (maxIndex == null || rate > maxRate) {
      maxRate = rate;
      maxIndex = index;
    }
  }

  return {
    maxIndex,
    minIndex,
  };
};

const getLinearInterpolationError = (
  prev: FiatRatePoint,
  current: FiatRatePoint,
  next: FiatRatePoint,
): number => {
  const span = next.ts - prev.ts;
  if (!Number.isFinite(span) || span <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  const position = (current.ts - prev.ts) / span;
  const interpolatedRate =
    prev.rate + (next.rate - prev.rate) * Math.max(0, Math.min(1, position));
  if (!Number.isFinite(interpolatedRate)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(current.rate - interpolatedRate);
};

const findLeastImportantRemovablePointIndex = (
  points: FiatRatePoint[],
  requiredTimestamps: Set<number>,
): number => {
  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 1; index < points.length - 1; index++) {
    const current = points[index];
    if (requiredTimestamps.has(current.ts)) {
      continue;
    }

    const score = getLinearInterpolationError(
      points[index - 1],
      current,
      points[index + 1],
    );
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  if (bestIndex >= 0) {
    return bestIndex;
  }

  for (let index = 0; index < points.length; index++) {
    if (!requiredTimestamps.has(points[index].ts)) {
      return index;
    }
  }

  return -1;
};

export const downsampleExchangeRateSeriesPreservingExtrema = (
  ratesSorted: FiatRatePoint[],
  targetLen: number,
): FiatRatePoint[] => {
  if (ratesSorted.length <= targetLen) {
    return ratesSorted;
  }

  const sampled = downsampleSeries(ratesSorted, targetLen, {
    strategy: 'lttb',
    mode: 'per_coin',
  });
  const {maxIndex, minIndex} = findFiniteExtremaPointIndexes(ratesSorted);
  const requiredTimestamps = new Set<number>();
  const pointsByTimestamp = new Map<number, FiatRatePoint>();

  for (const point of ratesSorted) {
    pointsByTimestamp.set(point.ts, point);
  }

  const firstPoint = ratesSorted[0];
  const lastPoint = ratesSorted[ratesSorted.length - 1];
  const minPoint =
    typeof minIndex === 'number' ? ratesSorted[minIndex] : undefined;
  const maxPoint =
    typeof maxIndex === 'number' ? ratesSorted[maxIndex] : undefined;

  for (const point of [firstPoint, lastPoint, minPoint, maxPoint]) {
    if (point && Number.isFinite(point.ts)) {
      requiredTimestamps.add(point.ts);
    }
  }

  const mergedByTimestamp = new Map<number, FiatRatePoint>();
  for (const point of sampled) {
    mergedByTimestamp.set(point.ts, point);
  }
  for (const ts of requiredTimestamps) {
    const point = pointsByTimestamp.get(ts);
    if (point) {
      mergedByTimestamp.set(ts, point);
    }
  }

  const merged = Array.from(mergedByTimestamp.values()).sort(
    (a, b) => a.ts - b.ts,
  );

  while (merged.length > targetLen) {
    const removableIndex = findLeastImportantRemovablePointIndex(
      merged,
      requiredTimestamps,
    );
    if (removableIndex < 0) {
      break;
    }
    merged.splice(removableIndex, 1);
  }

  return merged;
};

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
  // Preserve the true timeframe extrema so axis labels match the raw window,
  // even when the rendered series is aggressively downsampled.
  const rates = downsampleExchangeRateSeriesPreservingExtrema(
    ratesSorted,
    targetLen,
  );
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

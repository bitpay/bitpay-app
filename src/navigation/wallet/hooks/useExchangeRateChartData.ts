import {useMemo} from 'react';
import {
  CachedFiatRateInterval,
  DateRanges,
  FiatRateInterval,
  FiatRatePoint,
  FIAT_RATE_SERIES_TARGET_POINTS,
} from '../../../store/rate/rate.models';
import {calculatePercentageDifference} from '../../../utils/helper-methods';
import {downsampleSeries} from '../../../utils/portfolio/rate';
import {
  ensureSortedByTsAsc,
  getMaxRate,
  lowerBoundByTs,
} from '../../../utils/portfolio/timeSeries';

export interface ChartDisplayDataType {
  date: Date;
  value: number;
}

export interface ChartDataType {
  data: ChartDisplayDataType[];
  percentChange: number;
  priceChange: number;
  maxIndex?: number;
  maxPoint?: ChartDisplayDataType;
  minIndex?: number;
  minPoint?: ChartDisplayDataType;
}

export const defaultDisplayData: ChartDataType = {
  data: [],
  percentChange: 0,
  priceChange: 0,
  maxIndex: undefined,
  maxPoint: undefined,
  minIndex: undefined,
  minPoint: undefined,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const HISTORIC_TIMEFRAME_WINDOW_MS: Record<'3M' | '1Y' | '5Y', number> =
  {
    '3M': DateRanges.Quarter * MS_PER_DAY,
    '1Y': DateRanges.Year * MS_PER_DAY,
    '5Y': DateRanges.FiveYears * MS_PER_DAY,
  };
const SPOT_RATE_MATCH_EPSILON = 1e-12;

const getFormattedData = (
  historicFiatRates: Array<{ts: number; rate: number}>,
): ChartDataType => {
  const ratesSorted = ensureSortedByTsAsc(historicFiatRates);
  if (!ratesSorted.length) {
    return defaultDisplayData;
  }
  const targetLen = FIAT_RATE_SERIES_TARGET_POINTS;
  const rates = downsampleSeries(ratesSorted, targetLen, {
    strategy: 'lttb',
    mode: 'per_coin',
  });
  const scaledData = rates.map(value => ({
    date: new Date(value.ts),
    value: value.rate,
  }));

  let maxPoint: ChartDisplayDataType | undefined;
  let minPoint: ChartDisplayDataType | undefined;
  let maxIndex: number | undefined;
  let minIndex: number | undefined;

  for (let index = 0; index < scaledData.length; index++) {
    const point = scaledData[index];
    if (Number.isNaN(point.value)) {
      continue;
    }

    if (typeof maxPoint === 'undefined' || point.value > maxPoint.value) {
      maxPoint = point;
      maxIndex = index;
    }
    if (typeof minPoint === 'undefined' || point.value < minPoint.value) {
      minPoint = point;
      minIndex = index;
    }
  }

  if (rates.length < 2) {
    return {
      data: scaledData,
      percentChange: 0,
      priceChange: 0,
      maxIndex,
      maxPoint,
      minIndex,
      minPoint,
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
    maxIndex,
    maxPoint,
    minIndex,
    minPoint,
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
  selectedTimeframeHighValue: number | undefined;
};

const useExchangeRateChartData = ({
  selectedSeriesPoints,
  selectedTimeframe,
  seriesDataInterval,
  currentFiatRate,
}: Args): Result => {
  const pointsForChartRaw = useMemo<FiatRatePoint[] | undefined>(() => {
    if (!selectedSeriesPoints) {
      return undefined;
    }

    const pointsToDisplay: FiatRatePoint[] = (() => {
      if (
        seriesDataInterval === 'ALL' &&
        selectedTimeframe !== 'ALL' &&
        (selectedTimeframe === '3M' ||
          selectedTimeframe === '1Y' ||
          selectedTimeframe === '5Y')
      ) {
        const now = Date.now();
        const windowMs =
          selectedTimeframe === '3M'
            ? HISTORIC_TIMEFRAME_WINDOW_MS['3M']
            : selectedTimeframe === '1Y'
            ? HISTORIC_TIMEFRAME_WINDOW_MS['1Y']
            : HISTORIC_TIMEFRAME_WINDOW_MS['5Y'];
        const cutoffTs = now - windowMs;
        const pointsSortedByTs = ensureSortedByTsAsc(selectedSeriesPoints);
        const startIdx = lowerBoundByTs(pointsSortedByTs, cutoffTs);
        return pointsSortedByTs.slice(startIdx);
      }
      return selectedSeriesPoints;
    })();

    if (
      !pointsToDisplay.length ||
      !currentFiatRate ||
      !Number.isFinite(currentFiatRate)
    ) {
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
    return getFormattedData(pointsForChartRaw);
  }, [pointsForChartRaw]);

  const selectedTimeframeHighValue = useMemo(() => {
    return getMaxRate(pointsForChartRaw);
  }, [pointsForChartRaw]);

  return {
    pointsForChartRaw,
    displayData,
    selectedTimeframeHighValue,
  };
};

export default useExchangeRateChartData;

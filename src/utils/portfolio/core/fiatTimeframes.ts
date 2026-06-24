import type {FiatRateInterval} from './fiatRateSeries';

const DAY_MS = 24 * 60 * 60 * 1000;

export type FiatTimeframeSeriesInterval = 'ALL' | '1D' | '1W' | '1M';

export type FiatTimeframeMetadata = Readonly<{
  displayLabel: string;
  rangeLabel: string;
  windowMs?: number;
  seriesInterval: FiatTimeframeSeriesInterval;
}>;

export const FIAT_TIMEFRAME_METADATA = {
  ALL: {
    displayLabel: 'All',
    rangeLabel: 'All-time',
    seriesInterval: 'ALL',
  },
  '1D': {
    displayLabel: '1D',
    rangeLabel: 'Last Day',
    windowMs: 1 * DAY_MS,
    seriesInterval: '1D',
  },
  '1W': {
    displayLabel: '1W',
    rangeLabel: 'Past Week',
    windowMs: 7 * DAY_MS,
    seriesInterval: '1W',
  },
  '1M': {
    displayLabel: '1M',
    rangeLabel: 'Past Month',
    windowMs: 30 * DAY_MS,
    seriesInterval: '1M',
  },
  '3M': {
    displayLabel: '3M',
    rangeLabel: 'Past 3 Months',
    windowMs: 90 * DAY_MS,
    seriesInterval: 'ALL',
  },
  '1Y': {
    displayLabel: '1Y',
    rangeLabel: 'Past Year',
    windowMs: 365 * DAY_MS,
    seriesInterval: 'ALL',
  },
  '5Y': {
    displayLabel: '5Y',
    rangeLabel: 'Past 5 Years',
    windowMs: 1825 * DAY_MS,
    seriesInterval: 'ALL',
  },
} as const satisfies Record<FiatRateInterval, FiatTimeframeMetadata>;

export const getFiatTimeframeMetadata = (
  timeframe: FiatRateInterval,
): FiatTimeframeMetadata => {
  return FIAT_TIMEFRAME_METADATA[timeframe];
};

export const getFiatTimeframeWindowMs = (
  timeframe: FiatRateInterval,
): number | undefined => {
  return getFiatTimeframeMetadata(timeframe).windowMs;
};

export const getFiatTimeframeSeriesInterval = (
  timeframe: FiatRateInterval,
): FiatTimeframeSeriesInterval => {
  return getFiatTimeframeMetadata(timeframe).seriesInterval;
};

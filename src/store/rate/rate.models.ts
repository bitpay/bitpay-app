export interface Rate {
  code: string;
  fetchedOn: number;
  name: string;
  rate: number;
  ts: number;
}

export interface HistoricRate {
  fetchedOn: number;
  rate: number;
  ts: number;
}

export type Rates = {
  [key in string]: Rate[];
};

export enum DateRanges {
  Day = 1,
  Week = 7,
  Month = 30,
  Quarter = 90,
  Year = 365,
  FiveYears = 1825,
}

export const FIAT_RATE_SERIES_CACHED_INTERVALS = [
  'ALL',
  '1D',
  '1W',
  '1M',
] as const;

export type CachedFiatRateInterval =
  (typeof FIAT_RATE_SERIES_CACHED_INTERVALS)[number];
export type FiatRateInterval = CachedFiatRateInterval | '3M' | '1Y' | '5Y';

// Shared chart density + minimum historical coverage threshold.
export const FIAT_RATE_SERIES_TARGET_POINTS = 89;

export type FiatRatePoint = {
  ts: number;
  rate: number;
};

export type FiatRateSeries = {
  fetchedOn: number;
  points: FiatRatePoint[];
};

export type FiatRateSeriesCache = {
  [key in string]?: FiatRateSeries;
};

export type RatesCacheKey = {
  [key: number]: number | undefined;
};

export const getFiatRateSeriesCacheKey = (
  fiatCode: string,
  coin: string,
  interval: FiatRateInterval,
): string => {
  return `${(fiatCode || '').toUpperCase()}:${(
    coin || ''
  ).toLowerCase()}:${interval}`;
};

export const hasValidSeriesForCoin = (args: {
  cache: FiatRateSeriesCache | undefined;
  fiatCodeUpper: string;
  normalizedCoin: string;
  intervals: ReadonlyArray<FiatRateInterval>;
}): boolean => {
  const fiatCodeUpper = (args.fiatCodeUpper || '').toUpperCase();
  const normalizedCoin = (args.normalizedCoin || '').trim().toLowerCase();
  if (!fiatCodeUpper || !normalizedCoin) {
    return false;
  }

  for (const interval of args.intervals) {
    const cacheKey = getFiatRateSeriesCacheKey(
      fiatCodeUpper,
      normalizedCoin,
      interval,
    );
    const points = args.cache?.[cacheKey]?.points;
    if (!Array.isArray(points) || !points.length) {
      return false;
    }
    if (
      !points.every(
        point => Number.isFinite(point?.ts) && Number.isFinite(point?.rate),
      )
    ) {
      return false;
    }
  }

  return true;
};

export enum CacheKeys {
  RATES = 'ratesCacheKey',
}

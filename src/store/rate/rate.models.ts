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

export type CachedFiatRateInterval = 'ALL' | '1D' | '1W' | '1M';
export type FiatRateInterval = CachedFiatRateInterval | '3M' | '1Y' | '5Y';

export const FIAT_RATE_SERIES_CACHED_INTERVALS: Array<CachedFiatRateInterval> =
  ['ALL', '1D', '1W', '1M'];

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

export const getFiatRateSeriesCacheKey = (
  fiatCode: string,
  coin: string,
  interval: FiatRateInterval,
): string => {
  return `${(fiatCode || '').toUpperCase()}:${(
    coin || ''
  ).toLowerCase()}:${interval}`;
};

export enum CacheKeys {
  RATES = 'ratesCacheKey',
}

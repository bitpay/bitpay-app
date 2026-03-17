import {
  type FiatRateSeriesAssetIdentity,
  type FiatRateSeriesReaderIdentity,
  getFiatRateSeriesAssetKey as getSharedFiatRateSeriesAssetKey,
  getFiatRateSeriesCacheKey as getSharedFiatRateSeriesCacheKey,
  parseFiatRateSeriesCacheKey as parseSharedFiatRateSeriesCacheKey,
} from '../../utils/portfolio/core/fiatRateSeries';
import {HISTORIC_RATES_CACHE_DURATION} from '../../constants/wallet';

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

export type FiatRateSeriesCacheEntry = NonNullable<FiatRateSeriesCache[string]>;
export type {FiatRateSeriesAssetIdentity, FiatRateSeriesReaderIdentity};

export type RatesCacheKey = {
  [key: number]: number | undefined;
};

export const getFiatRateSeriesAssetKey = getSharedFiatRateSeriesAssetKey;
export const parseFiatRateSeriesCacheKey = parseSharedFiatRateSeriesCacheKey;

export const getFiatRateSeriesCacheKey = (
  fiatCode: string,
  coin: string,
  interval: FiatRateInterval,
  identity?: FiatRateSeriesReaderIdentity,
): string => {
  return getSharedFiatRateSeriesCacheKey(fiatCode, coin, interval, identity);
};

export const getFiatRateSeriesLoadedIntervalKey = getFiatRateSeriesCacheKey;

export const hasValidSeriesForCoin = (args: {
  cache: FiatRateSeriesCache | undefined;
  fiatCodeUpper: string;
  normalizedCoin: string;
  intervals: ReadonlyArray<FiatRateInterval>;
  requireFresh?: boolean;
  freshnessDurationSeconds?: number;
  chain?: string;
  tokenAddress?: string;
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
      {
        chain: args.chain,
        tokenAddress: args.tokenAddress,
      },
    );
    const cachedSeries = args.cache?.[cacheKey];
    const points = cachedSeries?.points;
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
    if (args.requireFresh) {
      const freshnessDurationSeconds = Math.max(
        0,
        args.freshnessDurationSeconds ?? HISTORIC_RATES_CACHE_DURATION,
      );
      const fetchedOn = cachedSeries?.fetchedOn;
      if (
        !(
          typeof fetchedOn === 'number' &&
          Number.isFinite(fetchedOn) &&
          Date.now() - fetchedOn <= freshnessDurationSeconds * 1000
        )
      ) {
        return false;
      }
    }
  }

  return true;
};

export enum CacheKeys {
  RATES = 'ratesCacheKey',
}

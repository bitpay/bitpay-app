import {CacheKeys, DateRanges, Rates, RatesByDateRange} from './rate.models';

export enum RateActionTypes {
  SUCCESS_GET_RATES = 'RATE/SUCCESS_GET_RATES',
  SUCCESS_GET_HISTORICAL_RATES = 'RATE/SUCCESS_GET_HISTORICAL_RATES',
  FAILED_GET_RATES = 'RATE/FAILED_GET_RATES',
  FAILED_GET_HISTORICAL_RATES = 'RATE/FAILED_GET_HISTORICAL_RATES',
  UPDATE_CACHE_KEY = 'RATE/UPDATE_CACHE_KEY',
  UPDATE_HISTORICAL_CACHE_KEY = 'RATE/UPDATE_HISTORICAL_CACHE_KEY',
}

interface successGetRates {
  type: typeof RateActionTypes.SUCCESS_GET_RATES;
  payload: {
    rates?: Rates;
    lastDayRates?: Rates;
  };
}

interface successGetHistoricalRates {
  type: typeof RateActionTypes.SUCCESS_GET_HISTORICAL_RATES;
  payload: {
    ratesByDateRange?: RatesByDateRange;
    dateRange?: DateRanges;
    fiatCode?: string;
  };
}

interface failedGetRates {
  type: typeof RateActionTypes.FAILED_GET_RATES;
}

interface failedGetHistoricalRates {
  type: typeof RateActionTypes.FAILED_GET_HISTORICAL_RATES;
}

interface updateCacheKey {
  type: typeof RateActionTypes.UPDATE_CACHE_KEY;
  payload: {
    cacheKey: CacheKeys;
    dateRange?: DateRanges;
  };
}

interface updateHistoricalCacheKey {
  type: typeof RateActionTypes.UPDATE_HISTORICAL_CACHE_KEY;
  payload: {
    cacheKey: CacheKeys;
    dateRange?: DateRanges;
  };
}

export type RateActionType =
  | successGetRates
  | successGetHistoricalRates
  | failedGetRates
  | failedGetHistoricalRates
  | updateCacheKey
  | updateHistoricalCacheKey;

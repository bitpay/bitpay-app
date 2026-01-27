import {CacheKeys, DateRanges, FiatRateSeriesCache, Rates} from './rate.models';

export enum RateActionTypes {
  SUCCESS_GET_RATES = 'RATE/SUCCESS_GET_RATES',
  UPSERT_FIAT_RATE_SERIES_CACHE = 'RATE/UPSERT_FIAT_RATE_SERIES_CACHE',
  FAILED_GET_RATES = 'RATE/FAILED_GET_RATES',
  UPDATE_CACHE_KEY = 'RATE/UPDATE_CACHE_KEY',
  CLEAR_RATE_STATE = 'RATE/CLEAR_RATE_STATE',
}

interface successGetRates {
  type: typeof RateActionTypes.SUCCESS_GET_RATES;
  payload: {
    rates?: Rates;
    lastDayRates?: Rates;
  };
}

interface upsertFiatRateSeriesCache {
  type: typeof RateActionTypes.UPSERT_FIAT_RATE_SERIES_CACHE;
  payload: {
    updates: FiatRateSeriesCache;
  };
}

interface failedGetRates {
  type: typeof RateActionTypes.FAILED_GET_RATES;
}

interface updateCacheKey {
  type: typeof RateActionTypes.UPDATE_CACHE_KEY;
  payload: {
    cacheKey: CacheKeys;
    dateRange?: DateRanges;
  };
}

interface clearRateState {
  type: typeof RateActionTypes.CLEAR_RATE_STATE;
}

export type RateActionType =
  | successGetRates
  | upsertFiatRateSeriesCache
  | failedGetRates
  | updateCacheKey
  | clearRateState;

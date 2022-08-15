import {
  CacheKeys,
  DateRanges,
  PriceHistory,
  Rates,
  RatesByDateRange,
} from './rate.models';

export enum RateActionTypes {
  SUCCESS_GET_RATES = 'RATE/SUCCESS_GET_RATES',
  FAILED_GET_RATES = 'RATE/FAILED_GET_RATES',
  SUCCESS_GET_PRICE_HISTORY = 'RATE/SUCCESS_GET_PRICE_HISTORY',
  FAILED_GET_PRICE_HISTORY = 'RATE/FAILED_GET_PRICE_HISTORY',
  UPDATE_CACHE_KEY = 'RATE/UPDATE_CACHE_KEY',
}

interface successGetRates {
  type: typeof RateActionTypes.SUCCESS_GET_RATES;
  payload: {
    rates?: Rates;
    ratesByDateRange?: RatesByDateRange;
    lastDayRates?: Rates;
    dateRange?: DateRanges;
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

interface successGetPriceHistory {
  type: typeof RateActionTypes.SUCCESS_GET_PRICE_HISTORY;
  payload: Array<PriceHistory>;
}

interface failedGetPriceHistory {
  type: typeof RateActionTypes.FAILED_GET_PRICE_HISTORY;
}

export type RateActionType =
  | successGetRates
  | failedGetRates
  | updateCacheKey
  | successGetPriceHistory
  | failedGetPriceHistory;

import {CacheKeys, DateRanges, Rates, RatesByDateRange} from './rate.models';
import {RateActionType, RateActionTypes} from './rate.types';

export const successGetRates = (payload: {
  rates: Rates;
  lastDayRates: Rates;
}): RateActionType => ({
  type: RateActionTypes.SUCCESS_GET_RATES,
  payload,
});

export const successGetHistoricalRates = (payload: {
  ratesByDateRange: RatesByDateRange;
  dateRange: number;
  fiatCode: string;
}): RateActionType => ({
  type: RateActionTypes.SUCCESS_GET_HISTORICAL_RATES,
  payload,
});

export const failedGetRates = (): RateActionType => ({
  type: RateActionTypes.FAILED_GET_RATES,
});

export const failedGetHistoricalRates = (): RateActionType => ({
  type: RateActionTypes.FAILED_GET_HISTORICAL_RATES,
});

export const updateCacheKey = (payload: {
  cacheKey: CacheKeys;
  dateRange?: DateRanges;
}): RateActionType => ({
  type: RateActionTypes.UPDATE_CACHE_KEY,
  payload,
});

export const updateHistoricalCacheKey = (payload: {
  cacheKey: CacheKeys;
  dateRange?: DateRanges;
}): RateActionType => ({
  type: RateActionTypes.UPDATE_HISTORICAL_CACHE_KEY,
  payload,
});

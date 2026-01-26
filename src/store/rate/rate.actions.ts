import {CacheKeys, DateRanges, Rates} from './rate.models';
import {RateActionType, RateActionTypes} from './rate.types';
import type {FiatRateSeriesCache} from './rate.models';

export const successGetRates = (payload: {
  rates: Rates;
  lastDayRates: Rates;
}): RateActionType => ({
  type: RateActionTypes.SUCCESS_GET_RATES,
  payload,
});

export const failedGetRates = (): RateActionType => ({
  type: RateActionTypes.FAILED_GET_RATES,
});

export const updateCacheKey = (payload: {
  cacheKey: CacheKeys;
  dateRange?: DateRanges;
}): RateActionType => ({
  type: RateActionTypes.UPDATE_CACHE_KEY,
  payload,
});

export const upsertFiatRateSeriesCache = (payload: {
  updates: FiatRateSeriesCache;
}): RateActionType => ({
  type: RateActionTypes.UPSERT_FIAT_RATE_SERIES_CACHE,
  payload,
});

export const clearRateState = (): RateActionType => ({
  type: RateActionTypes.CLEAR_RATE_STATE,
});

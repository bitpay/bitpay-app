import {
  CacheKeys,
  DateRanges,
  PriceHistory,
  Rates,
  RatesByDateRange,
} from './rate.models';
import {RateActionType, RateActionTypes} from './rate.types';

export const successGetRates = (payload: {
  rates?: Rates;
  ratesByDateRange?: RatesByDateRange;
  lastDayRates?: Rates;
  dateRange?: number;
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

export const successGetPriceHistory = (
  payload: Array<PriceHistory>,
): RateActionType => ({
  type: RateActionTypes.SUCCESS_GET_PRICE_HISTORY,
  payload,
});

export const failedGetPriceHistory = (): RateActionType => ({
  type: RateActionTypes.FAILED_GET_PRICE_HISTORY,
});

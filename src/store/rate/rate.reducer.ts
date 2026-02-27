import type {FiatRateSeriesCache, Rates, RatesCacheKey} from './rate.models';
import {RateActionType, RateActionTypes} from './rate.types';
import {DEFAULT_DATE_RANGE} from '../../constants/rate';

type RateReduxPersistBlackList = string[];
export const rateReduxPersistBlackList: RateReduxPersistBlackList = [];

const getFiatCodeFromSeriesCacheKey = (
  cacheKey: string,
): string | undefined => {
  if (!cacheKey || typeof cacheKey !== 'string') {
    return undefined;
  }
  const idx = cacheKey.indexOf(':');
  if (idx <= 0) {
    return undefined;
  }
  return cacheKey.slice(0, idx).toUpperCase();
};

const getCoinFromSeriesCacheKey = (cacheKey: string): string | undefined => {
  if (!cacheKey || typeof cacheKey !== 'string') {
    return undefined;
  }
  const first = cacheKey.indexOf(':');
  if (first <= 0) {
    return undefined;
  }
  const second = cacheKey.indexOf(':', first + 1);
  if (second <= first + 1) {
    return undefined;
  }
  return cacheKey.slice(first + 1, second).toLowerCase();
};

export interface RateState {
  lastDayRates: Rates;
  rates: Rates;
  fiatRateSeriesCache: FiatRateSeriesCache;
  ratesCacheKey: RatesCacheKey;
}

const initialState: RateState = {
  rates: {},
  lastDayRates: {},
  fiatRateSeriesCache: {},
  ratesCacheKey: {},
};

export const rateReducer = (
  state: RateState = initialState,
  action: RateActionType,
): RateState => {
  switch (action.type) {
    case RateActionTypes.CLEAR_RATE_STATE: {
      return initialState;
    }

    case RateActionTypes.SUCCESS_GET_RATES: {
      const {rates, lastDayRates} = action.payload;
      return {
        ...state,
        rates: {...initialState.rates, ...rates},
        ratesCacheKey: {
          ...state.ratesCacheKey,
          [DEFAULT_DATE_RANGE]: Date.now(),
        },
        lastDayRates: {...initialState.lastDayRates, ...lastDayRates},
      };
    }

    case RateActionTypes.PRUNE_FIAT_RATE_SERIES_CACHE: {
      const fiatCode = (action.payload?.fiatCode || '').toUpperCase();
      if (!fiatCode) {
        return state;
      }

      const keepCoins = new Set(
        (action.payload?.keepCoins || [])
          .map(coin => (coin || '').toLowerCase())
          .filter(Boolean),
      );

      const next: FiatRateSeriesCache = {};
      for (const [cacheKey, series] of Object.entries(
        state.fiatRateSeriesCache || {},
      )) {
        const keyFiat = getFiatCodeFromSeriesCacheKey(cacheKey);
        if (keyFiat !== fiatCode) {
          next[cacheKey] = series;
          continue;
        }

        const keyCoin = getCoinFromSeriesCacheKey(cacheKey);
        if (keyCoin && keepCoins.has(keyCoin)) {
          next[cacheKey] = series;
        }
      }

      return {
        ...state,
        fiatRateSeriesCache: next,
      };
    }

    case RateActionTypes.UPSERT_FIAT_RATE_SERIES_CACHE: {
      const {updates} = action.payload;
      const fiatRateSeriesCache = {
        ...state.fiatRateSeriesCache,
        ...updates,
      };
      return {
        ...state,
        fiatRateSeriesCache,
      };
    }

    case RateActionTypes.UPDATE_CACHE_KEY: {
      const {dateRange = DEFAULT_DATE_RANGE} = action.payload;
      return {
        ...state,
        ratesCacheKey: {
          ...state.ratesCacheKey,
          [dateRange]: Date.now(),
        },
      };
    }

    default:
      return state;
  }
};

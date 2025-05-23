import {DateRanges, Rates} from './rate.models';
import {RateActionType, RateActionTypes} from './rate.types';
import {DEFAULT_DATE_RANGE} from '../../constants/rate';

type RateReduxPersistBlackList = string[];
export const rateReduxPersistBlackList: RateReduxPersistBlackList = [];

export interface RateState {
  lastDayRates: Rates;
  rates: Rates;
  ratesByDateRange: {[key in DateRanges]: Rates};
  balanceCacheKey: {[key in string]: number | undefined};
  ratesCacheKey: {[key in number]: DateRanges | undefined};
  ratesHistoricalCacheKey: {[key in number]: DateRanges | undefined};
  cachedValuesFiatCode: string | undefined;
}

const initialState: RateState = {
  rates: {},
  ratesByDateRange: {
    1: {},
    7: {},
    30: {},
  },
  lastDayRates: {},
  balanceCacheKey: {},
  ratesCacheKey: {},
  ratesHistoricalCacheKey: {},
  cachedValuesFiatCode: undefined,
};

export const rateReducer = (
  state: RateState = initialState,
  action: RateActionType,
): RateState => {
  switch (action.type) {
    case RateActionTypes.SUCCESS_GET_RATES: {
      const {rates, lastDayRates} = action.payload;
      return {
        ...state,
        rates: {...initialState.rates, ...rates},
        ratesCacheKey: {
          ...initialState.ratesCacheKey,
          [DEFAULT_DATE_RANGE]: Date.now(),
        },
        lastDayRates: {...initialState.lastDayRates, ...lastDayRates},
      };
    }

    case RateActionTypes.SUCCESS_GET_HISTORICAL_RATES: {
      const {
        ratesByDateRange,
        dateRange = DEFAULT_DATE_RANGE,
        fiatCode,
      } = action.payload;
      return {
        ...state,
        ratesByDateRange: {
          ...state.ratesByDateRange,
          [dateRange]: {...ratesByDateRange},
        },
        ratesHistoricalCacheKey: {
          ...state.ratesHistoricalCacheKey,
          [dateRange]: Date.now(),
        },
        cachedValuesFiatCode: fiatCode,
      };
    }

    case RateActionTypes.UPDATE_CACHE_KEY: {
      const {cacheKey, dateRange = DEFAULT_DATE_RANGE} = action.payload;
      return {
        ...state,
        [cacheKey]: {...initialState.ratesCacheKey, [dateRange]: Date.now()},
      };
    }

    case RateActionTypes.UPDATE_HISTORICAL_CACHE_KEY: {
      const {cacheKey, dateRange = DEFAULT_DATE_RANGE} = action.payload;
      return {
        ...state,
        [cacheKey]: {
          ...initialState.ratesHistoricalCacheKey,
          [dateRange]: Date.now(),
        },
      };
    }

    default:
      return state;
  }
};

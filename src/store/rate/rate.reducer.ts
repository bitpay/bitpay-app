import {DateRanges, PriceHistory, Rates} from './rate.models';
import {RateActionType, RateActionTypes} from './rate.types';
import {DEFAULT_DATE_RANGE} from '../../constants/rate';

type RateReduxPersistBlackList = string[];
export const rateReduxPersistBlackList: RateReduxPersistBlackList = [];

export interface RateState {
  lastDayRates: Rates;
  rates: Rates;
  ratesByDateRange: {[key in DateRanges]: Rates};
  priceHistory: Array<PriceHistory>;
  balanceCacheKey: {[key in string]: number | undefined};
  ratesCacheKey: {[key in number]: DateRanges | undefined};
}

const initialState: RateState = {
  rates: {},
  ratesByDateRange: {
    1: {},
    7: {},
    30: {},
  },
  lastDayRates: {},
  priceHistory: [],
  balanceCacheKey: {},
  ratesCacheKey: {},
};

export const rateReducer = (
  state: RateState = initialState,
  action: RateActionType,
): RateState => {
  switch (action.type) {
    case RateActionTypes.SUCCESS_GET_RATES: {
      const {
        rates,
        ratesByDateRange,
        lastDayRates,
        dateRange = DEFAULT_DATE_RANGE,
      } = action.payload;

      return {
        ...state,
        rates: {...state.rates, ...rates},
        ratesByDateRange: {
          ...state.ratesByDateRange,
          [dateRange]: {...ratesByDateRange},
        },
        ratesCacheKey: {...state.ratesCacheKey, [dateRange]: Date.now()},
        lastDayRates: {...state.lastDayRates, ...lastDayRates},
      };
    }

    case RateActionTypes.UPDATE_CACHE_KEY: {
      const {cacheKey, dateRange = DEFAULT_DATE_RANGE} = action.payload;
      return {
        ...state,
        [cacheKey]: {...state.ratesCacheKey, [dateRange]: Date.now()},
      };
    }

    case RateActionTypes.SUCCESS_GET_PRICE_HISTORY: {
      return {
        ...state,
        priceHistory: action.payload,
      };
    }

    default:
      return state;
  }
};

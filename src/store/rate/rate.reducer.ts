import {DateRanges, Rates} from './rate.models';
import {RateActionType, RateActionTypes} from './rate.types';
import {DEFAULT_DATE_RANGE} from '../../constants/rate';
import type {FiatRateSeriesCache} from './rate.models';

type RateReduxPersistBlackList = string[];
export const rateReduxPersistBlackList: RateReduxPersistBlackList = [];

const FIAT_RATE_SERIES_MAX_FIATS_PERSISTED = 1;

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

export interface RateState {
  lastDayRates: Rates;
  rates: Rates;
  fiatRateSeriesCache: FiatRateSeriesCache;
  balanceCacheKey: {[key in string]: number | undefined};
  ratesCacheKey: {[key in number]: DateRanges | undefined};
}

const initialState: RateState = {
  rates: {},
  lastDayRates: {},
  fiatRateSeriesCache: {},
  balanceCacheKey: {},
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
          ...initialState.ratesCacheKey,
          [DEFAULT_DATE_RANGE]: Date.now(),
        },
        lastDayRates: {...initialState.lastDayRates, ...lastDayRates},
      };
    }

    case RateActionTypes.UPSERT_FIAT_RATE_SERIES_CACHE: {
      const {updates} = action.payload;
      const fiatRateSeriesCache = {
        ...state.fiatRateSeriesCache,
        ...updates,
      };

      const lastFetchedByFiat: Record<string, number> = {};
      for (const [cacheKey, series] of Object.entries(fiatRateSeriesCache)) {
        const fiatCode = getFiatCodeFromSeriesCacheKey(cacheKey);
        if (!fiatCode) {
          continue;
        }
        const fetchedOn = (series as any)?.fetchedOn;
        if (typeof fetchedOn !== 'number') {
          continue;
        }
        const prev = lastFetchedByFiat[fiatCode];
        if (!prev || fetchedOn > prev) {
          lastFetchedByFiat[fiatCode] = fetchedOn;
        }
      }

      const fiatsByRecent = Object.entries(lastFetchedByFiat)
        .sort((a, b) => b[1] - a[1])
        .slice(0, FIAT_RATE_SERIES_MAX_FIATS_PERSISTED)
        .map(([fiat]) => fiat);
      const keepFiats = new Set(fiatsByRecent);

      const prunedFiatRateSeriesCache: FiatRateSeriesCache = {};
      for (const [cacheKey, series] of Object.entries(fiatRateSeriesCache)) {
        const fiatCode = getFiatCodeFromSeriesCacheKey(cacheKey);
        if (!fiatCode || keepFiats.has(fiatCode)) {
          prunedFiatRateSeriesCache[cacheKey] = series;
        }
      }

      return {
        ...state,
        fiatRateSeriesCache: prunedFiatRateSeriesCache,
      };
    }

    case RateActionTypes.UPDATE_CACHE_KEY: {
      const {cacheKey, dateRange = DEFAULT_DATE_RANGE} = action.payload;
      return {
        ...state,
        [cacheKey]: {...initialState.ratesCacheKey, [dateRange]: Date.now()},
      };
    }

    default:
      return state;
  }
};

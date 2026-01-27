import {
  MarketStatsActionType,
  MarketStatsActionTypes,
} from './market-stats.types';
import {MarketStatsState} from './market-stats.models';

type MarketStatsReduxPersistBlackList = string[];
export const marketStatsReduxPersistBlackList: MarketStatsReduxPersistBlackList =
  [];

const initialState: MarketStatsState = {
  itemsByKey: {},
  lastFetchedByKey: {},
};

export const marketStatsReducer = (
  state: MarketStatsState = initialState,
  action: MarketStatsActionType,
): MarketStatsState => {
  switch (action.type) {
    case MarketStatsActionTypes.UPDATE_MARKET_STATS: {
      const {key, data} = action.payload;
      return {
        ...state,
        itemsByKey: {
          ...state.itemsByKey,
          [key]: data,
        },
        lastFetchedByKey: {
          ...state.lastFetchedByKey,
          [key]: Date.now(),
        },
      };
    }

    default:
      return state;
  }
};

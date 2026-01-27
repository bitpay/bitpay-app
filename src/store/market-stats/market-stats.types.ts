import {MarketStatsItem} from './market-stats.models';

export enum MarketStatsActionTypes {
  UPDATE_MARKET_STATS = 'MARKET_STATS/UPDATE_MARKET_STATS',
}

export interface UpdateMarketStatsAction {
  type: typeof MarketStatsActionTypes.UPDATE_MARKET_STATS;
  payload: {
    key: string;
    data: MarketStatsItem;
  };
}

export type MarketStatsActionType = UpdateMarketStatsAction;

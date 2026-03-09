import {MarketStatsItem} from './market-stats.models';
import {
  MarketStatsActionType,
  MarketStatsActionTypes,
} from './market-stats.types';

export const updateMarketStats = (payload: {
  key: string;
  data: MarketStatsItem;
}): MarketStatsActionType => ({
  type: MarketStatsActionTypes.UPDATE_MARKET_STATS,
  payload,
});

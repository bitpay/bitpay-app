import axios from 'axios';
import {Effect} from '../index';
import {BASE_BWS_URL} from '../../constants/config';
import {logManager} from '../../managers/LogManager';
import {updateMarketStats} from './market-stats.actions';
import {MarketStatsItem} from './market-stats.models';

const MARKET_STATS_BASE_URL = `${BASE_BWS_URL}/v1/marketstats`;

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  return value != null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
};

export const getMarketStatsCacheKey = (params: {
  fiatCode: string;
  coin: string;
}): string => {
  return `${(params.fiatCode || '').toUpperCase()}:${(
    params.coin || ''
  ).toLowerCase()}`;
};

export const fetchMarketStats =
  (params: {
    fiatCode: string;
    coin: string;
    chain?: string;
    tokenAddress?: string;
  }): Effect<Promise<MarketStatsItem | null>> =>
  async dispatch => {
    const fiatCode = (params.fiatCode || '').toUpperCase();
    const coin = (params.coin || '').toLowerCase();
    const chain = (params.chain || '').toLowerCase();
    const tokenAddress = params.tokenAddress || '';
    const key = getMarketStatsCacheKey({fiatCode, coin});

    try {
      const chainQuery = chain ? `&chain=${encodeURIComponent(chain)}` : '';
      const tokenAddressQuery = tokenAddress
        ? `&tokenAddress=${encodeURIComponent(tokenAddress)}`
        : '';
      const url = `${MARKET_STATS_BASE_URL}/${fiatCode}?coin=${coin}${chainQuery}${tokenAddressQuery}`;
      logManager.info(`fetchMarketStats: get request to: ${url}`);
      const {data} = await axios.get(url);
      const payloadArray = Array.isArray(data) ? data : [];
      const payload = asRecord(payloadArray[0]);

      if (!payload) {
        logManager.warn(
          `fetchMarketStats: empty payload for ${fiatCode}/${coin}`,
        );
        return null;
      }

      dispatch(updateMarketStats({key, data: payload}));
      return payload;
    } catch (err) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.warn(`fetchMarketStats: failed - ${errStr}`);
      return null;
    }
  };

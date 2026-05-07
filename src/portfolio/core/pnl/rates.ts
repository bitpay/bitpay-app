import type {FiatRateInterval, FiatRateSeriesCache} from '../fiatRatesShared';
import {getFiatRateSeriesCacheKey} from '../fiatRatesShared';
import type {FiatRateLookup} from './fiatRateLookupCore';
import {createFiatRateLookupCore} from './fiatRateLookupCore';

export {
  getFiatRateAssetRef,
  normalizeFiatRateSeriesCoin,
} from '../fiatRateIdentity';

export type {FiatRateLookup};

export const createFiatRateLookup = (args: {
  quoteCurrency: string;
  coin: string;
  chain?: string;
  tokenAddress?: string;
  cache: FiatRateSeriesCache;
  nowMs: number;
}): FiatRateLookup => {
  'worklet';

  const {quoteCurrency, coin, chain, tokenAddress, cache, nowMs} = args;

  return createFiatRateLookupCore({
    cache,
    nowMs,
    getCacheKey: (interval: FiatRateInterval) => {
      'worklet';

      return getFiatRateSeriesCacheKey(quoteCurrency, coin, interval, {
        chain,
        tokenAddress,
      });
    },
  });
};

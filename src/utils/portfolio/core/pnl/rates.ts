import type {
  FiatRateInterval,
  FiatRateSeriesCache,
  FiatRateSeriesReaderIdentity,
} from '../fiatRateSeries';
import {getFiatRateSeriesCacheKey} from '../fiatRateSeries';
import type {FiatRateLookup} from '../../../../portfolio/core/pnl/fiatRateLookupCore';
import {createFiatRateLookupCore} from '../../../../portfolio/core/pnl/fiatRateLookupCore';
import {normalizeFiatRateSeriesCoin} from '../../../../portfolio/core/fiatRateIdentity';

export {normalizeFiatRateSeriesCoin};
export type {FiatRateLookup};

const createDirectFiatRateLookup = (args: {
  quoteCurrency: string;
  coin: string;
  cache: FiatRateSeriesCache;
  nowMs: number;
  chain?: string;
  tokenAddress?: string;
}): FiatRateLookup => {
  const {quoteCurrency, coin, cache, nowMs, chain, tokenAddress} = args;
  const identity: FiatRateSeriesReaderIdentity | undefined =
    chain || tokenAddress
      ? {
          chain,
          tokenAddress,
        }
      : undefined;

  return createFiatRateLookupCore({
    cache,
    nowMs,
    getCacheKey: (interval: FiatRateInterval) =>
      getFiatRateSeriesCacheKey(quoteCurrency, coin, interval, identity),
  });
};

export const createFiatRateLookup = (args: {
  quoteCurrency: string;
  coin: string;
  cache: FiatRateSeriesCache;
  nowMs: number;
  bridgeQuoteCurrency?: string;
  chain?: string;
  tokenAddress?: string;
}): FiatRateLookup => {
  const {
    quoteCurrency,
    coin,
    cache,
    nowMs,
    bridgeQuoteCurrency,
    chain,
    tokenAddress,
  } = args;
  const normalizedCoin = normalizeFiatRateSeriesCoin(coin);
  const directLookup = createDirectFiatRateLookup({
    quoteCurrency,
    coin: normalizedCoin,
    cache,
    nowMs,
    chain,
    tokenAddress,
  });

  const quoteCurrencyUpper = (quoteCurrency || '').toUpperCase();
  const bridgeQuoteCurrencyUpper = (bridgeQuoteCurrency || '').toUpperCase();

  // Optional BTC-bridge fallback: if the requested series is missing for this
  // quoteCurrency+coin, synthesize it from a fully-cached bridgeQuoteCurrency.
  //
  // coin@source = coin@bridge * (BTC@source / BTC@bridge)
  const canBridge =
    !!bridgeQuoteCurrencyUpper &&
    bridgeQuoteCurrencyUpper !== quoteCurrencyUpper &&
    normalizedCoin !== 'btc';

  let bridgeCoinLookup: FiatRateLookup | null = null;
  let bridgeBtcLookup: FiatRateLookup | null = null;
  let sourceBtcLookup: FiatRateLookup | null = null;

  const getBridgeCoinLookup = (): FiatRateLookup => {
    if (!bridgeCoinLookup) {
      bridgeCoinLookup = createFiatRateLookup({
        quoteCurrency: bridgeQuoteCurrencyUpper,
        coin: normalizedCoin,
        cache,
        nowMs,
        chain,
        tokenAddress,
      });
    }
    return bridgeCoinLookup;
  };

  const getBridgeBtcLookup = (): FiatRateLookup => {
    if (!bridgeBtcLookup) {
      bridgeBtcLookup = createFiatRateLookup({
        quoteCurrency: bridgeQuoteCurrencyUpper,
        coin: 'btc',
        cache,
        nowMs,
      });
    }
    return bridgeBtcLookup;
  };

  const getSourceBtcLookup = (): FiatRateLookup => {
    if (!sourceBtcLookup) {
      sourceBtcLookup = createFiatRateLookup({
        quoteCurrency: quoteCurrencyUpper,
        coin: 'btc',
        cache,
        nowMs,
      });
    }
    return sourceBtcLookup;
  };

  return {
    getNearestRate: (targetTsMs: number) => {
      const directRate = directLookup.getNearestRate(targetTsMs);
      if (typeof directRate === 'number' && Number.isFinite(directRate)) {
        return directRate;
      }

      if (!canBridge) {
        return undefined;
      }

      const bridgeCoinRate = getBridgeCoinLookup().getNearestRate(targetTsMs);
      const bridgeBtcRate = getBridgeBtcLookup().getNearestRate(targetTsMs);
      const sourceBtcRate = getSourceBtcLookup().getNearestRate(targetTsMs);

      if (
        typeof bridgeCoinRate !== 'number' ||
        !Number.isFinite(bridgeCoinRate) ||
        bridgeCoinRate <= 0 ||
        typeof bridgeBtcRate !== 'number' ||
        !Number.isFinite(bridgeBtcRate) ||
        bridgeBtcRate <= 0 ||
        typeof sourceBtcRate !== 'number' ||
        !Number.isFinite(sourceBtcRate) ||
        sourceBtcRate <= 0
      ) {
        return undefined;
      }

      const fxRatio = sourceBtcRate / bridgeBtcRate;
      const out = bridgeCoinRate * fxRatio;
      return Number.isFinite(out) && out > 0 ? out : undefined;
    },
  };
};

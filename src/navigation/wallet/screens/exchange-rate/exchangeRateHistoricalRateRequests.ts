import type {FiatRateCacheRequest} from '../../../../portfolio/core/fiatRatesShared';
import {
  CANONICAL_FIAT_QUOTE,
  FX_BRIDGE_COIN,
  type FiatRateInterval,
} from '../../../../portfolio/core/fiatRatesShared';
import {
  getFiatRateAssetRef,
  getFiatRateAssetRequestKey,
} from '../../../../portfolio/core/fiatRateIdentity';

export type ExchangeRateHistoricalRateRequestGroups = {
  canonicalQuoteCurrency: string;
  canonicalRequests: FiatRateCacheRequest[];
  displayQuoteCurrency: string;
  displayQuoteRequests: FiatRateCacheRequest[];
};

const normalizeQuoteCurrency = (quoteCurrency?: string): string => {
  return (
    String(quoteCurrency || '')
      .trim()
      .toUpperCase() || CANONICAL_FIAT_QUOTE
  );
};

const normalizeIntervals = (
  intervals: ReadonlyArray<FiatRateInterval> | undefined,
): FiatRateInterval[] => {
  return Array.from(new Set(intervals || [])).sort((a, b) =>
    a.localeCompare(b),
  );
};

const dedupeRequests = (
  requests: Array<FiatRateCacheRequest | undefined>,
): FiatRateCacheRequest[] => {
  const out: FiatRateCacheRequest[] = [];
  const seen = new Set<string>();

  for (const request of requests) {
    if (!request?.coin || !request.intervals?.length) {
      continue;
    }

    const asset = getFiatRateAssetRef({
      currencyAbbreviation: request.coin,
      chain: request.chain,
      tokenAddress: request.tokenAddress,
    });
    const key = getFiatRateAssetRequestKey(asset);
    if (!asset.coin || seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push({
      coin: asset.coin,
      ...(asset.chain ? {chain: asset.chain} : {}),
      ...(asset.tokenAddress ? {tokenAddress: asset.tokenAddress} : {}),
      intervals: normalizeIntervals(request.intervals),
    });
  }

  return out;
};

export const buildExchangeRateHistoricalRateRequestGroups = (args: {
  quoteCurrency: string;
  normalizedCoin: string;
  intervals: ReadonlyArray<FiatRateInterval>;
  historicalRateIdentity?: {
    chain?: string;
    tokenAddress?: string;
  };
  hasValidNormalizedCoin: boolean;
}): ExchangeRateHistoricalRateRequestGroups => {
  const displayQuoteCurrency = normalizeQuoteCurrency(args.quoteCurrency);
  const intervals = normalizeIntervals(args.intervals);
  const emptyGroups = {
    canonicalQuoteCurrency: CANONICAL_FIAT_QUOTE,
    canonicalRequests: [],
    displayQuoteCurrency,
    displayQuoteRequests: [],
  };

  if (
    !args.hasValidNormalizedCoin ||
    !String(args.normalizedCoin || '').trim() ||
    !intervals.length
  ) {
    return emptyGroups;
  }

  const assetRequest: FiatRateCacheRequest = {
    coin: args.normalizedCoin,
    ...(args.historicalRateIdentity?.chain
      ? {chain: args.historicalRateIdentity.chain}
      : {}),
    ...(args.historicalRateIdentity?.tokenAddress
      ? {tokenAddress: args.historicalRateIdentity.tokenAddress}
      : {}),
    intervals,
  };
  const needsFxBridge = displayQuoteCurrency !== CANONICAL_FIAT_QUOTE;
  const bridgeRequest: FiatRateCacheRequest = {
    coin: FX_BRIDGE_COIN,
    intervals,
  };

  return {
    canonicalQuoteCurrency: CANONICAL_FIAT_QUOTE,
    canonicalRequests: dedupeRequests([
      assetRequest,
      needsFxBridge ? bridgeRequest : undefined,
    ]),
    displayQuoteCurrency,
    displayQuoteRequests: needsFxBridge ? dedupeRequests([bridgeRequest]) : [],
  };
};

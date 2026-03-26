import {type AssetRowItem} from '../../../../utils/portfolio/assets';
import type {
  CachedFiatRateInterval,
  FiatRateSeriesCache,
} from '../../../../store/rate/rate.models';
import {
  getFiatRateSeriesAssetKey,
  hasValidSeriesForCoin,
} from '../../../../store/rate/rate.models';
import {normalizeFiatRateSeriesCoin} from '../../../../utils/portfolio/core/pnl/rates';
import {
  normalizeFiatRateSeriesChain,
  normalizeFiatRateSeriesTokenAddress,
} from '../../../../utils/portfolio/core/fiatRateSeries';

export type HistoricalRateAssetRequest = {
  requestKey: string;
  coin: string;
  chain?: string;
  tokenAddress?: string;
};

export type HistoricalRateAssetIdentityInput = Pick<
  AssetRowItem,
  'currencyAbbreviation' | 'chain' | 'tokenAddress'
>;

const normalizeHistoricalRateAssetIdentity = (
  identity: HistoricalRateAssetIdentityInput,
):
  | {
      currencyAbbreviation: string;
      chain?: string;
      tokenAddress?: string;
    }
  | undefined => {
  const coin = normalizeFiatRateSeriesCoin(identity.currencyAbbreviation);
  if (!coin) {
    return undefined;
  }

  const rawTokenAddress =
    String(identity.tokenAddress || '').trim() || undefined;
  const chain = rawTokenAddress
    ? normalizeFiatRateSeriesChain(identity.chain)
    : undefined;
  const tokenAddress = normalizeFiatRateSeriesTokenAddress(
    chain,
    rawTokenAddress,
  );

  return {
    currencyAbbreviation: coin,
    ...(chain ? {chain} : {}),
    ...(tokenAddress ? {tokenAddress} : {}),
  };
};

export const getHistoricalRateAssetRequestKey = (args: {
  fiatCode: string;
  coin: string;
  chain?: string;
  tokenAddress?: string;
}): string => {
  const assetKey = getFiatRateSeriesAssetKey(args.coin, {
    chain: args.chain,
    tokenAddress: args.tokenAddress,
  });
  if (!assetKey) {
    return '';
  }

  return `${(args.fiatCode || 'USD').toUpperCase()}:${assetKey}`;
};

export const getHistoricalRateAssetRequestFromItem = (
  item: HistoricalRateAssetIdentityInput,
  fiatCode: string,
): HistoricalRateAssetRequest | undefined => {
  const normalized = normalizeHistoricalRateAssetIdentity(item);
  if (!normalized) {
    return undefined;
  }

  const requestKey = getHistoricalRateAssetRequestKey({
    fiatCode,
    coin: normalized.currencyAbbreviation,
    chain: normalized.chain,
    tokenAddress: normalized.tokenAddress,
  });

  if (!requestKey) {
    return undefined;
  }

  return {
    requestKey,
    coin: normalized.currencyAbbreviation,
    chain: normalized.chain,
    tokenAddress: normalized.tokenAddress,
  };
};

export const hasHistoricalRateSeriesForAsset = (args: {
  cache: FiatRateSeriesCache | undefined;
  fiatCode: string;
  intervals: ReadonlyArray<CachedFiatRateInterval>;
  coin: string;
  chain?: string;
  tokenAddress?: string;
}): boolean => {
  return hasValidSeriesForCoin({
    cache: args.cache,
    fiatCodeUpper: (args.fiatCode || 'USD').toUpperCase(),
    normalizedCoin: args.coin,
    intervals: args.intervals,
    chain: args.chain,
    tokenAddress: args.tokenAddress,
  });
};

export const getMissingHistoricalRateAssetRequests = (args: {
  fiatCode: string;
  items: HistoricalRateAssetIdentityInput[];
  cache: FiatRateSeriesCache | undefined;
  intervals: ReadonlyArray<CachedFiatRateInterval>;
}): HistoricalRateAssetRequest[] => {
  const requestsByKey = new Map<string, HistoricalRateAssetRequest>();

  for (const item of args.items) {
    const request = getHistoricalRateAssetRequestFromItem(item, args.fiatCode);
    if (!request) {
      continue;
    }

    if (
      hasHistoricalRateSeriesForAsset({
        cache: args.cache,
        fiatCode: args.fiatCode,
        intervals: args.intervals,
        coin: request.coin,
        chain: request.chain,
        tokenAddress: request.tokenAddress,
      })
    ) {
      continue;
    }

    requestsByKey.set(request.requestKey, request);
  }

  return Array.from(requestsByKey.values()).sort((a, b) =>
    a.requestKey.localeCompare(b.requestKey),
  );
};

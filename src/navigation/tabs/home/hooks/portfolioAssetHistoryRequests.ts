import {type AssetRowItem} from '../../../../utils/portfolio/assets';
import {getFiatRateSeriesAssetKey} from '../../../../store/rate/rate.models';
import {getFiatRateAssetRef} from '../../../../portfolio/core/fiatRateIdentity';

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
  const asset = getFiatRateAssetRef({
    currencyAbbreviation: identity.currencyAbbreviation,
    chain: identity.chain,
    tokenAddress: identity.tokenAddress,
  });
  if (!asset.coin) {
    return undefined;
  }

  return {
    currencyAbbreviation: asset.coin,
    ...(asset.chain ? {chain: asset.chain} : {}),
    ...(asset.tokenAddress ? {tokenAddress: asset.tokenAddress} : {}),
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

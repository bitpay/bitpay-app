import {useCallback} from 'react';
import {ImageRequireSource} from 'react-native';
import type {SupportedCurrencyOption} from '../../../../constants/SupportedCurrencyOptions';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {
  BitpaySupportedTokenOptsByAddress,
  type TokenOptsType,
} from '../../../../constants/tokens';
import {useTokenContext} from '../../../../contexts';
import {addTokenChainSuffix} from '../../../../utils/helper-methods';
import {createSupportedCurrencyOptionLookup} from '../../../../utils/portfolio/supportedCurrencyOptionsLookup';
import useAppSelector from '../../../../utils/hooks/useAppSelector';

export type AssetIconLookupArgs = {
  currencyAbbreviation: string;
  chain: string;
  tokenAddress?: string;
};

export type AssetIconData = {
  img?: SupportedCurrencyOption['img'];
  imgSrc?: ImageRequireSource;
};

const supportedOptionLookup = createSupportedCurrencyOptionLookup(
  SupportedCurrencyOptions,
);

const getSupportedOptionForAsset = (
  item: AssetIconLookupArgs,
): SupportedCurrencyOption | undefined => {
  return supportedOptionLookup.getOption({
    currencyAbbreviation: item.currencyAbbreviation,
    chain: item.chain,
    tokenAddress: item.tokenAddress,
  });
};

const toImageRequireSource = (src: unknown): ImageRequireSource | undefined => {
  return typeof src === 'number' ? (src as ImageRequireSource) : undefined;
};

/**
 * Pure resolver to determine what icon data to show for an asset row.
 * - Supported assets: use supported option svg (img) + local png (imgSrc).
 * - Custom/unknown tokens: use token logoURI (img) when available.
 * - Token option precedence: custom > token context > BitPay-supported tokens.
 */
export const resolveAssetIconData = (args: {
  item: AssetIconLookupArgs;
  getSupportedOption: (
    item: AssetIconLookupArgs,
  ) => SupportedCurrencyOption | undefined;
  tokenOptionsByAddress?: TokenOptsType;
  customTokenOptionsByAddress?: TokenOptsType;
  bitpayTokenOptionsByAddress?: TokenOptsType;
}): AssetIconData => {
  const option = args.getSupportedOption(args.item);

  const tokenKey = args.item.tokenAddress
    ? addTokenChainSuffix(args.item.tokenAddress, args.item.chain)
    : undefined;

  const tokenOpt = tokenKey
    ? args.customTokenOptionsByAddress?.[tokenKey] ??
      args.tokenOptionsByAddress?.[tokenKey] ??
      args.bitpayTokenOptionsByAddress?.[tokenKey]
    : undefined;

  return {
    img: option?.img ?? tokenOpt?.logoURI,
    imgSrc: toImageRequireSource(option?.imgSrc),
  };
};

export const useAssetIconResolver = () => {
  const {tokenOptionsByAddress} = useTokenContext();
  const customTokenOptionsByAddress = useAppSelector(
    ({WALLET}) => WALLET.customTokenOptionsByAddress,
  );

  const getSupportedOption = useCallback(
    (item: AssetIconLookupArgs): SupportedCurrencyOption | undefined => {
      return getSupportedOptionForAsset(item);
    },
    [],
  );

  const getAssetIconData = useCallback(
    (item: AssetIconLookupArgs): AssetIconData => {
      return resolveAssetIconData({
        item,
        getSupportedOption,
        tokenOptionsByAddress,
        customTokenOptionsByAddress,
        bitpayTokenOptionsByAddress: BitpaySupportedTokenOptsByAddress,
      });
    },
    [customTokenOptionsByAddress, getSupportedOption, tokenOptionsByAddress],
  );

  return {
    getAssetIconData,
    getSupportedOption,
  };
};

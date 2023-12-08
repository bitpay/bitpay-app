import {Effect} from '../..';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
  BitpaySupportedUtxoCoins,
} from '../../../constants/currencies';
import {getCurrencyAbbreviation} from '../../../utils/helper-methods';

export const GetProtocolPrefix = (
  network: string = 'livenet',
  chain: string,
): string => {
  return (
    // @ts-ignore
    BitpaySupportedCoins[chain]?.paymentInfo.protocolPrefix[network]
  );
};

export const GetPrecision =
  (
    currencyAbbreviation: string,
    chain: string,
    tokenAddress: string | undefined,
  ): Effect<
    | {
        unitName: string;
        unitToSatoshi: number;
        unitDecimals: number;
        unitCode: string;
      }
    | undefined
  > =>
  (_dispatch, getState) => {
    const {
      WALLET: {tokenDataByAddress, customTokenDataByAddress},
    } = getState();
    const tokens = {
      ...tokenDataByAddress,
      ...customTokenDataByAddress,
      ...BitpaySupportedTokens,
    };
    const currencyName = getCurrencyAbbreviation(
      tokenAddress ? tokenAddress : currencyAbbreviation,
      chain,
    );
    return (
      BitpaySupportedCoins[currencyName]?.unitInfo ||
      tokens[currencyName]?.unitInfo
    );
  };

export const IsUtxoCoin = (currencyAbbreviation: string): boolean => {
  return Object.keys(BitpaySupportedUtxoCoins).includes(
    currencyAbbreviation.toLowerCase(),
  );
};

export const IsCustomERCToken = (
  tokenAddress: string | undefined,
  chain: string,
) => {
  if (!tokenAddress) {
    return false;
  }
  const tokenAddressWithSuffix = getCurrencyAbbreviation(tokenAddress, chain);
  return !BitpaySupportedTokens[tokenAddressWithSuffix.toLowerCase()];
};

export const IsERCToken = (
  currencyAbbreviation: string,
  chain: string,
): boolean => {
  return currencyAbbreviation.toLowerCase() !== chain.toLowerCase();
};

export const GetBlockExplorerUrl = (
  network: string = 'livenet',
  chain: string,
): string => {
  return network === 'livenet'
    ? BitpaySupportedCoins[chain]?.paymentInfo.blockExplorerUrls
    : BitpaySupportedCoins[chain]?.paymentInfo.blockExplorerUrlsTestnet;
};

export const GetFeeUnits = (
  chain: string,
): {
  feeUnit: string;
  feeUnitAmount: number;
  blockTime: number;
  maxMerchantFee: string;
} => {
  return BitpaySupportedCoins[chain]?.feeInfo;
};

export const GetTheme = (
  chain: string,
):
  | {
      coinColor: string;
      backgroundColor: string;
      gradientBackgroundColor: string;
    }
  | undefined => {
  return BitpaySupportedCoins[chain.toLowerCase()]?.theme;
};

export const GetName =
  (
    currencyAbbreviation: string,
    chain: string,
    tokenAddress?: string | undefined,
  ): Effect<string> =>
  (_dispatch, getState) => {
    const {
      WALLET: {tokenDataByAddress, customTokenDataByAddress},
    } = getState();
    const tokens = {
      ...tokenDataByAddress,
      ...customTokenDataByAddress,
      ...BitpaySupportedTokens,
    };
    const currencyName = getCurrencyAbbreviation(
      tokenAddress ? tokenAddress : currencyAbbreviation,
      chain,
    );
    return (
      BitpaySupportedCoins[currencyName]?.name || tokens[currencyName]?.name
    );
  };

export const isSingleAddressChain = (chain: string): boolean => {
  return BitpaySupportedCoins[chain]?.properties.singleAddress;
};

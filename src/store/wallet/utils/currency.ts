import {Effect} from '../..';
import {SupportedCoinsOptions} from '../../../constants/SupportedCurrencyOptions';
import {
  BitpaySupportedCoins,
  BitpaySupportedEvmCoins,
  BitpaySupportedSvmCoins,
  BitpaySupportedTokens,
  BitpaySupportedUtxoCoins,
  OtherBitpaySupportedCoins,
} from '../../../constants/currencies';
import {
  getCurrencyAbbreviation,
  isL2NoSideChainNetwork,
} from '../../../utils/helper-methods';
import cloneDeep from 'lodash.clonedeep';
import {tokenManager} from '../../../managers/TokenManager';

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
      WALLET: {customTokenDataByAddress},
    } = getState();
    const {tokenDataByAddress} = tokenManager.getTokenOptions();

    const tokens = {
      ...tokenDataByAddress,
      ...customTokenDataByAddress,
      ...BitpaySupportedTokens,
    };
    if (tokenAddress) {
      const currencyName = getCurrencyAbbreviation(
        tokenAddress ? tokenAddress : currencyAbbreviation,
        chain,
      );
      return tokens[currencyName]?.unitInfo;
    } else {
      return BitpaySupportedCoins[chain]?.unitInfo;
    }
  };

export const IsSegwitCoin = (currencyAbbreviation: string = ''): boolean => {
  return ['btc', 'ltc'].includes(currencyAbbreviation.toLowerCase());
};

export const IsTaprootCoin = (currencyAbbreviation: string = ''): boolean => {
  return ['btc'].includes(currencyAbbreviation.toLowerCase());
};

export const IsUtxoChain = (chain: string): boolean => {
  const _chain = cloneDeep(chain).toLowerCase();

  return Object.keys(BitpaySupportedUtxoCoins).includes(_chain);
};

export const IsOtherChain = (chain: string): boolean => {
  const _chain = cloneDeep(chain).toLowerCase();

  return Object.keys(OtherBitpaySupportedCoins).includes(_chain);
};

export const IsVMChain = (chain: string): boolean => {
  const _chain = cloneDeep(chain).toLowerCase();
  return Object.keys(BitpaySupportedEvmCoins)
    .concat(Object.keys(BitpaySupportedSvmCoins))
    .includes(_chain); // TODO: review all IsEVMChain and see if we should use IsVMChain
};

export const IsEVMChain = (chain: string): boolean => {
  const _chain = cloneDeep(chain).toLowerCase();
  return Object.keys(BitpaySupportedEvmCoins).includes(_chain);
};

export const IsSVMChain = (chain: string): boolean => {
  const _chain = cloneDeep(chain).toLowerCase();

  return Object.keys(BitpaySupportedSvmCoins).includes(_chain);
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

// Logic for checking token standards like ERC20 or SLP - Let's keep the name for simplicity
export const IsERCToken = (
  currencyAbbreviation: string,
  chain: string,
): boolean => {
  const _currencyAbbreviation = cloneDeep(currencyAbbreviation)?.toLowerCase();
  const _chain = chain.toLowerCase();

  if (_currencyAbbreviation === 'pol' && _chain === 'matic') {
    return false;
  }

  return (
    (_currencyAbbreviation !== _chain && _currencyAbbreviation !== 'eth') ||
    (isL2NoSideChainNetwork(_chain) && _currencyAbbreviation === _chain)
  );
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
      WALLET: {customTokenDataByAddress},
    } = getState();
    const {tokenDataByAddress} = tokenManager.getTokenOptions();
    const tokens = {
      ...tokenDataByAddress,
      ...customTokenDataByAddress,
      ...BitpaySupportedTokens,
    };
    if (tokenAddress) {
      const currencyName = getCurrencyAbbreviation(
        tokenAddress ? tokenAddress : currencyAbbreviation,
        chain,
      );
      return tokens[currencyName]?.name;
    } else {
      const coin = SupportedCoinsOptions.find(
        ({chain: _chain}) => _chain === chain,
      );
      return coin?.currencyName || BitpaySupportedCoins[chain]?.name;
    }
  };

export const isSingleAddressChain = (chain: string): boolean => {
  return BitpaySupportedCoins[chain]?.properties.singleAddress;
};

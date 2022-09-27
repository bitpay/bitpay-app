import {Effect} from '../..';
import {
  BitpaySupportedCoins,
  BitpaySupportedEthereumTokens,
  SUPPORTED_COINS,
} from '../../../constants/currencies';

export const GetProtocolPrefix =
  (
    currencyAbbreviation: string,
    network: string = 'livenet',
    chain: string,
  ): Effect<string> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();

    let tokens;
    const currency = currencyAbbreviation.toLowerCase();
    if (IsERCToken(currencyAbbreviation)) {
      switch (chain) {
        case 'eth':
          tokens = {...tokenData, ...customTokenData};
          return (
            // @ts-ignore
            BitpaySupportedEthereumTokens[currency]?.paymentInfo.protocolPrefix[
              network
            ] ||
            // @ts-ignore
            tokens[currency]?.paymentInfo.protocolPrefix[network]
          );
      }
    }
    // @ts-ignore
    return BitpaySupportedCoins[currency]?.paymentInfo.protocolPrefix[network];
  };

export const GetPrecision =
  (
    currencyAbbreviation: string,
    chain: string,
  ): Effect<
    | {
        unitName: string;
        unitToSatoshi: number;
        unitDecimals: number;
        unitCode: string;
      }
    | undefined
  > =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();

    let tokens;
    const currency = currencyAbbreviation.toLowerCase();
    if (IsERCToken(currencyAbbreviation)) {
      switch (chain) {
        case 'eth':
          tokens = {...tokenData, ...customTokenData};
          return (
            BitpaySupportedEthereumTokens[currency]?.unitInfo ||
            tokens[currency]?.unitInfo
          );
      }
    }
    return BitpaySupportedCoins[currency]?.unitInfo;
  };

export const IsUtxoCoin = (currencyAbbreviation: string): boolean => {
  return ['btc', 'bch', 'doge', 'ltc'].includes(
    currencyAbbreviation.toLowerCase(),
  );
};

export const IsCustomERCToken = (currencyAbbreviation: string) => {
  return (
    !BitpaySupportedCoins[currencyAbbreviation.toLowerCase()] ||
    !BitpaySupportedEthereumTokens[currencyAbbreviation.toLowerCase()]
  );
};

export const IsERCToken = (currencyAbbreviation: string): boolean => {
  const currency = currencyAbbreviation.toLowerCase();
  return !SUPPORTED_COINS.includes(currency);
};

export const GetBlockExplorerUrl =
  (
    currencyAbbreviation: string,
    network: string = 'livenet',
    chain: string,
  ): Effect<string> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();

    let tokens;
    const currency = currencyAbbreviation.toLowerCase();
    if (IsERCToken(currencyAbbreviation)) {
      switch (chain) {
        case 'eth':
          tokens = {...tokenData, ...customTokenData};
          return network === 'livenet'
            ? BitpaySupportedEthereumTokens[currency]?.paymentInfo
                .blockExplorerUrls ||
                tokens[currency]?.paymentInfo.blockExplorerUrls
            : BitpaySupportedEthereumTokens[currency]?.paymentInfo
                .blockExplorerUrlsTestnet ||
                tokens[currency]?.paymentInfo.blockExplorerUrlsTestnet;
      }
    }
    return network === 'livenet'
      ? BitpaySupportedCoins[currency]?.paymentInfo.blockExplorerUrls
      : BitpaySupportedCoins[currency]?.paymentInfo.blockExplorerUrlsTestnet;
  };

export const GetFeeUnits =
  (
    currencyAbbreviation: string,
    chain: string,
  ): Effect<{
    feeUnit: string;
    feeUnitAmount: number;
    blockTime: number;
    maxMerchantFee: string;
  }> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    let tokens;
    const currency = currencyAbbreviation.toLowerCase();
    if (IsERCToken(currencyAbbreviation)) {
      switch (chain) {
        case 'eth':
          tokens = {...tokenData, ...customTokenData};
          return (
            BitpaySupportedEthereumTokens[currency]?.feeInfo ||
            tokens[currency]?.feeInfo
          );
      }
    }
    return BitpaySupportedCoins[currency]?.feeInfo;
  };

export const GetTheme =
  (
    currencyAbbreviation: string,
    chain: string,
  ): Effect<{
    coinColor: string;
    backgroundColor: string;
    gradientBackgroundColor: string;
  }> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    let tokens;
    const currency = currencyAbbreviation.toLowerCase();
    if (IsERCToken(currencyAbbreviation)) {
      switch (chain) {
        case 'eth':
          tokens = {...tokenData, ...customTokenData};
          return (
            BitpaySupportedEthereumTokens[currency]?.theme ||
            tokens[currency]?.theme
          );
      }
    }
    return BitpaySupportedCoins[currency]?.theme;
  };

export const GetName =
  (currencyAbbreviation: string, chain: string): Effect<string> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    let tokens;
    const currency = currencyAbbreviation.toLowerCase();
    if (IsERCToken(currencyAbbreviation)) {
      switch (chain) {
        case 'eth':
          tokens = {...tokenData, ...customTokenData};
          return (
            BitpaySupportedEthereumTokens[currency]?.name ||
            tokens[currency]?.name
          );
      }
    }
    return BitpaySupportedCoins[currency]?.name;
  };

export const isSingleAddressCoin =
  (currencyAbbreviation: string, chain: string): Effect<boolean> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    let tokens;
    const currency = currencyAbbreviation.toLowerCase();
    if (IsERCToken(currencyAbbreviation)) {
      switch (chain) {
        case 'eth':
          tokens = {...tokenData, ...customTokenData};
          return (
            BitpaySupportedEthereumTokens[currency]?.properties.singleAddress ||
            tokens[currency]?.properties.singleAddress
          );
      }
    }
    return BitpaySupportedCoins[currency]?.properties.singleAddress;
  };

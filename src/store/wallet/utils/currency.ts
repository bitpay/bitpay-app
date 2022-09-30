import {Effect} from '../..';
import {
  BitpaySupportedCurrencies,
  SUPPORTED_COINS,
} from '../../../constants/currencies';
import {getCurrencyAbbreviation} from '../../../utils/helper-methods';

export const GetProtocolPrefix =
  (
    currencyAbbreviation: string,
    network: string = 'livenet',
    chain: string,
  ): Effect<string> =>
  (_dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currencyName = getCurrencyAbbreviation(currencyAbbreviation, chain);

    return (
      // @ts-ignore
      BitpaySupportedCurrencies[currencyName]?.paymentInfo.protocolPrefix[
        network
      ] ||
      // @ts-ignore
      tokens[currencyName]?.paymentInfo.protocolPrefix[network]
    );
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
  (_dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currencyName = getCurrencyAbbreviation(currencyAbbreviation, chain);

    return (
      BitpaySupportedCurrencies[currencyName]?.unitInfo ||
      tokens[currencyName]?.unitInfo
    );
  };

export const IsUtxoCoin = (currencyAbbreviation: string): boolean => {
  return ['btc', 'bch', 'doge', 'ltc'].includes(
    currencyAbbreviation.toLowerCase(),
  );
};

export const IsCustomERCToken = (currencyAbbreviation: string) => {
  return !BitpaySupportedCurrencies[currencyAbbreviation.toLowerCase()];
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
  (_dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currencyName = getCurrencyAbbreviation(currencyAbbreviation, chain);

    return network === 'livenet'
      ? BitpaySupportedCurrencies[currencyName]?.paymentInfo
          .blockExplorerUrls ||
          tokens[currencyName]?.paymentInfo.blockExplorerUrls
      : BitpaySupportedCurrencies[currencyName]?.paymentInfo
          .blockExplorerUrlsTestnet ||
          tokens[currencyName]?.paymentInfo.blockExplorerUrlsTestnet;
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
  (_dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currencyName = getCurrencyAbbreviation(currencyAbbreviation, chain);

    return (
      BitpaySupportedCurrencies[currencyName]?.feeInfo ||
      tokens[currencyName]?.feeInfo
    );
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
  (_dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currencyName = getCurrencyAbbreviation(currencyAbbreviation, chain);

    return (
      BitpaySupportedCurrencies[currencyName]?.theme ||
      tokens[currencyName]?.theme
    );
  };

export const GetName =
  (currencyAbbreviation: string, chain: string): Effect<string> =>
  (_dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currencyName = getCurrencyAbbreviation(currencyAbbreviation, chain);

    return (
      BitpaySupportedCurrencies[currencyName]?.name ||
      tokens[currencyName]?.name
    );
  };

export const isSingleAddressCoin =
  (currencyAbbreviation: string, chain: string): Effect<boolean> =>
  (_dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currencyName = getCurrencyAbbreviation(currencyAbbreviation, chain);

    return (
      BitpaySupportedCurrencies[currencyName]?.properties.singleAddress ||
      tokens[currencyName]?.properties.singleAddress
    );
  };

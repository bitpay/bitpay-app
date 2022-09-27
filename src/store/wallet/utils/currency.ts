import {Effect} from '../..';
import {Currencies} from '../../../constants/currencies';

export const GetProtocolPrefix =
  (currencyAbbreviation: string, network: string = 'livenet'): Effect<string> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currency = currencyAbbreviation.toLowerCase();
    return (
      // @ts-ignore
      Currencies[currency]?.paymentInfo.protocolPrefix[network] ||
      // @ts-ignore
      tokens[currency]?.paymentInfo.protocolPrefix[network]
    );
  };

export const GetPrecision =
  (
    currencyAbbreviation: string,
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
    const tokens = {...tokenData, ...customTokenData};
    const currency = getRSKCurrencyAbbrevation(currencyAbbreviation.toLowerCase());
    return Currencies[currency]?.unitInfo || tokens[currency]?.unitInfo;
  };

export const IsUtxoCoin = (currencyAbbreviation: string): boolean => {
  return ['btc', 'bch', 'doge', 'ltc'].includes(
    currencyAbbreviation.toLowerCase(),
  );
};

export const IsCustomERCToken = (currencyAbbreviation: string) => {
  return !Currencies[currencyAbbreviation.toLowerCase()];
};

export const GetChain =
  (currencyAbbreviation: string): Effect<string> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currency = currencyAbbreviation.toLowerCase();
    return Currencies[currency]?.chain || tokens[currency]?.chain;
  };

export const IsERCToken =
  (currencyAbbreviation: string): Effect<boolean> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currency = currencyAbbreviation.toLowerCase();
    return (
      Currencies[currency]?.properties.isERCToken ||
      tokens[currency]?.properties.isERCToken
    );
  };

export const GetBlockExplorerUrl =
  (currencyAbbreviation: string, network: string = 'livenet'): Effect<string> =>
  (dispatch, getState) => {
    currencyAbbreviation = getRSKCurrencyAbbrevation(currencyAbbreviation);
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currency = currencyAbbreviation.toLowerCase();
    return network === 'livenet'
      ? Currencies[currency]?.paymentInfo.blockExplorerUrls ||
          tokens[currency]?.paymentInfo.blockExplorerUrls
      : Currencies[currency]?.paymentInfo.blockExplorerUrlsTestnet ||
          tokens[currency]?.paymentInfo.blockExplorerUrlsTestnet;
  };

export const GetFeeUnits =
  (
    currencyAbbreviation: string,
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
    const tokens = {...tokenData, ...customTokenData};
    const currency = currencyAbbreviation.toLowerCase();
    return Currencies[currency]?.feeInfo || tokens[currency]?.feeInfo;
  };

export const GetTheme =
  (
    currencyAbbreviation: string,
  ): Effect<{
    coinColor: string;
    backgroundColor: string;
    gradientBackgroundColor: string;
  }> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currency = currencyAbbreviation.toLowerCase();
    return Currencies[currency]?.theme || tokens[currency]?.theme;
  };

export const GetName =
  (currencyAbbreviation: string): Effect<string> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currency = currencyAbbreviation.toLowerCase();
    return Currencies[currency]?.name || tokens[currency]?.name;
  };

export const isSingleAddressCoin =
  (currencyAbbreviation: string): Effect<boolean> =>
  (dispatch, getState) => {
    const {
      WALLET: {tokenData, customTokenData},
    } = getState();
    const tokens = {...tokenData, ...customTokenData};
    const currency = currencyAbbreviation.toLowerCase();
    return (
      Currencies[currency]?.properties.singleAddress ||
      tokens[currency]?.properties.singleAddress
    );
  };

  /**
   * In case of rsk chain and currency having different names. 
   * This function will return the currency name for rsk.
   */
  export const getRSKCurrencyAbbrevation = (name: string) => {
    return name === 'rsk' ? 'rbtc': name;
  }

  /**
   * In case of rsk chain and currency having different names.
   * This function will return the chain name for rsk.
   */
  export const getRSKChainAbbrevation = (name: string) => {
    return name === 'rbtc' ? 'rsk': name;
  }

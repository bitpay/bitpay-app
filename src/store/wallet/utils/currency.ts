import {Effect} from '../..';
import {Currencies} from '../../../constants/currencies';

export const GetProtocolPrefix =
  (currencyAbbreviation: string, network: string = 'livenet'): Effect<string> =>
  (dispatch, getState) => {
    const {WALLET} = getState();
    const currency = currencyAbbreviation.toLowerCase();
    return (
      // @ts-ignore
      Currencies[currency]?.paymentInfo.protocolPrefix[network] ||
      // @ts-ignore
      WALLET.tokenData[currency]?.paymentInfo.protocolPrefix[network]
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
    const {WALLET} = getState();
    const currency = currencyAbbreviation.toLowerCase();
    return (
      Currencies[currency]?.unitInfo || WALLET.tokenData[currency]?.unitInfo
    );
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
    const {WALLET} = getState();
    const currency = currencyAbbreviation.toLowerCase();
    return Currencies[currency]?.chain || WALLET.tokenData[currency]?.chain;
  };

export const IsERCToken =
  (currencyAbbreviation: string): Effect<boolean> =>
  (dispatch, getState) => {
    const {WALLET} = getState();
    const currency = currencyAbbreviation.toLowerCase();
    return (
      Currencies[currency]?.properties.isERCToken ||
      WALLET.tokenData[currency]?.properties.isERCToken
    );
  };

export const GetBlockExplorerUrl =
  (currencyAbbreviation: string, network: string = 'livenet'): Effect<string> =>
  (dispatch, getState) => {
    const {WALLET} = getState();
    const currency = currencyAbbreviation.toLowerCase();
    return network === 'livenet'
      ? Currencies[currency]?.paymentInfo.blockExplorerUrls ||
          WALLET.tokenData[currency]?.paymentInfo.blockExplorerUrls
      : Currencies[currency]?.paymentInfo.blockExplorerUrlsTestnet ||
          WALLET.tokenData[currency]?.paymentInfo.blockExplorerUrlsTestnet;
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
    const {WALLET} = getState();
    const currency = currencyAbbreviation.toLowerCase();
    return Currencies[currency]?.feeInfo || WALLET.tokenData[currency]?.feeInfo;
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
    const {WALLET} = getState();
    const currency = currencyAbbreviation.toLowerCase();
    return Currencies[currency]?.theme || WALLET.tokenData[currency]?.theme;
  };

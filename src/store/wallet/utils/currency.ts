import {Currencies, SUPPORTED_TOKENS} from '../../../constants/currencies';

export const GetProtocolPrefix = (
  currency: string,
  network: string = 'livenet',
) => {
  // @ts-ignore
  return Currencies[currency].paymentInfo.protocolPrefix[network];
};

export const GetPrecision = (currencyAbbreviation: string) => {
  return Currencies[currencyAbbreviation.toLowerCase()].unitInfo;
};

export const IsUtxoCoin = (currencyAbbreviation: string): boolean => {
  return ['btc', 'bch', 'doge', 'ltc'].includes(currencyAbbreviation);
};

export const IsCustomERCToken = (currencyAbbreviation: string) => {
  return (
    Currencies[currencyAbbreviation]?.properties.isCustom &&
    !SUPPORTED_TOKENS.includes(currencyAbbreviation)
  );
};

export const GetChain = (currencyAbbreviation: string): string => {
  return Currencies[currencyAbbreviation].chain;
};

export const IsERCToken = (currencyAbbreviation: string): boolean => {
  return Currencies[currencyAbbreviation]?.properties.isERCToken;
};

export const GetBlockExplorerUrl = (
  currencyAbbreviation: string,
  network: string = 'livenet',
): string => {
  return network === 'livenet'
    ? Currencies[currencyAbbreviation]?.paymentInfo.blockExplorerUrls
    : Currencies[currencyAbbreviation]?.paymentInfo.blockExplorerUrlsTestnet;
};

import {Currencies, SUPPORTED_TOKENS} from '../../../constants/currencies';

export const GetProtocolPrefix = (
  currencyAbbreviation: string,
  network: string = 'livenet',
) => {
  // @ts-ignore
  return Currencies[currencyAbbreviation.toLowerCase()].paymentInfo
    .protocolPrefix[network];
};

export const GetPrecision = (currencyAbbreviation: string) => {
  return Currencies[currencyAbbreviation.toLowerCase()].unitInfo;
};

export const IsUtxoCoin = (currencyAbbreviation: string): boolean => {
  return ['btc', 'bch', 'doge', 'ltc'].includes(
    currencyAbbreviation.toLowerCase(),
  );
};

export const IsCustomERCToken = (currencyAbbreviation: string) => {
  return (
    Currencies[currencyAbbreviation.toLowerCase()]?.properties.isCustom &&
    !SUPPORTED_TOKENS.includes(currencyAbbreviation.toLowerCase())
  );
};

export const GetChain = (currencyAbbreviation: string): string => {
  return Currencies[currencyAbbreviation.toLowerCase()].chain;
};

export const IsERCToken = (currencyAbbreviation: string): boolean => {
  return Currencies[currencyAbbreviation.toLowerCase()]?.properties.isERCToken;
};

export const GetBlockExplorerUrl = (
  currencyAbbreviation: string,
  network: string = 'livenet',
): string => {
  return network === 'livenet'
    ? Currencies[currencyAbbreviation.toLowerCase()]?.paymentInfo
        .blockExplorerUrls
    : Currencies[currencyAbbreviation.toLowerCase()]?.paymentInfo
        .blockExplorerUrlsTestnet;
};

export const GetFeeUnits = (currencyAbbreviation: string) => {
  return Currencies[currencyAbbreviation.toLowerCase()].feeInfo;
};

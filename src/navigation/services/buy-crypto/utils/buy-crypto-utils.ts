import {
  PaymentMethod,
  PaymentMethods,
  PaymentMethodsAvailable,
} from '../constants/BuyCryptoConstants';
import {
  getSimplexSupportedCoins,
  simplexSupportedFiatCurrencies,
} from './simplex-utils';
import {wyreSupportedCoins, wyreSupportedFiatCurrencies} from './wyre-utils';
import * as _ from 'lodash';
import {CountryData} from '../../../../store/location/location.models';

export const getEnabledPaymentMethods = (
  countryData?: CountryData | null,
  currency?: string,
  coin?: string,
): PaymentMethods => {
  if (!currency || !coin) {
    return {};
  }
  PaymentMethodsAvailable.sepaBankTransfer.enabled = !!countryData?.isEuCountry;
  const EnabledPaymentMethods = _.pickBy(PaymentMethodsAvailable, method => {
    return (
      method.enabled &&
      (isPaymentMethodSupported('simplex', method, coin, currency) ||
        isPaymentMethodSupported('wyre', method, coin, currency))
    );
  });

  return EnabledPaymentMethods;
};

export const getAvailableFiatCurrencies = (exchange?: string): string[] => {
  switch (exchange) {
    case 'simplex':
      return simplexSupportedFiatCurrencies;
    case 'wyre':
      return wyreSupportedFiatCurrencies;
    default:
      const allSupportedFiatCurrencies = [
        ...new Set([
          ...simplexSupportedFiatCurrencies,
          ...wyreSupportedFiatCurrencies,
        ]),
      ];
      return allSupportedFiatCurrencies;
  }
};

export const isPaymentMethodSupported = (
  exchange: string,
  paymentMethod: PaymentMethod,
  coin: string,
  currency: string,
): boolean => {
  return (
    paymentMethod.supportedExchanges[exchange] &&
    isCoinSupportedBy(exchange, coin) &&
    (isCurrencySupportedBy(exchange, currency) ||
      isCurrencySupportedBy(exchange, 'USD'))
  );
};

export const isCoinSupportedToBuy = (coin: string): boolean => {
  return isCoinSupportedBy('simplex', coin) || isCoinSupportedBy('wyre', coin);
};

const isCoinSupportedBy = (exchange: string, coin: string): boolean => {
  switch (exchange) {
    case 'simplex':
      return getSimplexSupportedCoins().includes(coin.toLowerCase());
    case 'wyre':
      return wyreSupportedCoins.includes(coin.toLowerCase());
    default:
      return false;
  }
};

const isCurrencySupportedBy = (exchange: string, currency: string): boolean => {
  switch (exchange) {
    case 'simplex':
      return simplexSupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'wyre':
      return wyreSupportedFiatCurrencies.includes(currency.toUpperCase());
    default:
      return false;
  }
};

import {
  PaymentMethod,
  PaymentMethods,
  PaymentMethodsAvailable,
} from '../constants/BuyCryptoConstants';
import {
  getSimplexFiatAmountLimits,
  getSimplexSupportedCurrencies,
  simplexSupportedFiatCurrencies,
} from './simplex-utils';
import {
  getWyreFiatAmountLimits,
  getWyreSupportedCurrencies,
  wyreSupportedFiatCurrencies,
} from './wyre-utils';
import * as _ from 'lodash';
import {CountryData} from '../../../../store/location/location.models';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';

export const getEnabledPaymentMethods = (
  countryData?: CountryData | null,
  currency?: string,
  coin?: string,
  chain?: string,
): PaymentMethods => {
  if (!currency || !coin || !chain) {
    return {};
  }
  PaymentMethodsAvailable.sepaBankTransfer.enabled = !!countryData?.isEuCountry;
  const EnabledPaymentMethods = _.pickBy(PaymentMethodsAvailable, method => {
    return (
      method.enabled &&
      (isPaymentMethodSupported('simplex', method, coin, chain, currency) ||
        isPaymentMethodSupported('wyre', method, coin, chain, currency))
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
  chain: string,
  currency: string,
): boolean => {
  return (
    paymentMethod.supportedExchanges[exchange] &&
    isCoinSupportedBy(exchange, coin, chain) &&
    (isFiatCurrencySupportedBy(exchange, currency) ||
      isFiatCurrencySupportedBy(exchange, 'USD'))
  );
};

export const isCoinSupportedToBuy = (coin: string, chain: string): boolean => {
  return (
    isCoinSupportedBy('simplex', coin, chain) ||
    isCoinSupportedBy('wyre', coin, chain)
  );
};

const isCoinSupportedBy = (
  exchange: string,
  coin: string,
  chain: string,
): boolean => {
  switch (exchange) {
    case 'simplex':
      return getSimplexSupportedCurrencies().includes(
        getCurrencyAbbreviation(coin.toLowerCase(), chain.toLowerCase()),
      );
    case 'wyre':
      return getWyreSupportedCurrencies().includes(
        getCurrencyAbbreviation(coin.toLowerCase(), chain.toLowerCase()),
      );
    default:
      return false;
  }
};

const isFiatCurrencySupportedBy = (
  exchange: string,
  currency: string,
): boolean => {
  switch (exchange) {
    case 'simplex':
      return simplexSupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'wyre':
      return wyreSupportedFiatCurrencies.includes(currency.toUpperCase());
    default:
      return false;
  }
};

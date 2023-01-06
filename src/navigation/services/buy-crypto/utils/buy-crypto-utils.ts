import {
  PaymentMethod,
  PaymentMethods,
  PaymentMethodsAvailable,
} from '../constants/BuyCryptoConstants';
import {
  getMoonpaySupportedCurrencies,
  moonpaySupportedFiatCurrencies,
} from './moonpay-utils';
import {
  getSimplexSupportedCurrencies,
  simplexSupportedFiatCurrencies,
} from './simplex-utils';
import pickBy from 'lodash.pickby';
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
  const EnabledPaymentMethods = pickBy(PaymentMethodsAvailable, method => {
    return (
      method.enabled &&
      (isPaymentMethodSupported('moonpay', method, coin, chain, currency) ||
        isPaymentMethodSupported('simplex', method, coin, chain, currency))
    );
  });

  return EnabledPaymentMethods;
};

export const getAvailableFiatCurrencies = (exchange?: string): string[] => {
  switch (exchange) {
    case 'moonpay':
      return moonpaySupportedFiatCurrencies;
    case 'simplex':
      return simplexSupportedFiatCurrencies;
    default:
      const allSupportedFiatCurrencies = [
        ...new Set([...simplexSupportedFiatCurrencies]),
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
    isCoinSupportedBy('moonpay', coin, chain) ||
    isCoinSupportedBy('simplex', coin, chain)
  );
};

const isCoinSupportedBy = (
  exchange: string,
  coin: string,
  chain: string,
): boolean => {
  switch (exchange) {
    case 'moonpay':
      return getMoonpaySupportedCurrencies().includes(
        getCurrencyAbbreviation(coin.toLowerCase(), chain.toLowerCase()),
      );
    case 'simplex':
      return getSimplexSupportedCurrencies().includes(
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
    case 'moonpay':
      return moonpaySupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'simplex':
      return simplexSupportedFiatCurrencies.includes(currency.toUpperCase());
    default:
      return false;
  }
};

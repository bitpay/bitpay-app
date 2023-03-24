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
  getRampSupportedCurrencies,
  rampSupportedFiatCurrencies,
} from './ramp-utils';
import {
  getSimplexSupportedCurrencies,
  simplexSupportedFiatCurrencies,
} from './simplex-utils';
import {
  getWyreSupportedCurrencies,
  wyreSupportedFiatCurrencies,
} from './wyre-utils';
import pickBy from 'lodash.pickby';
import {LocationData} from '../../../../store/location/location.models';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';

export const getEnabledPaymentMethods = (
  locationData?: LocationData | null,
  currency?: string,
  coin?: string,
  chain?: string,
  country?: string,
): PaymentMethods => {
  if (!currency || !coin || !chain) {
    return {};
  }
  PaymentMethodsAvailable.sepaBankTransfer.enabled =
    !!locationData?.isEuCountry;
  const EnabledPaymentMethods = pickBy(PaymentMethodsAvailable, method => {
    return (
      method.enabled &&
      (isPaymentMethodSupported(
        'moonpay',
        method,
        coin,
        chain,
        currency,
        country,
      ) ||
        isPaymentMethodSupported('ramp', method, coin, chain, currency) ||
        isPaymentMethodSupported('simplex', method, coin, chain, currency) ||
        isPaymentMethodSupported('wyre', method, coin, chain, currency))
    );
  });

  return EnabledPaymentMethods;
};

export const getAvailableFiatCurrencies = (exchange?: string): string[] => {
  switch (exchange) {
    case 'moonpay':
      return moonpaySupportedFiatCurrencies;
    case 'ramp':
      return rampSupportedFiatCurrencies;
    case 'simplex':
      return simplexSupportedFiatCurrencies;
    case 'wyre':
      return wyreSupportedFiatCurrencies;
    default:
      const allSupportedFiatCurrencies = [
        ...new Set([
          ...moonpaySupportedFiatCurrencies,
          ...rampSupportedFiatCurrencies,
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
  country?: string,
): boolean => {
  return (
    paymentMethod.supportedExchanges[exchange] &&
    isCoinSupportedBy(exchange, coin, chain, country) &&
    (isFiatCurrencySupportedBy(exchange, currency) ||
      isFiatCurrencySupportedBy(exchange, 'USD'))
  );
};

export const isCoinSupportedToBuy = (
  coin: string,
  chain: string,
  country?: string,
): boolean => {
  return (
    isCoinSupportedBy('moonpay', coin, chain, country) ||
    isCoinSupportedBy('ramp', coin, chain) ||
    isCoinSupportedBy('simplex', coin, chain) ||
    isCoinSupportedBy('wyre', coin, chain)
  );
};

const isCoinSupportedBy = (
  exchange: string,
  coin: string,
  chain: string,
  country?: string,
): boolean => {
  switch (exchange) {
    case 'moonpay':
      return getMoonpaySupportedCurrencies(country).includes(
        getCurrencyAbbreviation(coin.toLowerCase(), chain.toLowerCase()),
      );
    case 'ramp':
      return getRampSupportedCurrencies().includes(
        getCurrencyAbbreviation(coin.toLowerCase(), chain.toLowerCase()),
      );
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
    case 'moonpay':
      return moonpaySupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'ramp':
      return rampSupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'simplex':
      return simplexSupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'wyre':
      return wyreSupportedFiatCurrencies.includes(currency.toUpperCase());
    default:
      return false;
  }
};

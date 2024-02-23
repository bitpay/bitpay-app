import {
  PaymentMethod,
  PaymentMethods,
  PaymentMethodsAvailable,
} from '../constants/BuyCryptoConstants';
import {
  getBanxaSupportedCurrencies,
  banxaSupportedFiatCurrencies,
} from './banxa-utils';
import {
  getMoonpaySupportedCurrencies,
  moonpaySupportedFiatCurrencies,
} from './moonpay-utils';
import {
  getRampSupportedCurrencies,
  rampSupportedFiatCurrencies,
} from './ramp-utils';
import {
  getSardineSupportedCurrencies,
  sardineSupportedFiatCurrencies,
} from './sardine-utils';
import {
  getSimplexSupportedCurrencies,
  simplexSupportedFiatCurrencies,
} from './simplex-utils';
import {
  getTransakSupportedCurrencies,
  transakSupportedFiatCurrencies,
} from './transak-utils';
import pickBy from 'lodash.pickby';
import {LocationData} from '../../../../store/location/location.models';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';

export type BuyCryptoExchangeKey =
  | 'banxa'
  | 'moonpay'
  | 'ramp'
  | 'sardine'
  | 'simplex'
  | 'transak';

export const BuyCryptoSupportedExchanges: BuyCryptoExchangeKey[] = [
  'banxa',
  'moonpay',
  'ramp',
  'sardine',
  'simplex',
  'transak',
];

export const getBuyEnabledPaymentMethods = (
  locationData?: LocationData | null,
  currency?: string,
  coin?: string,
  chain?: string,
  country?: string,
  exchange?: BuyCryptoExchangeKey | undefined,
): Partial<PaymentMethods> => {
  if (!currency || !coin || !chain) {
    return {};
  }
  PaymentMethodsAvailable.sepaBankTransfer.enabled =
    !!locationData?.isEuCountry;
  PaymentMethodsAvailable.ach.enabled = country === 'US';
  const EnabledPaymentMethods = pickBy(PaymentMethodsAvailable, method => {
    return exchange && BuyCryptoSupportedExchanges.includes(exchange)
      ? method.enabled &&
          isPaymentMethodSupported(
            exchange,
            method,
            coin,
            chain,
            currency,
            country,
          )
      : method.enabled &&
          (isPaymentMethodSupported(
            'banxa',
            method,
            coin,
            chain,
            currency,
            country,
          ) ||
            isPaymentMethodSupported(
              'moonpay',
              method,
              coin,
              chain,
              currency,
              country,
            ) ||
            isPaymentMethodSupported('ramp', method, coin, chain, currency) ||
            isPaymentMethodSupported(
              'sardine',
              method,
              coin,
              chain,
              currency,
              country,
            ) ||
            isPaymentMethodSupported(
              'simplex',
              method,
              coin,
              chain,
              currency,
            ) ||
            isPaymentMethodSupported(
              'transak',
              method,
              coin,
              chain,
              currency,
              country,
            ));
  });

  return EnabledPaymentMethods;
};

export const getBuyCryptoSupportedCoins = (
  locationData?: LocationData | null,
  exchange?: string,
): string[] => {
  switch (exchange) {
    case 'banxa':
      return getBanxaSupportedCurrencies();
    case 'moonpay':
      return getMoonpaySupportedCurrencies(
        locationData?.countryShortCode || 'US',
      );
    case 'ramp':
      return getRampSupportedCurrencies();
    case 'sardine':
      return getSardineSupportedCurrencies();
    case 'simplex':
      return getSimplexSupportedCurrencies();
    case 'transak':
      return getTransakSupportedCurrencies();
    default:
      const allSupportedCurrencies = [
        ...new Set([
          ...getBanxaSupportedCurrencies(),
          ...getMoonpaySupportedCurrencies(
            locationData?.countryShortCode || 'US',
          ),
          ...getRampSupportedCurrencies(),
          ...getSardineSupportedCurrencies(),
          ...getSimplexSupportedCurrencies(),
          ...getTransakSupportedCurrencies(),
        ]),
      ];
      return allSupportedCurrencies;
  }
};

export const getAvailableFiatCurrencies = (exchange?: string): string[] => {
  switch (exchange) {
    case 'banxa':
      return banxaSupportedFiatCurrencies;
    case 'moonpay':
      return moonpaySupportedFiatCurrencies;
    case 'ramp':
      return rampSupportedFiatCurrencies;
    case 'sardine':
      return sardineSupportedFiatCurrencies;
    case 'simplex':
      return simplexSupportedFiatCurrencies;
    case 'transak':
      return transakSupportedFiatCurrencies;
    default:
      const allSupportedFiatCurrencies = [
        ...new Set([
          ...banxaSupportedFiatCurrencies,
          ...moonpaySupportedFiatCurrencies,
          ...rampSupportedFiatCurrencies,
          ...sardineSupportedFiatCurrencies,
          ...simplexSupportedFiatCurrencies,
          ...transakSupportedFiatCurrencies,
        ]),
      ];
      return allSupportedFiatCurrencies;
  }
};

export const isPaymentMethodSupported = (
  exchange: BuyCryptoExchangeKey,
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
    isCoinSupportedBy('banxa', coin, chain) ||
    isCoinSupportedBy('moonpay', coin, chain, country) ||
    isCoinSupportedBy('ramp', coin, chain) ||
    isCoinSupportedBy('sardine', coin, chain) ||
    isCoinSupportedBy('simplex', coin, chain) ||
    isCoinSupportedBy('transak', coin, chain)
  );
};

const isCoinSupportedBy = (
  exchange: string,
  coin: string,
  chain: string,
  country?: string,
): boolean => {
  switch (exchange) {
    case 'banxa':
      return getBanxaSupportedCurrencies().includes(
        getCurrencyAbbreviation(coin.toLowerCase(), chain.toLowerCase()),
      );
    case 'moonpay':
      return getMoonpaySupportedCurrencies(country).includes(
        getCurrencyAbbreviation(coin.toLowerCase(), chain.toLowerCase()),
      );
    case 'ramp':
      return getRampSupportedCurrencies().includes(
        getCurrencyAbbreviation(coin.toLowerCase(), chain.toLowerCase()),
      );
    case 'sardine':
      return getSardineSupportedCurrencies().includes(
        getCurrencyAbbreviation(coin.toLowerCase(), chain.toLowerCase()),
      );
    case 'simplex':
      return getSimplexSupportedCurrencies().includes(
        getCurrencyAbbreviation(coin.toLowerCase(), chain.toLowerCase()),
      );
    case 'transak':
      return getTransakSupportedCurrencies().includes(
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
    case 'banxa':
      return banxaSupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'moonpay':
      return moonpaySupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'ramp':
      return rampSupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'sardine':
      return sardineSupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'simplex':
      return simplexSupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'transak':
      return transakSupportedFiatCurrencies.includes(currency.toUpperCase());
    default:
      return false;
  }
};

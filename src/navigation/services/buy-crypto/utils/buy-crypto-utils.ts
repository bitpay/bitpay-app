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
import {BuyCryptoConfig} from '../../../../store/external-services/external-services.types';
import {
  getExternalServiceSymbol,
  isPaymentMethodDisabledForPartner,
} from '../../utils/external-services-utils';

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
  currency?: string,
  coin?: string,
  chain?: string,
  country?: string,
  exchange?: BuyCryptoExchangeKey | undefined,
  buyCryptoConfig?: BuyCryptoConfig,
): Partial<PaymentMethods> => {
  if (!currency || !coin || !chain) {
    return {};
  }
  const paymentMethodsConfig = buyCryptoConfig?.paymentMethods;
  Object.values(PaymentMethodsAvailable).forEach(pm => {
    if (
      pm.enabled &&
      pm.supportedCountries &&
      pm.supportedCountries.length > 0
    ) {
      pm.enabled = !!(country && pm.supportedCountries.includes(country));
    }
  });

  const EnabledPaymentMethods = pickBy(PaymentMethodsAvailable, method => {
    if (!method.enabled || paymentMethodsConfig?.[method.method]?.disabled) {
      return false;
    }
    const isSupportedByExchange = (exch: BuyCryptoExchangeKey) =>
      !isPaymentMethodDisabledForPartner(
        buyCryptoConfig?.[exch],
        method.method,
      ) &&
      isPaymentMethodSupported(exch, method, coin, chain, currency, country);
    return exchange && BuyCryptoSupportedExchanges.includes(exchange)
      ? isSupportedByExchange(exchange)
      : BuyCryptoSupportedExchanges.some(isSupportedByExchange);
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
        getExternalServiceSymbol(coin, chain),
      );
    case 'moonpay':
      return getMoonpaySupportedCurrencies(country).includes(
        getExternalServiceSymbol(coin, chain),
      );
    case 'ramp':
      return getRampSupportedCurrencies().includes(
        getExternalServiceSymbol(coin, chain),
      );
    case 'sardine':
      return getSardineSupportedCurrencies().includes(
        getExternalServiceSymbol(coin, chain),
      );
    case 'simplex':
      return getSimplexSupportedCurrencies().includes(
        getExternalServiceSymbol(coin, chain),
      );
    case 'transak':
      return getTransakSupportedCurrencies().includes(
        getExternalServiceSymbol(coin, chain),
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

import {
  PaymentMethod,
  PaymentMethods,
  PaymentMethodsAvailable,
} from '../constants/SellCryptoConstants';
import {
  getMoonpaySellSupportedCurrencies,
  moonpaySellSupportedFiatCurrencies,
} from './moonpay-sell-utils';
import pickBy from 'lodash.pickby';
import {LocationData} from '../../../../store/location/location.models';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';

export type SellCryptoExchangeKey = 'moonpay';

export const SellCryptoSupportedExchanges: SellCryptoExchangeKey[] = [
  'moonpay',
];

export const getSellEnabledPaymentMethods = (
  locationData?: LocationData | null,
  currency?: string,
  coin?: string,
  chain?: string,
  country?: string,
  exchange?: SellCryptoExchangeKey | undefined,
): Partial<PaymentMethods> => {
  if (!currency || !coin || !chain) {
    return {};
  }
  // PaymentMethodsAvailable.sepaBankTransfer.enabled =
  //   !!locationData?.isEuCountry;
  // PaymentMethodsAvailable.ach.enabled = country === 'US';
  const EnabledPaymentMethods = pickBy(PaymentMethodsAvailable, method => {
    return exchange && SellCryptoSupportedExchanges.includes(exchange)
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
          isPaymentMethodSupported(
            'moonpay',
            method,
            coin,
            chain,
            currency,
            country,
          );
  });

  return EnabledPaymentMethods;
};

export const getSellCryptoSupportedCoins = (
  locationData?: LocationData | null,
  exchange?: string,
): string[] => {
  switch (exchange) {
    case 'moonpay':
      return getMoonpaySellSupportedCurrencies(
        locationData?.countryShortCode || 'US',
      );
    default:
      const allSupportedCurrencies = [
        ...new Set([
          ...getMoonpaySellSupportedCurrencies(
            locationData?.countryShortCode || 'US',
          ),
        ]),
      ];
      return allSupportedCurrencies;
  }
};

export const getAvailableSellCryptoFiatCurrencies = (
  exchange?: string,
): string[] => {
  switch (exchange) {
    case 'moonpay':
      return moonpaySellSupportedFiatCurrencies;
    default:
      const allSupportedFiatCurrencies = [
        ...new Set([...moonpaySellSupportedFiatCurrencies]),
      ];
      return allSupportedFiatCurrencies;
  }
};

export const isPaymentMethodSupported = (
  exchange: SellCryptoExchangeKey,
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

export const isCoinSupportedToSell = (
  coin: string,
  chain: string,
  country?: string,
): boolean => {
  return isCoinSupportedBy('moonpay', coin, chain, country);
};

const isCoinSupportedBy = (
  exchange: string,
  coin: string,
  chain: string,
  country?: string,
): boolean => {
  switch (exchange) {
    case 'moonpay':
      return getMoonpaySellSupportedCurrencies(country).includes(
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
      return moonpaySellSupportedFiatCurrencies.includes(
        currency.toUpperCase(),
      );
    default:
      return false;
  }
};

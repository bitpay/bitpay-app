import {
  WithdrawalMethod,
  WithdrawalMethodKey,
  WithdrawalMethods,
  WithdrawalMethodsAvailable,
} from '../constants/SellCryptoConstants';
import {
  getMoonpayFiatListByPayoutMethod,
  getMoonpaySellSupportedCurrencies,
  moonpaySellSupportedFiatCurrencies,
} from './moonpay-sell-utils';
import {
  getSimplexSellSupportedCurrencies,
  simplexSellSupportedFiatCurrencies,
} from './simplex-sell-utils';
import {LocationData} from '../../../../store/location/location.models';
import {
  PaymentMethodsConfig,
  SellCryptoConfig,
} from '../../../../store/external-services/external-services.types';
import {
  getExternalServiceSymbol,
  isPaymentMethodDisabledForPartner,
} from '../../utils/external-services-utils';
import {
  getRampSellSupportedCurrencies,
  rampSellSupportedFiatCurrencies,
} from './ramp-sell-utils';

export type SellCryptoExchangeKey = 'moonpay' | 'ramp' | 'simplex';

export const SellCryptoSupportedExchanges: SellCryptoExchangeKey[] = [
  'moonpay',
  'ramp',
  'simplex',
];

export const getSellEnabledPaymentMethods = (
  currency?: string,
  coin?: string,
  chain?: string,
  locationCountry?: string,
  userCountry?: string,
  exchange?: SellCryptoExchangeKey | undefined,
  sellCryptoConfig?: SellCryptoConfig,
): Partial<WithdrawalMethods> => {
  if (!currency || !coin || !chain) {
    return {};
  }

  const paymentMethodsConfig = sellCryptoConfig?.paymentMethods;

  const isPaymentMethodEnabled = (
    paymentMethod: WithdrawalMethod,
    targetLocationCountry: string | undefined,
    targetUserCountry: string | undefined,
  ) => {
    return !!(
      (targetLocationCountry &&
        paymentMethod.supportedCountries?.includes(targetLocationCountry)) ||
      (targetUserCountry &&
        paymentMethod.supportedCountries?.includes(targetUserCountry))
    );
  };

  WithdrawalMethodsAvailable.sepaBankTransfer.enabled = isPaymentMethodEnabled(
    WithdrawalMethodsAvailable.sepaBankTransfer,
    locationCountry,
    userCountry,
  );

  WithdrawalMethodsAvailable.ach.enabled = isPaymentMethodEnabled(
    WithdrawalMethodsAvailable.ach,
    locationCountry,
    userCountry,
  );

  WithdrawalMethodsAvailable.gbpBankTransfer.enabled = isPaymentMethodEnabled(
    WithdrawalMethodsAvailable.gbpBankTransfer,
    locationCountry,
    userCountry,
  );

  WithdrawalMethodsAvailable.cashApp.enabled = isPaymentMethodEnabled(
    WithdrawalMethodsAvailable.cashApp,
    locationCountry,
    undefined, // CashApp is only supported for located US. users, so we don't check userCountry here
  );

  // Helper function to check if a payment method is supported by a specific exchange
  const isSupportedByExchange = (
    targetExchange: SellCryptoExchangeKey,
    method: WithdrawalMethod,
    targetCoin: string,
    targetChain: string,
    targetCurrency: string,
    targetLocationCountry: string | undefined,
    targetUserCountry: string | undefined,
  ) => {
    return (
      !isPaymentMethodDisabledForPartner(
        sellCryptoConfig?.[targetExchange],
        method.method,
      ) &&
      isWithdrawalMethodSupported(
        targetExchange,
        method,
        targetCoin,
        targetChain,
        targetCurrency,
        targetLocationCountry,
        targetUserCountry,
      )
    );
  };

  // Determine supported exchanges for a payment method
  const getSupportedExchanges = (
    targetExchange: SellCryptoExchangeKey | undefined,
    method: WithdrawalMethod,
    targetCoin: string,
    targetChain: string,
    targetCurrency: string,
    targetLocationCountry: string | undefined,
    targetUserCountry: string | undefined,
  ) => {
    if (
      targetExchange &&
      SellCryptoSupportedExchanges.includes(targetExchange)
    ) {
      return isSupportedByExchange(
        targetExchange,
        method,
        targetCoin,
        targetChain,
        targetCurrency,
        targetLocationCountry,
        targetUserCountry,
      );
    }

    // Default to 'moonpay' and 'simplex' if no specific exchange is provided
    return (
      isSupportedByExchange(
        'moonpay',
        method,
        targetCoin,
        targetChain,
        targetCurrency,
        targetLocationCountry,
        targetUserCountry,
      ) ||
      isSupportedByExchange(
        'ramp',
        method,
        targetCoin,
        targetChain,
        targetCurrency,
        targetLocationCountry,
        targetUserCountry,
      ) ||
      isSupportedByExchange(
        'simplex',
        method,
        targetCoin,
        targetChain,
        targetCurrency,
        targetLocationCountry,
        targetUserCountry,
      )
    );
  };

  // Filter enabled payment methods
  const EnabledWithdrawalMethods = Object.fromEntries(
    Object.entries(WithdrawalMethodsAvailable).filter(([, method]) => {
      if (paymentMethodsConfig?.[method.method]?.disabled) {
        return false;
      }
      return (
        method.enabled &&
        getSupportedExchanges(
          exchange,
          method,
          coin,
          chain,
          currency,
          locationCountry,
          userCountry,
        )
      );
    }),
  );

  return EnabledWithdrawalMethods;
};

export const getDefaultPaymentMethod = (
  country?: string,
  paymentMethodsConfig?: PaymentMethodsConfig,
): WithdrawalMethod => {
  const isEnabledByConfig = (key: WithdrawalMethodKey) =>
    !paymentMethodsConfig?.[key]?.disabled;
  if (!country) {
    return WithdrawalMethodsAvailable.debitCard;
  } else if (
    isEnabledByConfig('ach') &&
    WithdrawalMethodsAvailable.ach.supportedCountries?.includes(country)
  ) {
    return WithdrawalMethodsAvailable.ach;
  } else if (
    isEnabledByConfig('gbpBankTransfer') &&
    WithdrawalMethodsAvailable.gbpBankTransfer.supportedCountries?.includes(
      country,
    )
  ) {
    return WithdrawalMethodsAvailable.gbpBankTransfer;
  } else if (
    isEnabledByConfig('sepaBankTransfer') &&
    WithdrawalMethodsAvailable.sepaBankTransfer.supportedCountries?.includes(
      country,
    )
  ) {
    return WithdrawalMethodsAvailable.sepaBankTransfer;
  }
  return WithdrawalMethodsAvailable.debitCard;
};

export const getSellCryptoSupportedCoins = (
  locationData?: LocationData | null,
  exchange?: string,
  userCountry?: string | undefined,
): string[] => {
  switch (exchange) {
    case 'moonpay':
      return getMoonpaySellSupportedCurrencies(
        locationData?.countryShortCode || 'US',
      );
    case 'ramp':
      return getRampSellSupportedCurrencies();
    case 'simplex':
      return getSimplexSellSupportedCurrencies(
        locationData?.countryShortCode,
        userCountry,
      );
    default:
      const allSupportedCurrencies = [
        ...new Set([
          ...getMoonpaySellSupportedCurrencies(
            locationData?.countryShortCode || 'US',
          ),
          ...getRampSellSupportedCurrencies(),
          ...getSimplexSellSupportedCurrencies(
            locationData?.countryShortCode,
            userCountry,
          ),
        ]),
      ];
      return allSupportedCurrencies;
  }
};

export const getAvailableSellCryptoFiatCurrencies = (
  exchange?: string,
  paymentMethodKey?: WithdrawalMethodKey,
): string[] => {
  switch (exchange) {
    case 'moonpay':
      if (paymentMethodKey) {
        return getMoonpayFiatListByPayoutMethod(paymentMethodKey);
      } else {
        return moonpaySellSupportedFiatCurrencies;
      }
    case 'ramp':
      return rampSellSupportedFiatCurrencies;
    case 'simplex':
      return simplexSellSupportedFiatCurrencies;
    default:
      const allSupportedFiatCurrencies = [
        ...new Set([
          ...moonpaySellSupportedFiatCurrencies,
          ...rampSellSupportedFiatCurrencies,
          ...simplexSellSupportedFiatCurrencies,
        ]),
      ];
      return allSupportedFiatCurrencies;
  }
};

export const getBaseSellCryptoFiatCurrencies = (
  exchange?: string,
  paymentMethodKey?: WithdrawalMethodKey,
): string => {
  switch (exchange) {
    case 'moonpay':
      const fiatList = getAvailableSellCryptoFiatCurrencies(
        'moonpay',
        paymentMethodKey,
      );
      return fiatList[0] || 'USD';
    case 'ramp':
      return 'EUR';
    case 'simplex':
      return 'EUR';
    default:
      return 'USD';
  }
};

export const isWithdrawalMethodSupported = (
  exchange: SellCryptoExchangeKey,
  paymentMethod: WithdrawalMethod,
  coin: string,
  chain: string,
  currency: string,
  locationCountry?: string,
  userCountry?: string,
): boolean => {
  return (
    paymentMethod.supportedExchanges[exchange] &&
    isCoinSupportedToSellBy(
      exchange,
      coin,
      chain,
      locationCountry,
      userCountry,
    ) &&
    (isFiatCurrencySupportedBy(exchange, currency) ||
      isFiatCurrencySupportedBy(exchange, 'USD') ||
      (['ramp'].includes(exchange) &&
        isFiatCurrencySupportedBy(exchange, 'EUR')) ||
      (['simplex'].includes(exchange) &&
        isFiatCurrencySupportedBy(exchange, 'EUR')))
  );
};

export const isCoinSupportedToSell = (
  coin: string,
  chain: string,
  locationCountry?: string,
  userCountry?: string,
): boolean => {
  return (
    isCoinSupportedToSellBy(
      'moonpay',
      coin,
      chain,
      locationCountry,
      userCountry,
    ) ||
    isCoinSupportedToSellBy(
      'ramp',
      coin,
      chain,
      locationCountry,
      userCountry,
    ) ||
    isCoinSupportedToSellBy(
      'simplex',
      coin,
      chain,
      locationCountry,
      userCountry,
    )
  );
};

export const isCoinSupportedToSellBy = (
  exchange: string,
  coin: string,
  chain: string,
  locationCountry?: string,
  userCountry?: string,
): boolean => {
  switch (exchange) {
    case 'moonpay':
      return getMoonpaySellSupportedCurrencies(locationCountry).includes(
        getExternalServiceSymbol(coin, chain),
      );
    case 'ramp':
      return getRampSellSupportedCurrencies().includes(
        getExternalServiceSymbol(coin, chain),
      );
    case 'simplex':
      return getSimplexSellSupportedCurrencies(
        locationCountry,
        userCountry,
      ).includes(getExternalServiceSymbol(coin, chain));
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
    case 'ramp':
      return rampSellSupportedFiatCurrencies.includes(currency.toUpperCase());
    case 'simplex':
      return simplexSellSupportedFiatCurrencies.includes(
        currency.toUpperCase(),
      );
    default:
      return false;
  }
};

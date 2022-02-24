import {CardProvider} from '../constants/card';
import {
  ProviderConfig,
  SUPPORTED_DESIGN_CURRENCIES,
} from '../constants/config.card';
import {VirtualDesignCurrency} from '../store/card/card.types';

export const isVirtualDesignSupported = (provider: CardProvider) => {
  return ProviderConfig[provider].virtualDesignSupport || false;
};

export const getCardCurrencyColorPalette = (
  currency: VirtualDesignCurrency,
) => {
  const config =
    SUPPORTED_DESIGN_CURRENCIES[currency] ||
    SUPPORTED_DESIGN_CURRENCIES['bitpay-b'];

  return config.palette;
};

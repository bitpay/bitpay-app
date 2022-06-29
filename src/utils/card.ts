import {CardProvider} from '../constants/card';
import {
  ProviderConfig,
  SUPPORTED_DESIGN_CURRENCIES,
} from '../constants/config.card';
import {Card} from '../store/card/card.models';
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

const invalidStatusMap: Record<string, boolean> = {
  lost: true,
  stolen: true,
  canceled: true,
};
export const isInvalidCardStatus = (card: Card) => {
  return invalidStatusMap[card?.status] || false;
};

export const isActivationRequired = (card: Card) => {
  const {provider} = card;

  return ProviderConfig[provider].activation.isRequired(card);
};

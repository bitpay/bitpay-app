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
/**
 * Checks whether the card should be persisted in the app based on disabled flag and card status.
 * @param card Card to check.
 * @returns true if card is disabled or lost/stolen/canceledd
 */
export const isInvalidCard = (card: Card) => {
  return card?.disabled || invalidStatusMap[card?.status] || false;
};

export const isActivationRequired = (card: Card) => {
  const {provider} = card;

  return ProviderConfig[provider].activation.isRequired(card);
};

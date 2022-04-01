import {ShopActionType, ShopActionTypes} from './shop.types';
import {
  AvailableCardMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
  GiftCard,
  GiftCardOrder,
  PhoneCountryInfo,
  UnsoldGiftCard,
} from './shop.models';

export const successFetchCatalog = (payload: {
  availableCardMap: AvailableCardMap;
  categoriesAndCurations: CategoriesAndCurations;
  integrations: DirectIntegrationMap;
}): ShopActionType => ({
  type: ShopActionTypes.SUCCESS_FETCH_CATALOG,
  payload,
});

export const failedFetchCatalog = (): ShopActionType => ({
  type: ShopActionTypes.FAILED_FETCH_CATALOG,
});

export const successCreateGiftCardInvoice = (
  payload: GiftCardOrder,
): ShopActionType => ({
  type: ShopActionTypes.SUCCESS_CREATE_GIFT_CARD_INVOICE,
  payload,
});

export const failedCreateGiftCardInvoice = (): ShopActionType => ({
  type: ShopActionTypes.FAILED_CREATE_GIFT_CARD_INVOICE,
});

export const initializedUnsoldGiftCard = (payload: {
  giftCard: UnsoldGiftCard;
}): ShopActionType => ({
  type: ShopActionTypes.INITIALIZED_UNSOLD_GIFT_CARD,
  payload,
});

export const deletedUnsoldGiftCard = (payload: {
  invoiceId: string;
}): ShopActionType => ({
  type: ShopActionTypes.DELETED_UNSOLD_GIFT_CARD,
  payload,
});

export const redeemedGiftCard = (payload: {
  giftCard: GiftCard;
}): ShopActionType => ({
  type: ShopActionTypes.REDEEMED_GIFT_CARD,
  payload,
});

export const updatedEmailAddress = (payload: {
  email: string;
}): ShopActionType => ({
  type: ShopActionTypes.UPDATED_EMAIL_ADDRESS,
  payload,
});

export const updatedPhone = (payload: {
  phone: string;
  phoneCountryInfo: PhoneCountryInfo;
}): ShopActionType => ({
  type: ShopActionTypes.UPDATED_PHONE,
  payload,
});

export const clearedGiftCards = (): ShopActionType => ({
  type: ShopActionTypes.CLEARED_GIFT_CARDS,
});

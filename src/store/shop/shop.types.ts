import {
  AvailableCardMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
  GiftCard,
  GiftCardOrder,
  UnsoldGiftCard,
} from './shop.models';

export enum ShopActionTypes {
  SUCCESS_FETCH_CATALOG = 'SHOP/SUCCESS_FETCH_CATALOG',
  FAILED_FETCH_CATALOG = 'SHOP/FAILED_FETCH_CATALOG',
  SUCCESS_CREATE_GIFT_CARD_INVOICE = 'SHOP/SUCCESS_CREATE_GIFT_CARD_INVOICE',
  FAILED_CREATE_GIFT_CARD_INVOICE = 'SHOP/FAILED_CREATE_GIFT_CARD_INVOICE',
  INITIALIZED_UNSOLD_GIFT_CARD = 'SHOP/INITIALIZED_UNSOLD_GIFT_CARD',
  DELETED_UNSOLD_GIFT_CARD = 'SHOP/DELETED_UNSOLD_GIFT_CARD',
  REDEEMED_GIFT_CARD = 'SHOP/REDEEMED_GIFT_CARD',
  CLEARED_GIFT_CARDS = 'SHOP/CLEARED_GIFT_CARDS',
}

interface successFetchCatalog {
  type: typeof ShopActionTypes.SUCCESS_FETCH_CATALOG;
  payload: {
    availableCardMap: AvailableCardMap;
    categoriesAndCurations: CategoriesAndCurations;
    integrations: DirectIntegrationMap;
  };
}
interface failedFetchCatalog {
  type: typeof ShopActionTypes.FAILED_FETCH_CATALOG;
}
interface successCreateGiftCardInvoice {
  type: typeof ShopActionTypes.SUCCESS_CREATE_GIFT_CARD_INVOICE;
  payload: GiftCardOrder;
}
interface failedCreateGiftCardInvoice {
  type: typeof ShopActionTypes.FAILED_CREATE_GIFT_CARD_INVOICE;
}
interface initializedUnsoldGiftCard {
  type: typeof ShopActionTypes.INITIALIZED_UNSOLD_GIFT_CARD;
  payload: {
    giftCard: UnsoldGiftCard;
  };
}
interface deletedUnsoldGiftCard {
  type: typeof ShopActionTypes.DELETED_UNSOLD_GIFT_CARD;
  payload: {
    invoiceId: string;
  };
}
interface redeemedGiftCard {
  type: typeof ShopActionTypes.REDEEMED_GIFT_CARD;
  payload: {
    giftCard: GiftCard;
  };
}

interface clearedGiftCards {
  type: typeof ShopActionTypes.CLEARED_GIFT_CARDS;
}

export type ShopActionType =
  | successFetchCatalog
  | failedFetchCatalog
  | successCreateGiftCardInvoice
  | failedCreateGiftCardInvoice
  | initializedUnsoldGiftCard
  | deletedUnsoldGiftCard
  | redeemedGiftCard
  | clearedGiftCards;

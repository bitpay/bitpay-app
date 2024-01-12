import {ShopActionType, ShopActionTypes} from './shop.types';
import {
  BillPayAccount,
  BillPayPayment,
  CardConfigMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
  GiftCard,
  GiftCardOrder,
  PhoneCountryInfo,
  UnsoldGiftCard,
} from './shop.models';

export const successFetchCatalog = (payload: {
  availableCardMap: CardConfigMap;
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

export const setPurchasedGiftCards = (payload: {
  giftCards: GiftCard[];
}): ShopActionType => ({
  type: ShopActionTypes.SET_PURCHASED_GIFT_CARDS,
  payload,
});

export const setBillPayAccounts = (payload: {
  accounts: BillPayAccount[];
}): ShopActionType => ({
  type: ShopActionTypes.SET_BILL_PAY_ACCOUNTS,
  payload,
});

export const clearedBillPayAccounts = (): ShopActionType => ({
  type: ShopActionTypes.CLEARED_BILL_PAY_ACCOUNTS,
});

export const setBillPayPayments = (payload: {
  billPayPayments: BillPayPayment[];
}): ShopActionType => ({
  type: ShopActionTypes.SET_BILL_PAY_PAYMENTS,
  payload,
});

export const clearedBillPayPayments = (): ShopActionType => ({
  type: ShopActionTypes.CLEARED_BILL_PAY_PAYMENTS,
});

export const updatedGiftCardStatus = (payload: {
  invoiceId: string;
  status: 'PENDING' | 'UNREDEEMED';
}): ShopActionType => ({
  type: ShopActionTypes.UPDATED_GIFT_CARD_STATUS,
  payload,
});

export const deletedUnsoldGiftCards = (): ShopActionType => ({
  type: ShopActionTypes.DELETED_UNSOLD_GIFT_CARDS,
});

export const redeemedGiftCard = (payload: {
  giftCard: GiftCard;
}): ShopActionType => ({
  type: ShopActionTypes.REDEEMED_GIFT_CARD,
  payload,
});

export const toggledGiftCardArchivedStatus = (payload: {
  giftCard: GiftCard;
}): ShopActionType => ({
  type: ShopActionTypes.TOGGLED_GIFT_CARD_ARCHIVED_STATUS,
  payload,
});

export const toggledSyncGiftCardPurchasesWithBitPayId = (): ShopActionType => ({
  type: ShopActionTypes.TOGGLED_SYNC_GIFT_CARD_PURCHASES_WITH_BITPAY_ID,
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

export const isJoinedWaitlist = (
  isJoinedWaitlist: boolean,
): ShopActionType => ({
  type: ShopActionTypes.IS_JOINED_WAITLIST,
  payload: {isJoinedWaitlist},
});

import {Network} from '../../constants';
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

export enum ShopActionTypes {
  SUCCESS_FETCH_CATALOG = 'SHOP/SUCCESS_FETCH_CATALOG',
  FAILED_FETCH_CATALOG = 'SHOP/FAILED_FETCH_CATALOG',
  SUCCESS_CREATE_GIFT_CARD_INVOICE = 'SHOP/SUCCESS_CREATE_GIFT_CARD_INVOICE',
  FAILED_CREATE_GIFT_CARD_INVOICE = 'SHOP/FAILED_CREATE_GIFT_CARD_INVOICE',
  INITIALIZED_UNSOLD_GIFT_CARD = 'SHOP/INITIALIZED_UNSOLD_GIFT_CARD',
  DELETED_UNSOLD_GIFT_CARDS = 'SHOP/DELETED_UNSOLD_GIFT_CARDS',
  UPDATED_EMAIL_ADDRESS = 'SHOP/UPDATED_EMAIL_ADDRESS',
  UPDATED_GIFT_CARD_STATUS = 'SHOP/UPDATED_GIFT_CARD_STATUS',
  UPDATED_PHONE = 'SHOP/UPDATED_PHONE',
  REDEEMED_GIFT_CARD = 'SHOP/REDEEMED_GIFT_CARD',
  SET_PURCHASED_GIFT_CARDS = 'SHOP/SET_PURCHASED_GIFT_CARDS',
  SET_BILL_PAY_ACCOUNTS = 'SHOP/SET_BILL_PAY_ACCOUNTS',
  CLEARED_BILL_PAY_ACCOUNTS = 'SHOP/CLEARED_BILL_PAY_ACCOUNTS',
  SET_BILL_PAY_PAYMENTS = 'SHOP/SET_BILL_PAY_PAYMENTS',
  CLEARED_BILL_PAY_PAYMENTS = 'SHOP/CLEARED_BILL_PAY_PAYMENTS',
  TOGGLED_GIFT_CARD_ARCHIVED_STATUS = 'SHOP/TOGGLED_GIFT_CARD_ARCHIVED_STATUS',
  TOGGLED_SYNC_GIFT_CARD_PURCHASES_WITH_BITPAY_ID = 'SHOP/TOGGLED_SYNC_GIFT_CARD_PURCHASES_WITH_BITPAY_ID',
  CLEARED_GIFT_CARDS = 'SHOP/CLEARED_GIFT_CARDS',
  IS_JOINED_WAITLIST = 'SHOP/IS_JOINED_WAITLIST',
}

interface successFetchCatalog {
  type: typeof ShopActionTypes.SUCCESS_FETCH_CATALOG;
  payload: {
    availableCardMap: CardConfigMap;
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
    network: Network;
  };
}
interface setPurchasedGiftCards {
  type: typeof ShopActionTypes.SET_PURCHASED_GIFT_CARDS;
  payload: {
    giftCards: GiftCard[];
    network: Network;
  };
}
interface setBillPayAccounts {
  type: typeof ShopActionTypes.SET_BILL_PAY_ACCOUNTS;
  payload: {
    accounts: BillPayAccount[];
    network: Network;
  };
}
interface clearedBillPayAccounts {
  type: typeof ShopActionTypes.CLEARED_BILL_PAY_ACCOUNTS;
  payload: {
    network: Network;
  };
}
interface setBillPayPayments {
  type: typeof ShopActionTypes.SET_BILL_PAY_PAYMENTS;
  payload: {
    billPayPayments: BillPayPayment[];
    network: Network;
  };
}
interface clearedBillPayPayments {
  type: typeof ShopActionTypes.CLEARED_BILL_PAY_PAYMENTS;
  payload: {
    network: Network;
  };
}
interface deletedUnsoldGiftCard {
  type: typeof ShopActionTypes.DELETED_UNSOLD_GIFT_CARDS;
  payload: {
    network: Network;
  };
}
interface redeemedGiftCard {
  type: typeof ShopActionTypes.REDEEMED_GIFT_CARD;
  payload: {
    giftCard: GiftCard;
    network: Network;
  };
}
interface toggledGiftCardArchivedStatus {
  type: typeof ShopActionTypes.TOGGLED_GIFT_CARD_ARCHIVED_STATUS;
  payload: {
    giftCard: GiftCard;
    network: Network;
  };
}
interface toggledSyncGiftCardPurchasesWithBitPayId {
  type: typeof ShopActionTypes.TOGGLED_SYNC_GIFT_CARD_PURCHASES_WITH_BITPAY_ID;
}
interface updatedEmailAddress {
  type: typeof ShopActionTypes.UPDATED_EMAIL_ADDRESS;
  payload: {
    email: string;
  };
}
interface updatedGiftCardStatus {
  type: typeof ShopActionTypes.UPDATED_GIFT_CARD_STATUS;
  payload: {
    invoiceId: string;
    status: 'PENDING' | 'UNREDEEMED';
    network: Network;
  };
}
interface updatedPhone {
  type: typeof ShopActionTypes.UPDATED_PHONE;
  payload: {
    phone: string;
    phoneCountryInfo: PhoneCountryInfo;
  };
}
interface clearedGiftCards {
  type: typeof ShopActionTypes.CLEARED_GIFT_CARDS;
}

interface isJoinedWaitlist {
  type: ShopActionTypes.IS_JOINED_WAITLIST;
  payload: {isJoinedWaitlist: boolean};
}

export type ShopActionType =
  | successFetchCatalog
  | failedFetchCatalog
  | successCreateGiftCardInvoice
  | failedCreateGiftCardInvoice
  | initializedUnsoldGiftCard
  | setPurchasedGiftCards
  | setBillPayAccounts
  | clearedBillPayAccounts
  | setBillPayPayments
  | clearedBillPayPayments
  | deletedUnsoldGiftCard
  | redeemedGiftCard
  | toggledGiftCardArchivedStatus
  | toggledSyncGiftCardPurchasesWithBitPayId
  | updatedEmailAddress
  | updatedGiftCardStatus
  | updatedPhone
  | clearedGiftCards
  | isJoinedWaitlist;

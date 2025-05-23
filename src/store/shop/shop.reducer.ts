import _ from 'lodash';
import {Network} from '../../constants';
import {
  BillPayAccount,
  BillPayPayment,
  CardConfigMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
  GiftCard,
  PhoneCountryInfo,
  UnsoldGiftCard,
} from './shop.models';
import {ShopActionType, ShopActionTypes} from './shop.types';

type ShopReduxPersistBlackList = string[];
export const shopReduxPersistBlackList: ShopReduxPersistBlackList = [];

export interface ShopState {
  availableCardMap: CardConfigMap; // Legacy field that should now be empty after being moved to the SHOP_CATALOG store
  supportedCardMap: CardConfigMap; // Legacy field that should now be empty after being moved to the SHOP_CATALOG store
  categoriesAndCurations: CategoriesAndCurations; // Legacy field that should now be empty after being moved to the SHOP_CATALOG store
  integrations: DirectIntegrationMap; // Legacy field that should now be empty after being moved to the SHOP_CATALOG store
  email: string;
  phone: string;
  phoneCountryInfo: PhoneCountryInfo;
  billPayAccounts: {
    [key in Network]: BillPayAccount[];
  };
  billPayPayments: {
    [key in Network]: BillPayPayment[];
  };
  giftCards: {
    [key in Network]: (GiftCard | UnsoldGiftCard)[];
  };
  syncGiftCardPurchasesWithBitPayId: boolean;
  isJoinedWaitlist: boolean;
}

export const initialShopState: ShopState = {
  availableCardMap: {},
  supportedCardMap: {},
  categoriesAndCurations: {curated: {}, categories: {}},
  integrations: {},
  email: '',
  phone: '',
  phoneCountryInfo: {
    phoneCountryCode: '',
    countryIsoCode: '',
  },
  billPayAccounts: {
    [Network.mainnet]: [],
    [Network.testnet]: [],
    [Network.regtest]: [],
  },
  billPayPayments: {
    [Network.mainnet]: [],
    [Network.testnet]: [],
    [Network.regtest]: [],
  },
  giftCards: {
    [Network.mainnet]: [],
    [Network.testnet]: [],
    [Network.regtest]: [],
  },
  syncGiftCardPurchasesWithBitPayId: true,
  isJoinedWaitlist: false,
};

export const shopReducer = (
  state: ShopState = initialShopState,
  action: ShopActionType,
): ShopState => {
  switch (action.type) {
    case ShopActionTypes.SUCCESS_FETCH_CATALOG:
      const {availableCardMap, categoriesAndCurations, integrations} =
        action.payload;
      const supportedCardMap = {
        ...(state.supportedCardMap || {}),
        ...availableCardMap,
      };
      return {
        ...state,
        availableCardMap,
        supportedCardMap,
        categoriesAndCurations,
        integrations,
      };
    case ShopActionTypes.HID_GIFT_CARD_COUPON:
      const {giftCardBrand, couponCode} = action.payload;
      const currentCardConfig = state.availableCardMap[giftCardBrand];
      const currentCoupons = state.availableCardMap[giftCardBrand].coupons;
      const newCardConfig = {
        ...currentCardConfig,
        coupons: currentCoupons
          ? currentCoupons.map(coupon => ({
              ...coupon,
              hidden: coupon.code === couponCode,
            }))
          : [],
      };
      return {
        ...state,
        availableCardMap: {
          ...state.availableCardMap,
          [giftCardBrand]: newCardConfig,
        },
      };
    case ShopActionTypes.INITIALIZED_UNSOLD_GIFT_CARD:
      const {giftCard} = action.payload;
      return {
        ...state,
        giftCards: {
          ...state.giftCards,
          [action.payload.network]:
            state.giftCards[action.payload.network].concat(giftCard),
        },
      };
    case ShopActionTypes.SET_PURCHASED_GIFT_CARDS:
      const {giftCards} = action.payload;
      return {
        ...state,
        giftCards: {
          ...state.giftCards,
          [action.payload.network]: giftCards,
        },
      };
    case ShopActionTypes.SET_BILL_PAY_ACCOUNTS:
      const {accounts} = action.payload;
      return {
        ...state,
        billPayAccounts: {
          ...state.billPayAccounts,
          [action.payload.network]: accounts,
        },
      };
    case ShopActionTypes.CLEARED_BILL_PAY_ACCOUNTS:
      return {
        ...state,
        billPayAccounts: {
          ...state.billPayAccounts,
          [action.payload.network]: [],
        },
      };
    case ShopActionTypes.SET_BILL_PAY_PAYMENTS:
      const {billPayPayments} = action.payload;
      return {
        ...state,
        billPayPayments: {
          ...state.billPayPayments,
          [action.payload.network]: _.uniqBy(
            [
              ...billPayPayments,
              ...state.billPayPayments[action.payload.network],
            ],
            billPayPayment => billPayPayment.id,
          ),
        },
      };
    case ShopActionTypes.CLEARED_BILL_PAY_PAYMENTS:
      return {
        ...state,
        billPayPayments: {
          ...state.billPayPayments,
          [action.payload.network]: [],
        },
      };
    case ShopActionTypes.DELETED_UNSOLD_GIFT_CARDS:
      return {
        ...state,
        giftCards: {
          ...state.giftCards,
          [action.payload.network]: state.giftCards[
            action.payload.network
          ].filter(card => card.status !== 'UNREDEEMED'),
        },
      };
    case ShopActionTypes.REDEEMED_GIFT_CARD:
      const {giftCard: redeemedGiftCard} = action.payload;
      return {
        ...state,
        giftCards: {
          ...state.giftCards,
          [action.payload.network]: state.giftCards[action.payload.network].map(
            card =>
              card.invoiceId === redeemedGiftCard.invoiceId
                ? {...card, ...redeemedGiftCard}
                : card,
          ),
        },
      };
    case ShopActionTypes.TOGGLED_GIFT_CARD_ARCHIVED_STATUS:
      const {giftCard: archivableGiftCard} = action.payload;
      return {
        ...state,
        giftCards: {
          ...state.giftCards,
          [action.payload.network]: state.giftCards[action.payload.network].map(
            card =>
              card.invoiceId === archivableGiftCard.invoiceId
                ? {...card, archived: !archivableGiftCard.archived}
                : card,
          ),
        },
      };
    case ShopActionTypes.TOGGLED_SYNC_GIFT_CARD_PURCHASES_WITH_BITPAY_ID:
      return {
        ...state,
        syncGiftCardPurchasesWithBitPayId:
          !state.syncGiftCardPurchasesWithBitPayId,
      };
    case ShopActionTypes.UPDATED_EMAIL_ADDRESS:
      const {email} = action.payload;
      return {
        ...state,
        email,
      };
    case ShopActionTypes.UPDATED_GIFT_CARD_STATUS:
      const {invoiceId: invoiceIdToUpdate, status} = action.payload;
      return {
        ...state,
        giftCards: {
          ...state.giftCards,
          [action.payload.network]: state.giftCards[action.payload.network].map(
            card =>
              card.invoiceId === invoiceIdToUpdate ? {...card, status} : card,
          ),
        },
      };
    case ShopActionTypes.UPDATED_PHONE:
      const {phone, phoneCountryInfo} = action.payload;
      return {
        ...state,
        phone,
        phoneCountryInfo,
      };
    case ShopActionTypes.CLEARED_GIFT_CARDS:
      return {
        ...state,
        giftCards: {
          [Network.mainnet]: [],
          [Network.testnet]: [],
          [Network.regtest]: [],
        },
      };

    case ShopActionTypes.CLEARED_SHOP_CATALOG_FIELDS:
      return {
        ...state,
        supportedCardMap: {},
        availableCardMap: {},
        categoriesAndCurations: {curated: {}, categories: {}},
        integrations: {},
      };

    case ShopActionTypes.IS_JOINED_WAITLIST:
      return {
        ...state,
        isJoinedWaitlist: action.payload.isJoinedWaitlist,
      };

    default:
      return state;
  }
};

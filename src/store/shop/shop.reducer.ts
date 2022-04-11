import {Network} from '../../constants';
import {APP_NETWORK} from '../../constants/config';
import {
  AvailableCardMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
  GiftCard,
  PhoneCountryInfo,
  UnsoldGiftCard,
} from './shop.models';
import {ShopActionType, ShopActionTypes} from './shop.types';

type ShopReduxPersistBlackList = [];
export const shopReduxPersistBlackList: ShopReduxPersistBlackList = [];

export interface ShopState {
  availableCardMap: AvailableCardMap;
  supportedCardMap: AvailableCardMap;
  categoriesAndCurations: CategoriesAndCurations;
  integrations: DirectIntegrationMap;
  email: string;
  phone: string;
  phoneCountryInfo: PhoneCountryInfo;
  giftCards: {
    [key in Network]: (GiftCard | UnsoldGiftCard)[];
  };
}

const initialState: ShopState = {
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
  giftCards: {
    [Network.mainnet]: [],
    [Network.testnet]: [],
  },
};

export const shopReducer = (
  state: ShopState = initialState,
  action: ShopActionType,
): ShopState => {
  switch (action.type) {
    case ShopActionTypes.SUCCESS_FETCH_CATALOG:
      const {availableCardMap, categoriesAndCurations, integrations} =
        action.payload;
      return {
        ...state,
        availableCardMap,
        supportedCardMap: {
          ...(state.supportedCardMap || {}),
          ...availableCardMap,
        },
        categoriesAndCurations,
        integrations,
      };
    case ShopActionTypes.INITIALIZED_UNSOLD_GIFT_CARD:
      const {giftCard} = action.payload;
      return {
        ...state,
        giftCards: {
          ...state.giftCards,
          [APP_NETWORK]: state.giftCards[APP_NETWORK].concat(giftCard),
        },
      };
    case ShopActionTypes.DELETED_UNSOLD_GIFT_CARD:
      const {invoiceId} = action.payload;
      return {
        ...state,
        giftCards: {
          ...state.giftCards,
          [APP_NETWORK]: state.giftCards[APP_NETWORK].filter(
            card => card.invoiceId !== invoiceId,
          ),
        },
      };
    case ShopActionTypes.REDEEMED_GIFT_CARD:
      const {giftCard: redeemedGiftCard} = action.payload;
      return {
        ...state,
        giftCards: {
          ...state.giftCards,
          [APP_NETWORK]: state.giftCards[APP_NETWORK].map(card =>
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
          [APP_NETWORK]: state.giftCards[APP_NETWORK].map(card =>
            card.invoiceId === archivableGiftCard.invoiceId
              ? {...card, archived: !archivableGiftCard.archived}
              : card,
          ),
        },
      };
    case ShopActionTypes.UPDATED_EMAIL_ADDRESS:
      const {email} = action.payload;
      return {
        ...state,
        email,
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
        },
      };

    default:
      return state;
  }
};

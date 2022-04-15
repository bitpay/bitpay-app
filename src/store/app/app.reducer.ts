import i18n from 'i18next';
import {ColorSchemeName} from 'react-native';
import {ContentCard} from 'react-native-appboy-sdk';
import {Network} from '../../constants';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../constants/config';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {PinModalConfig} from '../../components/modal/pin/PinModal';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {DecryptPasswordConfig} from '../../navigation/wallet/components/DecryptEnterPasswordModal';
import {NavScreenParams, RootStackParamList} from '../../Root';
import {
  AppIdentity,
  HomeCarouselConfig,
  HomeCarouselLayoutType,
} from './app.models';
import {AppActionType, AppActionTypes} from './app.types';
import {SettingsListType} from '../../navigation/tabs/settings/SettingsRoot';
import {AltCurrenciesRowProps} from '../../components/list/AltCurrenciesRow';

type AppReduxPersistBlackList = [
  'appIsLoading',
  'showOnGoingProcessModal',
  'onGoingProcessModalMessage',
  'showDecryptPasswordModal',
  'showPinModal',
  'pinModalConfig',
  'showBottomNotificationModal',
  'showBiometricModal',
  'dismissBiometricModal',
  'checkingBiometric',
];
export const appReduxPersistBlackList: AppReduxPersistBlackList = [
  'appIsLoading',
  'showOnGoingProcessModal',
  'onGoingProcessModalMessage',
  'showDecryptPasswordModal',
  'showPinModal',
  'pinModalConfig',
  'showBottomNotificationModal',
  'showBiometricModal',
  'dismissBiometricModal',
  'checkingBiometric',
];

export interface AppState {
  identity: {
    [key in Network]: AppIdentity;
  };
  network: Network;
  baseBitPayURL: string;
  appIsLoading: boolean;
  introCompleted: boolean;
  onboardingCompleted: boolean;
  showOnGoingProcessModal: boolean;
  onGoingProcessModalMessage: string | undefined;
  showBottomNotificationModal: boolean;
  bottomNotificationModalConfig: BottomNotificationConfig | undefined;
  currentRoute: [keyof RootStackParamList, NavScreenParams] | undefined;
  notificationsAccepted: boolean;
  showOnboardingFinishModal: boolean;
  showDecryptPasswordModal: boolean;
  decryptPasswordConfig: DecryptPasswordConfig | undefined;
  showPinModal: boolean;
  pinModalConfig: PinModalConfig | undefined;
  pinLockActive: boolean;
  currentPin: string | undefined;
  pinBannedUntil: number | undefined;
  showBlur: boolean;
  colorScheme: ColorSchemeName;
  defaultLanguage: string;
  showPortfolioValue: boolean;
  brazeContentCards: ContentCard[];
  showBiometricModal: boolean;
  biometricLockActive: boolean;
  lockAuthorizedUntil: number | undefined;
  homeCarouselConfig: HomeCarouselConfig[] | [];
  homeCarouselLayoutType: HomeCarouselLayoutType;
  settingsListConfig: SettingsListType[];
  altCurrencyList: Array<AltCurrenciesRowProps>;
  defaultAltCurrency: AltCurrenciesRowProps;
}

const initialState: AppState = {
  identity: {
    [Network.mainnet]: {
      priv: '',
      pub: '',
      sin: '',
    },
    [Network.testnet]: {
      priv: '',
      pub: '',
      sin: '',
    },
  },
  network: APP_NETWORK,
  baseBitPayURL: BASE_BITPAY_URLS[Network.mainnet],
  appIsLoading: true,
  introCompleted: false,
  onboardingCompleted: false,
  showOnGoingProcessModal: false,
  onGoingProcessModalMessage: OnGoingProcessMessages.GENERAL_AWAITING,
  showBottomNotificationModal: false,
  bottomNotificationModalConfig: undefined,
  currentRoute: undefined,
  notificationsAccepted: false,
  showOnboardingFinishModal: false,
  showDecryptPasswordModal: false,
  decryptPasswordConfig: undefined,
  showPinModal: false,
  pinModalConfig: undefined,
  pinLockActive: false,
  currentPin: undefined,
  pinBannedUntil: undefined,
  showBlur: false,
  colorScheme: null,
  defaultLanguage: i18n.language || 'en',
  showPortfolioValue: true,
  brazeContentCards: [],
  showBiometricModal: false,
  biometricLockActive: false,
  lockAuthorizedUntil: undefined,
  homeCarouselConfig: [],
  homeCarouselLayoutType: 'listView',
  settingsListConfig: [],
  altCurrencyList: [],
  defaultAltCurrency: {isoCode: 'USD', name: 'US Dollar'},
};

export const appReducer = (
  state: AppState = initialState,
  action: AppActionType,
): AppState => {
  switch (action.type) {
    case AppActionTypes.NETWORK_CHANGED:
      return {
        ...state,
        network: action.payload,
      };

    case AppActionTypes.SUCCESS_APP_INIT:
      return {
        ...state,
        appIsLoading: false,
      };

    case AppActionTypes.SET_ONBOARDING_COMPLETED:
      return {
        ...state,
        onboardingCompleted: true,
      };

    case AppActionTypes.SET_INTRO_COMPLETED:
      return {
        ...state,
        introCompleted: true,
      };

    case AppActionTypes.SHOW_ONGOING_PROCESS_MODAL:
      return {
        ...state,
        showOnGoingProcessModal: true,
        onGoingProcessModalMessage: action.payload,
      };

    case AppActionTypes.DISMISS_ONGOING_PROCESS_MODAL:
      return {
        ...state,
        showOnGoingProcessModal: false,
      };

    case AppActionTypes.SHOW_BOTTOM_NOTIFICATION_MODAL:
      return {
        ...state,
        showBottomNotificationModal: true,
        bottomNotificationModalConfig: action.payload,
      };

    case AppActionTypes.DISMISS_BOTTOM_NOTIFICATION_MODAL:
      return {
        ...state,
        showBottomNotificationModal: false,
      };

    case AppActionTypes.RESET_BOTTOM_NOTIFICATION_MODAL_CONFIG:
      return {
        ...state,
        bottomNotificationModalConfig: undefined,
      };

    case AppActionTypes.SET_COLOR_SCHEME:
      return {
        ...state,
        colorScheme: action.payload,
      };

    case AppActionTypes.SET_CURRENT_ROUTE:
      return {
        ...state,
        currentRoute: action.payload,
      };

    case AppActionTypes.SUCCESS_GENERATE_APP_IDENTITY:
      const {network, identity} = action.payload;

      return {
        ...state,
        identity: {
          ...state.identity,
          [network]: identity,
        },
      };

    case AppActionTypes.SET_NOTIFICATIONS_ACCEPTED:
      return {
        ...state,
        notificationsAccepted: action.payload,
      };

    case AppActionTypes.SHOW_ONBOARDING_FINISH_MODAL:
      return {
        ...state,
        showOnboardingFinishModal: true,
      };

    case AppActionTypes.DISMISS_ONBOARDING_FINISH_MODAL:
      return {
        ...state,
        showOnboardingFinishModal: false,
      };

    case AppActionTypes.SET_DEFAULT_LANGUAGE:
      return {
        ...state,
        defaultLanguage: action.payload,
      };

    case AppActionTypes.SHOW_DECRYPT_PASSWORD_MODAL:
      return {
        ...state,
        showDecryptPasswordModal: true,
        decryptPasswordConfig: action.payload,
      };

    case AppActionTypes.DISMISS_DECRYPT_PASSWORD_MODAL:
      return {
        ...state,
        showDecryptPasswordModal: false,
      };

    case AppActionTypes.RESET_DECRYPT_PASSWORD_CONFIG:
      return {
        ...state,
        decryptPasswordConfig: undefined,
      };

    case AppActionTypes.SHOW_PIN_MODAL:
      return {
        ...state,
        showPinModal: true,
        pinModalConfig: action.payload,
      };

    case AppActionTypes.DISMISS_PIN_MODAL:
      return {
        ...state,
        showPinModal: false,
        pinModalConfig: undefined,
      };

    case AppActionTypes.PIN_LOCK_ACTIVE:
      return {
        ...state,
        pinLockActive: action.payload,
      };

    case AppActionTypes.CURRENT_PIN:
      return {
        ...state,
        currentPin: action.payload,
      };

    case AppActionTypes.PIN_BANNED_UNTIL:
      return {
        ...state,
        pinBannedUntil: action.payload,
      };

    case AppActionTypes.SHOW_BLUR:
      return {
        ...state,
        showBlur: action.payload,
      };

    case AppActionTypes.SHOW_PORTFOLIO_VALUE:
      return {
        ...state,
        showPortfolioValue: action.payload,
      };

    case AppActionTypes.BRAZE_CONTENT_CARDS_FETCHED:
      if (
        state.brazeContentCards.length === 0 &&
        action.payload.contentCards.length === 0
      ) {
        return state;
      }

      return {
        ...state,
        brazeContentCards: action.payload.contentCards,
      };

    case AppActionTypes.SHOW_BIOMETRIC_MODAL:
      return {
        ...state,
        showBiometricModal: true,
      };

    case AppActionTypes.DISMISS_BIOMETRIC_MODAL:
      return {
        ...state,
        showBiometricModal: false,
      };

    case AppActionTypes.BIOMETRIC_LOCK_ACTIVE:
      return {
        ...state,
        biometricLockActive: action.payload,
      };

    case AppActionTypes.LOCK_AUTHORIZED_UNTIL:
      return {
        ...state,
        lockAuthorizedUntil: action.payload,
      };

    case AppActionTypes.SET_HOME_CAROUSEL_CONFIG:
      if (state.homeCarouselConfig) {
        if (Array.isArray(action.payload)) {
          return {
            ...state,
            homeCarouselConfig: action.payload,
          };
        }

        return {
          ...state,
          homeCarouselConfig: [...state.homeCarouselConfig, action.payload],
        };
      }
      return state;

    case AppActionTypes.SET_HOME_CAROUSEL_LAYOUT_TYPE:
      return {
        ...state,
        homeCarouselLayoutType: action.payload,
      };

    case AppActionTypes.UPDATE_SETTINGS_LIST_CONFIG:
      const item = action.payload;
      let newList = [...state.settingsListConfig];
      if (newList.includes(item)) {
        newList.splice(newList.indexOf(item), 1);
      } else {
        newList.push(item);
      }
      return {
        ...state,
        settingsListConfig: newList,
      };

    case AppActionTypes.ADD_ALT_CURRENCIES_LIST:
      return {
        ...state,
        altCurrencyList: action.altCurrencyList,
      };

    case AppActionTypes.SET_DEFAULT_ALT_CURRENCY:
      return {
        ...state,
        defaultAltCurrency: action.defaultAltCurrency,
      };

    default:
      return state;
  }
};

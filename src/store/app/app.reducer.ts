import i18n from 'i18next';
import {ColorSchemeName, EventSubscription} from 'react-native';
import {ContentCard} from 'react-native-appboy-sdk';
import {AltCurrenciesRowProps} from '../../components/list/AltCurrenciesRow';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {PinModalConfig} from '../../components/modal/pin/PinModal';
import {Network} from '../../constants';
import {
  APP_NETWORK,
  APP_VERSION,
  BASE_BITPAY_URLS,
} from '../../constants/config';
import {SettingsListType} from '../../navigation/tabs/settings/SettingsRoot';
import {DecryptPasswordConfig} from '../../navigation/wallet/components/DecryptEnterPasswordModal';
import {NavScreenParams, RootStackParamList} from '../../Root';
import {
  AppIdentity,
  HomeCarouselConfig,
  HomeCarouselLayoutType,
} from './app.models';
import {AppActionType, AppActionTypes} from './app.types';
import uniqBy from 'lodash.uniqby';
import {BiometricModalConfig} from '../../components/modal/biometric/BiometricModal';
import {FeedbackRateType} from '../../navigation/tabs/settings/about/screens/SendFeedback';
import moment from 'moment';

export const appReduxPersistBlackList: Array<keyof AppState> = [
  'appIsLoading',
  'appWasInit',
  'showOnGoingProcessModal',
  'onGoingProcessModalMessage',
  'showDecryptPasswordModal',
  'showPinModal',
  'pinModalConfig',
  'showBottomNotificationModal',
  'showBiometricModal',
  'biometricModalConfig',
  'activeModalId',
  'failedAppInit',
  'brazeContentCardSubscription',
  'expectedKeyLengthChange',
];

export type ModalId = 'sheetModal' | 'ongoingProcess' | 'pin';

export type FeedbackType = {
  time: number;
  version: string;
  sent: boolean;
  rate: FeedbackRateType;
};

export type AppFirstOpenData = {
  firstOpenEventComplete: boolean;
  firstOpenDate: number | undefined;
};

export interface AppState {
  identity: {
    [key in Network]: AppIdentity;
  };
  network: Network;
  baseBitPayURL: string;
  /**
   * Whether the app is still initializing data.
   */
  appIsLoading: boolean;

  /**
   * Whether the app is done initializing data and animations are complete.
   */
  appWasInit: boolean;
  /**
   * Whether app has completed a set of conditions before handling deeplinks/deferred deeplinks.
   */
  appIsReadyForDeeplinking: boolean;
  appFirstOpenData: AppFirstOpenData;
  introCompleted: boolean;
  userFeedback: FeedbackType;
  onboardingCompleted: boolean;
  showOnGoingProcessModal: boolean;
  onGoingProcessModalMessage: string | undefined;
  showBottomNotificationModal: boolean;
  bottomNotificationModalConfig: BottomNotificationConfig | undefined;
  currentRoute: [keyof RootStackParamList, NavScreenParams] | undefined;
  notificationsAccepted: boolean;
  confirmedTxAccepted: boolean;
  announcementsAccepted: boolean;
  emailNotifications: {
    accepted: boolean;
    email: string | null;
  };
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
  brazeContentCardSubscription: EventSubscription | null;
  brazeContentCards: ContentCard[];
  brazeEid: string | undefined;
  showBiometricModal: boolean;
  biometricModalConfig: BiometricModalConfig | undefined;
  biometricLockActive: boolean;
  lockAuthorizedUntil: number | undefined;
  homeCarouselConfig: HomeCarouselConfig[] | [];
  homeCarouselLayoutType: HomeCarouselLayoutType;
  settingsListConfig: SettingsListType[];
  altCurrencyList: Array<AltCurrenciesRowProps>;
  defaultAltCurrency: AltCurrenciesRowProps;
  recentDefaultAltCurrency: Array<AltCurrenciesRowProps>;
  migrationComplete: boolean;
  keyMigrationFailure: boolean;
  showKeyMigrationFailureModal: boolean;
  keyMigrationFailureModalHasBeenShown: boolean;
  activeModalId: ModalId | null;
  failedAppInit: boolean;
  checkingBiometricForSending: boolean;
  hasViewedZenLedgerWarning: boolean;
  expectedKeyLengthChange: number;
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
  appWasInit: false,
  appIsReadyForDeeplinking: false,
  appFirstOpenData: {firstOpenEventComplete: false, firstOpenDate: undefined},
  introCompleted: false,
  userFeedback: {
    time: moment().unix(),
    version: APP_VERSION,
    sent: false,
    rate: 'default',
  },
  onboardingCompleted: false,
  showOnGoingProcessModal: false,
  onGoingProcessModalMessage: undefined,
  showBottomNotificationModal: false,
  bottomNotificationModalConfig: undefined,
  currentRoute: undefined,
  notificationsAccepted: false,
  confirmedTxAccepted: false,
  announcementsAccepted: false,
  emailNotifications: {
    accepted: false,
    email: null,
  },
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
  brazeContentCardSubscription: null,
  brazeContentCards: [],
  brazeEid: undefined,
  showBiometricModal: false,
  biometricModalConfig: undefined,
  biometricLockActive: false,
  lockAuthorizedUntil: undefined,
  homeCarouselConfig: [],
  homeCarouselLayoutType: 'listView',
  settingsListConfig: [],
  altCurrencyList: [],
  defaultAltCurrency: {isoCode: 'USD', name: 'US Dollar'},
  recentDefaultAltCurrency: [],
  migrationComplete: false,
  keyMigrationFailure: false,
  showKeyMigrationFailureModal: false,
  keyMigrationFailureModalHasBeenShown: false,
  activeModalId: null,
  failedAppInit: false,
  checkingBiometricForSending: false,
  hasViewedZenLedgerWarning: false,
  expectedKeyLengthChange: 0,
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

    case AppActionTypes.APP_INIT_COMPLETE:
      return {
        ...state,
        appWasInit: true,
      };

    case AppActionTypes.APP_READY_FOR_DEEPLINKING:
      return {
        ...state,
        appIsReadyForDeeplinking: true,
      };

    case AppActionTypes.SET_APP_FIRST_OPEN_EVENT_COMPLETE:
      return {
        ...state,
        appFirstOpenData: {
          ...state.appFirstOpenData,
          firstOpenEventComplete: true,
        },
      };

    case AppActionTypes.SET_APP_FIRST_OPEN_DATE:
      return {
        ...state,
        appFirstOpenData: {
          ...state.appFirstOpenData,
          firstOpenDate: action.payload,
        },
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

    case AppActionTypes.SET_CONFIRMED_TX_ACCEPTED:
      return {
        ...state,
        confirmedTxAccepted: action.payload,
      };

    case AppActionTypes.SET_ANNOUNCEMENTS_ACCEPTED:
      return {
        ...state,
        announcementsAccepted: action.payload,
      };

    case AppActionTypes.SET_EMAIL_NOTIFICATIONS_ACCEPTED:
      return {
        ...state,
        emailNotifications: {
          accepted: action.payload.accepted,
          email: action.payload.email,
        },
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

    case AppActionTypes.BRAZE_INITIALIZED:
      return {
        ...state,
        brazeContentCardSubscription: action.payload.contentCardSubscription,
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

    case AppActionTypes.SET_BRAZE_EID:
      return {
        ...state,
        brazeEid: action.payload,
      };

    case AppActionTypes.SHOW_BIOMETRIC_MODAL:
      return {
        ...state,
        showBiometricModal: true,
        biometricModalConfig: action.payload,
      };

    case AppActionTypes.DISMISS_BIOMETRIC_MODAL:
      return {
        ...state,
        showBiometricModal: false,
        biometricModalConfig: undefined,
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
      let recentDefaultAltCurrency = [...state.recentDefaultAltCurrency];
      recentDefaultAltCurrency.unshift(action.defaultAltCurrency);
      recentDefaultAltCurrency = uniqBy(
        recentDefaultAltCurrency,
        'isoCode',
      ).slice(0, 3);
      return {
        ...state,
        defaultAltCurrency: action.defaultAltCurrency,
        recentDefaultAltCurrency,
      };

    case AppActionTypes.SET_MIGRATION_COMPLETE:
      return {
        ...state,
        migrationComplete: true,
      };

    case AppActionTypes.SET_KEY_MIGRATION_FAILURE:
      return {
        ...state,
        keyMigrationFailure: true,
      };

    case AppActionTypes.SET_SHOW_KEY_MIGRATION_FAILURE_MODAL:
      return {
        ...state,
        showKeyMigrationFailureModal: action.payload,
      };

    case AppActionTypes.SET_KEY_MIGRATION_FAILURE_MODAL_HAS_BEEN_SHOWN:
      return {
        ...state,
        keyMigrationFailureModalHasBeenShown: true,
      };

    case AppActionTypes.ACTIVE_MODAL_UPDATED:
      return {
        ...state,
        activeModalId: action.payload,
      };

    case AppActionTypes.FAILED_APP_INIT:
      return {
        ...state,
        failedAppInit: action.payload,
      };

    case AppActionTypes.CHECKING_BIOMETRIC_FOR_SENDING:
      return {
        ...state,
        checkingBiometricForSending: action.payload,
      };

    case AppActionTypes.SET_HAS_VIEWED_ZENLEDGER_WARNING:
      return {
        ...state,
        hasViewedZenLedgerWarning: true,
      };

    case AppActionTypes.USER_FEEDBACK:
      return {
        ...state,
        userFeedback: action.payload,
      };

    case AppActionTypes.EXPECTED_KEY_LENGTH_CHANGE:
      return {
        ...state,
        expectedKeyLengthChange: action.payload,
      };

    default:
      return state;
  }
};

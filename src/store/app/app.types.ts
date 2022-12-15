import {ColorSchemeName, EventSubscription} from 'react-native';
import {ContentCard} from 'react-native-appboy-sdk';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {PinModalConfig} from '../../components/modal/pin/PinModal';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {Network} from '../../constants';
import {DecryptPasswordConfig} from '../../navigation/wallet/components/DecryptEnterPasswordModal';
import {NavScreenParams, RootStackParamList} from '../../Root';
import {
  AppIdentity,
  HomeCarouselConfig,
  HomeCarouselLayoutType,
} from './app.models';
import {SettingsListType} from '../../navigation/tabs/settings/SettingsRoot';
import {AltCurrenciesRowProps} from '../../components/list/AltCurrenciesRow';
import {ModalId} from './app.reducer';
import {BiometricModalConfig} from '../../components/modal/biometric/BiometricModal';

export enum AppActionTypes {
  NETWORK_CHANGED = 'APP/NETWORK_CHANGED',
  SUCCESS_APP_INIT = 'APP/SUCCESS_APP_INIT',
  APP_INIT_COMPLETE = 'APP/APP_INIT_COMPLETE',
  FAILED_APP_INIT = 'APP/FAILED_APP_INIT',
  APP_READY_FOR_DEEPLINKING = 'APP/READY_FOR_DEEPLINKING',
  APP_OPENING_WAS_TRACKED = 'APP/OPENING_WAS_TRACKED',
  SET_APP_FIRST_OPEN_EVENT_COMPLETE = 'APP/SET_APP_FIRST_OPEN_EVENT_COMPLETE',
  SET_APP_FIRST_OPEN_DATE = 'APP/SET_APP_FIRST_OPEN_DATE',
  SET_INTRO_COMPLETED = 'APP/SET_INTRO_COMPLETED',
  SET_ONBOARDING_COMPLETED = 'APP/SET_ONBOARDING_COMPLETED',
  SHOW_ONGOING_PROCESS_MODAL = 'APP/SHOW_ONGOING_PROCESS_MODAL',
  DISMISS_ONGOING_PROCESS_MODAL = 'APP/DISMISS_ONGOING_PROCESS_MODAL',
  SHOW_BOTTOM_NOTIFICATION_MODAL = 'APP/SHOW_BOTTOM_NOTIFICATION_MODAL',
  DISMISS_BOTTOM_NOTIFICATION_MODAL = 'APP/DISMISS_BOTTOM_NOTIFICATION_MODAL',
  RESET_BOTTOM_NOTIFICATION_MODAL_CONFIG = 'APP/RESET_BOTTOM_NOTIFICATION_MODAL_CONFIG',
  SET_COLOR_SCHEME = 'APP/SET_COLOR_SCHEME',
  SET_CURRENT_ROUTE = 'APP/SET_CURRENT_ROUTE',
  SUCCESS_GENERATE_APP_IDENTITY = 'APP/SUCCESS_GENERATE_APP_IDENTITY',
  FAILED_GENERATE_APP_IDENTITY = 'APP/FAILED_GENERATE_APP_IDENTITY',
  SET_NOTIFICATIONS_ACCEPTED = 'APP/SET_NOTIFICATIONS_ACCEPTED',
  SET_CONFIRMED_TX_ACCEPTED = 'APP/SET_CONFIRMED_TX_ACCEPTED',
  SET_ANNOUNCEMENTS_ACCEPTED = 'APP/SET_ANNOUNCEMENTS_ACCEPTED',
  SET_EMAIL_NOTIFICATIONS_ACCEPTED = 'APP/SET_EMAIL_NOTIFICATIONS_ACCEPTED',
  SHOW_ONBOARDING_FINISH_MODAL = 'APP/SHOW_ONBOARDING_FINISH_MODAL',
  DISMISS_ONBOARDING_FINISH_MODAL = 'APP/DISMISS_ONBOARDING_FINISH_MODAL',
  SHOW_DECRYPT_PASSWORD_MODAL = 'APP/SHOW_DECRYPT_PASSWORD_MODAL',
  DISMISS_DECRYPT_PASSWORD_MODAL = 'APP/DISMISS_DECRYPT_PASSWORD_MODAL',
  SET_DEFAULT_LANGUAGE = 'APP/SET_DEFAULT_LANGUAGE',
  RESET_DECRYPT_PASSWORD_CONFIG = 'APP/RESET_DECRYPT_PASSWORD_CONFIG',
  SHOW_PIN_MODAL = 'APP/SHOW_PIN_MODAL',
  DISMISS_PIN_MODAL = 'APP/DISMISS_PIN_MODAL',
  PIN_LOCK_ACTIVE = 'APP/PIN_LOCK_ACTIVE',
  CURRENT_PIN = 'APP/CURRENT_PIN',
  PIN_BANNED_UNTIL = 'APP/PIN_BANNED_UNTIL',
  SHOW_BLUR = 'APP/SHOW_BLUR',
  SHOW_PORTFOLIO_VALUE = 'APP/SHOW_PORTFOLIO_VALUE',
  BRAZE_INITIALIZED = 'APP/BRAZE_INITIALIZED',
  BRAZE_CONTENT_CARDS_FETCHED = 'APP/BRAZE_CONTENT_CARDS_FETCHED',
  SET_BRAZE_EID = 'APP/SET_BRAZE_EID',
  SHOW_BIOMETRIC_MODAL = 'APP/SHOW_BIOMETRIC_MODAL',
  DISMISS_BIOMETRIC_MODAL = 'APP/DISMISS_BIOMETRIC_MODAL',
  BIOMETRIC_LOCK_ACTIVE = 'APP/BIOMETRIC_LOCK_ACTIVE',
  LOCK_AUTHORIZED_UNTIL = 'APP/LOCK_AUTHORIZED_UNTIL',
  SET_HOME_CAROUSEL_CONFIG = 'APP/SET_HOME_CAROUSEL_CONFIG',
  SET_HOME_CAROUSEL_LAYOUT_TYPE = 'APP/SET_HOME_CAROUSEL_LAYOUT_TYPE',
  UPDATE_SETTINGS_LIST_CONFIG = 'APP/UPDATE_SETTINGS_LIST_CONFIG',
  ADD_ALT_CURRENCIES_LIST = 'APP/ADD_ALT_CURRENCIES_LIST',
  SET_DEFAULT_ALT_CURRENCY = 'APP/SET_DEFAULT_ALT_CURRENCY',
  SET_MIGRATION_COMPLETE = 'APP/SET_MIGRATION_COMPLETE',
  SET_KEY_MIGRATION_FAILURE = 'APP/SET_KEY_MIGRATION_FAILURE',
  SET_SHOW_KEY_MIGRATION_FAILURE_MODAL = 'APP/SET_SHOW_KEY_MIGRATION_FAILURE_MODAL',
  SET_KEY_MIGRATION_FAILURE_MODAL_HAS_BEEN_SHOWN = 'APP/SET_KEY_MIGRATION_FAILURE_MODAL_HAS_BEEN_SHOWN',
  ACTIVE_MODAL_UPDATED = 'APP/ACTIVE_MODAL_UPDATED',
  CHECKING_BIOMETRIC_FOR_SENDING = 'APP/CHECKING_BIOMETRIC_FOR_SENDING',
  UPDATE_ON_COMPLETE_ONBOARDING_LIST = 'APP/UPDATE_ON_COMPLETE_ONBOARDING_LIST',
  CLEAR_ON_COMPLETE_ONBOARDING_LIST = 'APP/CLEAR_ON_COMPLETE_ONBOARDING_LIST',
  SET_HAS_VIEWED_ZENLEDGER_WARNING = 'APP/SET_HAS_VIEWED_ZENLEDGER_WARNING',
}

interface NetworkChanged {
  type: typeof AppActionTypes.NETWORK_CHANGED;
  payload: Network;
}

interface SuccessAppInit {
  type: typeof AppActionTypes.SUCCESS_APP_INIT;
}

interface AppInitComplete {
  type: typeof AppActionTypes.APP_INIT_COMPLETE;
}

interface FailedAppInit {
  type: typeof AppActionTypes.FAILED_APP_INIT;
  payload: boolean;
}

interface AppIsReadyForDeeplinking {
  type: typeof AppActionTypes.APP_READY_FOR_DEEPLINKING;
}

interface setAppFirstOpenEventComplete {
  type: typeof AppActionTypes.SET_APP_FIRST_OPEN_EVENT_COMPLETE;
}

interface setAppFirstOpenDate {
  type: typeof AppActionTypes.SET_APP_FIRST_OPEN_DATE;
  payload: number;
}

interface AppOpeningWasTracked {
  type: typeof AppActionTypes.APP_OPENING_WAS_TRACKED;
}

interface SetIntroCompleted {
  type: typeof AppActionTypes.SET_INTRO_COMPLETED;
}

interface SetOnboardingCompleted {
  type: typeof AppActionTypes.SET_ONBOARDING_COMPLETED;
}

interface ShowOnGoingProcessModal {
  type: typeof AppActionTypes.SHOW_ONGOING_PROCESS_MODAL;
  payload: OnGoingProcessMessages;
}

interface DismissOnGoingProcessModal {
  type: typeof AppActionTypes.DISMISS_ONGOING_PROCESS_MODAL;
}

interface ShowBottomNotificationModal {
  type: typeof AppActionTypes.SHOW_BOTTOM_NOTIFICATION_MODAL;
  payload: BottomNotificationConfig;
}

interface DismissBottomNotificationModal {
  type: typeof AppActionTypes.DISMISS_BOTTOM_NOTIFICATION_MODAL;
}

interface ResetBottomNotificationModalConfig {
  type: typeof AppActionTypes.RESET_BOTTOM_NOTIFICATION_MODAL_CONFIG;
}

interface SetColorScheme {
  type: typeof AppActionTypes.SET_COLOR_SCHEME;
  payload: ColorSchemeName;
}

interface SetCurrentRoute {
  type: typeof AppActionTypes.SET_CURRENT_ROUTE;
  payload: [keyof RootStackParamList, NavScreenParams];
}

interface SuccessGenerateAppIdentity {
  type: typeof AppActionTypes.SUCCESS_GENERATE_APP_IDENTITY;
  payload: {network: Network; identity: AppIdentity};
}

interface FailedGenerateAppIdentity {
  type: typeof AppActionTypes.FAILED_GENERATE_APP_IDENTITY;
}

interface SetNotificationsAccepted {
  type: typeof AppActionTypes.SET_NOTIFICATIONS_ACCEPTED;
  payload: boolean;
}

interface SetConfirmedTxAccepted {
  type: typeof AppActionTypes.SET_CONFIRMED_TX_ACCEPTED;
  payload: boolean;
}

interface SetAnnouncementsAccepted {
  type: typeof AppActionTypes.SET_ANNOUNCEMENTS_ACCEPTED;
  payload: boolean;
}

interface SetEmailNotificationsAccepted {
  type: typeof AppActionTypes.SET_EMAIL_NOTIFICATIONS_ACCEPTED;
  payload: {accepted: boolean; email: string | null};
}

interface ShowOnboardingFinishModal {
  type: typeof AppActionTypes.SHOW_ONBOARDING_FINISH_MODAL;
}

interface DismissOnboardingFinishModal {
  type: typeof AppActionTypes.DISMISS_ONBOARDING_FINISH_MODAL;
}

interface SetDefaultLanguage {
  type: typeof AppActionTypes.SET_DEFAULT_LANGUAGE;
  payload: string;
}

interface ShowDecryptPasswordModal {
  type: typeof AppActionTypes.SHOW_DECRYPT_PASSWORD_MODAL;
  payload: DecryptPasswordConfig;
}

interface DismissDecryptPasswordModal {
  type: typeof AppActionTypes.DISMISS_DECRYPT_PASSWORD_MODAL;
}

interface ResetDecryptPasswordConfig {
  type: typeof AppActionTypes.RESET_DECRYPT_PASSWORD_CONFIG;
}

interface ShowPinModal {
  type: typeof AppActionTypes.SHOW_PIN_MODAL;
  payload: PinModalConfig;
}
interface ShowBottomNotificationModal {
  type: typeof AppActionTypes.SHOW_BOTTOM_NOTIFICATION_MODAL;
  payload: BottomNotificationConfig;
}
interface DismissPinModal {
  type: typeof AppActionTypes.DISMISS_PIN_MODAL;
}

interface PinLockActive {
  type: typeof AppActionTypes.PIN_LOCK_ACTIVE;
  payload: boolean;
}

interface CurrentPin {
  type: typeof AppActionTypes.CURRENT_PIN;
  payload: string | undefined;
}

interface PinBannedUntil {
  type: typeof AppActionTypes.PIN_BANNED_UNTIL;
  payload: number | undefined;
}
interface ShowBiometricModal {
  type: typeof AppActionTypes.SHOW_BIOMETRIC_MODAL;
  payload: BiometricModalConfig;
}

interface DismissBiometricModal {
  type: typeof AppActionTypes.DISMISS_BIOMETRIC_MODAL;
}
interface BiometricLockActive {
  type: typeof AppActionTypes.BIOMETRIC_LOCK_ACTIVE;
  payload: boolean;
}

interface LockAuthorizedUntil {
  type: typeof AppActionTypes.LOCK_AUTHORIZED_UNTIL;
  payload: number | undefined;
}

interface ShowBlur {
  type: typeof AppActionTypes.SHOW_BLUR;
  payload: boolean;
}

interface ShowPortfolioValue {
  type: typeof AppActionTypes.SHOW_PORTFOLIO_VALUE;
  payload: boolean;
}

interface BrazeInitialized {
  type: typeof AppActionTypes.BRAZE_INITIALIZED;
  payload: {contentCardSubscription: EventSubscription | null};
}

interface BrazeContentCardsFetched {
  type: typeof AppActionTypes.BRAZE_CONTENT_CARDS_FETCHED;
  payload: {contentCards: ContentCard[]};
}

interface SetBrazeEid {
  type: typeof AppActionTypes.SET_BRAZE_EID;
  payload: string;
}

interface SetHomeCarouselConfig {
  type: typeof AppActionTypes.SET_HOME_CAROUSEL_CONFIG;
  payload: HomeCarouselConfig[] | HomeCarouselConfig;
}

interface SetHomeCarouselLayoutType {
  type: typeof AppActionTypes.SET_HOME_CAROUSEL_LAYOUT_TYPE;
  payload: HomeCarouselLayoutType;
}

interface updateSettingsListConfigType {
  type: typeof AppActionTypes.UPDATE_SETTINGS_LIST_CONFIG;
  payload: SettingsListType;
}

interface AddAltCurrencyList {
  type: typeof AppActionTypes.ADD_ALT_CURRENCIES_LIST;
  altCurrencyList: Array<AltCurrenciesRowProps>;
}

interface SetDefaultAltCurrency {
  type: typeof AppActionTypes.SET_DEFAULT_ALT_CURRENCY;
  defaultAltCurrency: AltCurrenciesRowProps;
}

interface SetMigrationComplete {
  type: typeof AppActionTypes.SET_MIGRATION_COMPLETE;
}

interface SetKeyMigrationFailure {
  type: typeof AppActionTypes.SET_KEY_MIGRATION_FAILURE;
}

interface SetShowKeyMigrationFailureModal {
  type: typeof AppActionTypes.SET_SHOW_KEY_MIGRATION_FAILURE_MODAL;
  payload: boolean;
}

interface SetKeyMigrationFailureModalHasBeenShown {
  type: typeof AppActionTypes.SET_KEY_MIGRATION_FAILURE_MODAL_HAS_BEEN_SHOWN;
}

interface ActiveModalUpdated {
  type: typeof AppActionTypes.ACTIVE_MODAL_UPDATED;
  payload: ModalId | null;
}

interface checkingBiometricForSending {
  type: typeof AppActionTypes.CHECKING_BIOMETRIC_FOR_SENDING;
  payload: boolean;
}

interface updateOnCompleteOnboarding {
  type: typeof AppActionTypes.UPDATE_ON_COMPLETE_ONBOARDING_LIST;
  payload: string;
}

interface clearOnCompleteOnboardingList {
  type: typeof AppActionTypes.CLEAR_ON_COMPLETE_ONBOARDING_LIST;
}

interface SetHasViewedZenLedgerWarning {
  type: typeof AppActionTypes.SET_HAS_VIEWED_ZENLEDGER_WARNING;
}

export type AppActionType =
  | NetworkChanged
  | SuccessAppInit
  | AppInitComplete
  | FailedAppInit
  | AppIsReadyForDeeplinking
  | setAppFirstOpenEventComplete
  | setAppFirstOpenDate
  | AppOpeningWasTracked
  | SetIntroCompleted
  | SetOnboardingCompleted
  | ShowOnGoingProcessModal
  | DismissOnGoingProcessModal
  | ShowBottomNotificationModal
  | DismissBottomNotificationModal
  | ResetBottomNotificationModalConfig
  | SetColorScheme
  | SetCurrentRoute
  | SuccessGenerateAppIdentity
  | FailedGenerateAppIdentity
  | SetNotificationsAccepted
  | SetConfirmedTxAccepted
  | SetAnnouncementsAccepted
  | SetEmailNotificationsAccepted
  | ShowOnboardingFinishModal
  | DismissOnboardingFinishModal
  | SetDefaultLanguage
  | ShowDecryptPasswordModal
  | DismissDecryptPasswordModal
  | ResetDecryptPasswordConfig
  | ShowPinModal
  | DismissPinModal
  | PinLockActive
  | CurrentPin
  | PinBannedUntil
  | ShowBlur
  | ShowPortfolioValue
  | BrazeInitialized
  | BrazeContentCardsFetched
  | SetBrazeEid
  | ShowBiometricModal
  | DismissBiometricModal
  | BiometricLockActive
  | LockAuthorizedUntil
  | SetHomeCarouselConfig
  | SetHomeCarouselLayoutType
  | updateSettingsListConfigType
  | AddAltCurrencyList
  | SetMigrationComplete
  | SetKeyMigrationFailure
  | SetShowKeyMigrationFailureModal
  | SetKeyMigrationFailureModalHasBeenShown
  | SetDefaultAltCurrency
  | ActiveModalUpdated
  | checkingBiometricForSending
  | updateOnCompleteOnboarding
  | clearOnCompleteOnboardingList
  | SetHasViewedZenLedgerWarning;

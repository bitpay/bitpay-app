import {ColorSchemeName} from 'react-native';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {PinModalConfig} from '../../components/modal/pin/PinModal';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {Network} from '../../constants';
import {NavScreenParams, RootStackParamList} from '../../Root';
import {AppIdentity} from './app.models';
import {DecryptPasswordConfig} from '../../navigation/wallet/components/DecryptEnterPasswordModal';

export enum AppActionTypes {
  NETWORK_CHANGED = 'APP/NETWORK_CHANGED',
  SUCCESS_APP_INIT = 'APP/SUCCESS_APP_INIT',
  FAILED_APP_INIT = 'APP/FAILED_APP_INIT',
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
  SET_HOME_CAROUSEL_CONFIG = 'APP/SET_HOME_CAROUSEL_CONFIG',
}

interface NetworkChanged {
  type: typeof AppActionTypes.NETWORK_CHANGED;
  payload: Network;
}

interface SuccessAppInit {
  type: typeof AppActionTypes.SUCCESS_APP_INIT;
}

interface FailedAppInit {
  type: typeof AppActionTypes.FAILED_APP_INIT;
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

interface ShowBlur {
  type: typeof AppActionTypes.SHOW_BLUR;
  payload: boolean;
}

interface ShowPortfolioValue {
  type: typeof AppActionTypes.SHOW_PORTFOLIO_VALUE;
  payload: boolean;
}

interface SetHomeCarouselConfig {
  type: typeof AppActionTypes.SET_HOME_CAROUSEL_CONFIG;
  payload: any;
}

export type AppActionType =
  | NetworkChanged
  | SuccessAppInit
  | FailedAppInit
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
  | SetHomeCarouselConfig;

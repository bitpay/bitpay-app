import {ColorSchemeName} from 'react-native';
import {ContentCard} from 'react-native-appboy-sdk';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {PinModalConfig} from '../../components/modal/pin/PinModal';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {Network} from '../../constants';
import {DecryptPasswordConfig} from '../../navigation/wallet/components/DecryptEnterPasswordModal';
import {
  AppIdentity,
  HomeCarouselConfig,
  HomeCarouselLayoutType,
} from './app.models';
import {AppActionType, AppActionTypes} from './app.types';
import {SettingsListType} from '../../navigation/tabs/settings/SettingsRoot';

export const networkChanged = (network: Network): AppActionType => ({
  type: AppActionTypes.NETWORK_CHANGED,
  payload: network,
});

export const successAppInit = (): AppActionType => ({
  type: AppActionTypes.SUCCESS_APP_INIT,
});

export const failedAppInit = (): AppActionType => ({
  type: AppActionTypes.FAILED_APP_INIT,
});

export const setIntroCompleted = (): AppActionType => ({
  type: AppActionTypes.SET_INTRO_COMPLETED,
});

export const setOnboardingCompleted = (): AppActionType => ({
  type: AppActionTypes.SET_ONBOARDING_COMPLETED,
});

export const showOnGoingProcessModal = (
  message: OnGoingProcessMessages,
): AppActionType => ({
  type: AppActionTypes.SHOW_ONGOING_PROCESS_MODAL,
  payload: message,
});

export const dismissOnGoingProcessModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_ONGOING_PROCESS_MODAL,
});

export const showBottomNotificationModal = (
  config: BottomNotificationConfig,
): AppActionType => ({
  type: AppActionTypes.SHOW_BOTTOM_NOTIFICATION_MODAL,
  payload: config,
});

export const dismissBottomNotificationModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_BOTTOM_NOTIFICATION_MODAL,
});

export const resetBottomNotificationModalConfig = (): AppActionType => ({
  type: AppActionTypes.RESET_BOTTOM_NOTIFICATION_MODAL_CONFIG,
});

export const setColorScheme = (scheme: ColorSchemeName): AppActionType => ({
  type: AppActionTypes.SET_COLOR_SCHEME,
  payload: scheme,
});

export const setCurrentRoute = (route: any): AppActionType => ({
  type: AppActionTypes.SET_CURRENT_ROUTE,
  payload: route,
});

export const successGenerateAppIdentity = (
  network: Network,
  identity: AppIdentity,
): AppActionType => ({
  type: AppActionTypes.SUCCESS_GENERATE_APP_IDENTITY,
  payload: {network, identity},
});

export const failedGenerateAppIdentity = (): AppActionType => ({
  type: AppActionTypes.FAILED_GENERATE_APP_IDENTITY,
});

export const setNotificationsAccepted = (
  notificationsAccepted: boolean,
): AppActionType => ({
  type: AppActionTypes.SET_NOTIFICATIONS_ACCEPTED,
  payload: notificationsAccepted,
});

export const showOnboardingFinishModal = (): AppActionType => ({
  type: AppActionTypes.SHOW_ONBOARDING_FINISH_MODAL,
});

export const dismissOnboardingFinishModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_ONBOARDING_FINISH_MODAL,
});

export const setDefaultLanguage = (lng: string): AppActionType => ({
  type: AppActionTypes.SET_DEFAULT_LANGUAGE,
  payload: lng,
});

export const showDecryptPasswordModal = (
  decryptPasswordConfig: DecryptPasswordConfig,
): AppActionType => ({
  type: AppActionTypes.SHOW_DECRYPT_PASSWORD_MODAL,
  payload: decryptPasswordConfig,
});

export const dismissDecryptPasswordModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_DECRYPT_PASSWORD_MODAL,
});

export const resetDecryptPasswordConfig = (): AppActionType => ({
  type: AppActionTypes.RESET_DECRYPT_PASSWORD_CONFIG,
});

export const showPinModal = (config: PinModalConfig): AppActionType => ({
  type: AppActionTypes.SHOW_PIN_MODAL,
  payload: config,
});

export const dismissPinModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_PIN_MODAL,
});

export const pinLockActive = (active: boolean): AppActionType => ({
  type: AppActionTypes.PIN_LOCK_ACTIVE,
  payload: active,
});

export const pinBannedUntil = (
  bannedUntil: number | undefined,
): AppActionType => ({
  type: AppActionTypes.PIN_BANNED_UNTIL,
  payload: bannedUntil,
});

export const currentPin = (pin: string | undefined): AppActionType => ({
  type: AppActionTypes.CURRENT_PIN,
  payload: pin,
});

export const showBlur = (value: boolean): AppActionType => ({
  type: AppActionTypes.SHOW_BLUR,
  payload: value,
});

export const showPortfolioValue = (value: boolean): AppActionType => ({
  type: AppActionTypes.SHOW_PORTFOLIO_VALUE,
  payload: value,
});

export const brazeContentCardsFetched = (
  contentCards: ContentCard[],
): AppActionType => ({
  type: AppActionTypes.BRAZE_CONTENT_CARDS_FETCHED,
  payload: {contentCards},
});

export const showBiometricModal = (): AppActionType => ({
  type: AppActionTypes.SHOW_BIOMETRIC_MODAL,
});

export const dismissBiometricModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_BIOMETRIC_MODAL,
});

export const biometricLockActive = (active: boolean): AppActionType => ({
  type: AppActionTypes.BIOMETRIC_LOCK_ACTIVE,
  payload: active,
});

export const lockAuthorizedUntil = (
  authorizedUntil: number | undefined,
): AppActionType => ({
  type: AppActionTypes.LOCK_AUTHORIZED_UNTIL,
  payload: authorizedUntil,
});

export const setHomeCarouselConfig = (
  update: HomeCarouselConfig[] | HomeCarouselConfig,
): AppActionType => ({
  type: AppActionTypes.SET_HOME_CAROUSEL_CONFIG,
  payload: update,
});

export const setHomeCarouselLayoutType = (
  update: HomeCarouselLayoutType,
): AppActionType => ({
  type: AppActionTypes.SET_HOME_CAROUSEL_LAYOUT_TYPE,
  payload: update,
});

export const updateSettingsListConfig = (
  listItem: SettingsListType,
): AppActionType => ({
  type: AppActionTypes.UPDATE_SETTINGS_LIST_CONFIG,
  payload: listItem,
});

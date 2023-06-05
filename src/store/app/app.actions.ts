import {ColorSchemeName, EventSubscription} from 'react-native';
import {AltCurrenciesRowProps} from '../../components/list/AltCurrenciesRow';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {Network} from '../../constants';
import {SettingsListType} from '../../navigation/tabs/settings/SettingsRoot';
import {DecryptPasswordConfig} from '../../navigation/wallet/components/DecryptEnterPasswordModal';
import {HomeCarouselConfig, HomeCarouselLayoutType} from './app.models';
import {ModalId, FeedbackType} from './app.reducer';
import {AppActionType, AppActionTypes} from './app.types';

export const networkChanged = (network: Network): AppActionType => ({
  type: AppActionTypes.NETWORK_CHANGED,
  payload: network,
});

export const successAppInit = (): AppActionType => ({
  type: AppActionTypes.SUCCESS_APP_INIT,
});

export const appInitCompleted = (): AppActionType => ({
  type: AppActionTypes.APP_INIT_COMPLETE,
});

export const failedAppInit = (): AppActionType => ({
  type: AppActionTypes.FAILED_APP_INIT,
  payload: true,
});

export const setIntroCompleted = (): AppActionType => ({
  type: AppActionTypes.SET_INTRO_COMPLETED,
});

export const setOnboardingCompleted = (): AppActionType => ({
  type: AppActionTypes.SET_ONBOARDING_COMPLETED,
});

export const showOnGoingProcessModal = (message: string): AppActionType => ({
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

export const setNotificationsAccepted = (
  notificationsAccepted: boolean,
): AppActionType => ({
  type: AppActionTypes.SET_NOTIFICATIONS_ACCEPTED,
  payload: notificationsAccepted,
});

export const setConfirmedTxAccepted = (
  confirmedTxAccepted: boolean,
): AppActionType => ({
  type: AppActionTypes.SET_CONFIRMED_TX_ACCEPTED,
  payload: confirmedTxAccepted,
});

export const setAnnouncementsAccepted = (
  announcementsAccepted: boolean,
): AppActionType => ({
  type: AppActionTypes.SET_ANNOUNCEMENTS_ACCEPTED,
  payload: announcementsAccepted,
});

export const setEmailNotificationsAccepted = (
  accepted: boolean,
  email: string | null,
): AppActionType => ({
  type: AppActionTypes.SET_EMAIL_NOTIFICATIONS_ACCEPTED,
  payload: {accepted, email},
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

export const showBlur = (value: boolean): AppActionType => ({
  type: AppActionTypes.SHOW_BLUR,
  payload: value,
});

export const showPortfolioValue = (value: boolean): AppActionType => ({
  type: AppActionTypes.SHOW_PORTFOLIO_VALUE,
  payload: value,
});

export const toggleHideAllBalances = (value?: boolean): AppActionType => ({
  type: AppActionTypes.TOGGLE_HIDE_ALL_BALANCES,
  payload: value,
});

export const brazeInitialized = (
  contentCardSubscription: EventSubscription | null,
): AppActionType => ({
  type: AppActionTypes.BRAZE_INITIALIZED,
  payload: {contentCardSubscription},
});

export const brazeContentCardsFetched = (
  contentCards: any[],
): AppActionType => ({
  type: AppActionTypes.BRAZE_CONTENT_CARDS_FETCHED,
  payload: {contentCards},
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

export const addAltCurrencyList = (
  altCurrencyList: Array<AltCurrenciesRowProps>,
): AppActionType => ({
  type: AppActionTypes.ADD_ALT_CURRENCIES_LIST,
  altCurrencyList,
});

export const setDefaultAltCurrency = (
  defaultAltCurrency: AltCurrenciesRowProps,
): AppActionType => ({
  type: AppActionTypes.SET_DEFAULT_ALT_CURRENCY,
  defaultAltCurrency,
});

export const activeModalUpdated = (id: ModalId | null): AppActionType => ({
  type: AppActionTypes.ACTIVE_MODAL_UPDATED,
  payload: id,
});

export const setHasViewedZenLedgerWarning = (): AppActionType => ({
  type: AppActionTypes.SET_HAS_VIEWED_ZENLEDGER_WARNING,
});

export const setUserFeedback = (feedBack: FeedbackType): AppActionType => ({
  type: AppActionTypes.USER_FEEDBACK,
  payload: feedBack,
});

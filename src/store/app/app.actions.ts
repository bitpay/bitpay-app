import {ColorSchemeName, EventSubscription} from 'react-native';
import {ContentCard} from '@braze/react-native-sdk';
import {AltCurrenciesRowProps} from '../../components/list/AltCurrenciesRow';
import {BiometricModalConfig} from '../../components/modal/biometric/BiometricModal';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {PinModalConfig} from '../../components/modal/pin/PinModal';
import {Network} from '../../constants';
import {SettingsListType} from '../../navigation/tabs/settings/SettingsRoot';
import {DecryptPasswordConfig} from '../../navigation/wallet/components/DecryptEnterPasswordModal';
import {
  AppIdentity,
  HomeCarouselConfig,
  HomeCarouselLayoutType,
  InAppNotificationContextType,
} from './app.models';
import {ModalId, FeedbackType} from './app.reducer';
import {AppActionType, AppActionTypes} from './app.types';
import {WalletKitTypes} from '@reown/walletkit';
import {SupportedChains} from '../../constants/currencies';
import {ChainSelectorConfig} from '../../components/modal/chain-selector/ChainSelector';
import {LocalAssetsDropdown} from '../../components/list/AssetsByChainRow';
import {PaymentSentModalConfig} from '../../navigation/wallet/components/PaymentSent';

export const importLedgerModalToggled = (show: boolean): AppActionType => ({
  type: AppActionTypes.IMPORT_LEDGER_MODAL_TOGGLED,
  payload: show,
});

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

export const appTokensDataLoaded = (): AppActionType => ({
  type: AppActionTypes.APP_TOKENS_DATA_LOADED,
});

export const appIsReadyForDeeplinking = (): AppActionType => ({
  type: AppActionTypes.APP_READY_FOR_DEEPLINKING,
});

export const setAppFirstOpenEventComplete = (): AppActionType => ({
  type: AppActionTypes.SET_APP_FIRST_OPEN_EVENT_COMPLETE,
});

export const setAppFirstOpenEventDate = (date: number): AppActionType => ({
  type: AppActionTypes.SET_APP_FIRST_OPEN_DATE,
  payload: date,
});

export const setAppInstalled = (): AppActionType => ({
  type: AppActionTypes.SET_APP_INSTALLED,
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

export const showWalletConnectStartModal = (): AppActionType => ({
  type: AppActionTypes.SHOW_WALLET_CONNECT_START_MODAL,
});

export const dismissWalletConnectStartModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_WALLET_CONNECT_START_MODAL,
});

export const showInAppNotification = (
  context: InAppNotificationContextType,
  message: string,
  request: WalletKitTypes.EventArguments['session_request'],
): AppActionType => ({
  type: AppActionTypes.SHOW_IN_APP_NOTIFICATION,
  payload: {context, message, request},
});

export const dismissInAppNotification = (): AppActionType => ({
  type: AppActionTypes.DISMISS_IN_APP_NOTIFICATION,
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

export const dismissChainSelectorModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_CHAIN_SELECTOR_MODAL,
});

export const clearChainSelectorModalOptions = (): AppActionType => ({
  type: AppActionTypes.CLEAR_CHAIN_SELECTOR_MODAL_OPTIONS,
});

export const showChainSelectorModal = (
  config: ChainSelectorConfig,
): AppActionType => ({
  type: AppActionTypes.SHOW_CHAIN_SELECTOR_MODAL,
  payload: config,
});

export const setColorScheme = (scheme: ColorSchemeName): AppActionType => ({
  type: AppActionTypes.SET_COLOR_SCHEME,
  payload: scheme,
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
  contentCards: ContentCard[],
): AppActionType => ({
  type: AppActionTypes.BRAZE_CONTENT_CARDS_FETCHED,
  payload: {contentCards},
});

export const setBrazeEid = (eid: string): AppActionType => ({
  type: AppActionTypes.SET_BRAZE_EID,
  payload: eid,
});

export const showBiometricModal = (
  config: BiometricModalConfig,
): AppActionType => ({
  type: AppActionTypes.SHOW_BIOMETRIC_MODAL,
  payload: config,
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

export const setDefaultChainFilterOption = (
  selectedChainFilterOption: SupportedChains | undefined,
): AppActionType => ({
  type: AppActionTypes.SET_DEFAULT_CHAIN_FILTER_OPTION,
  selectedChainFilterOption,
});

export const setLocalDefaultChainFilterOption = (
  selectedLocalChainFilterOption: SupportedChains | undefined,
): AppActionType => ({
  type: AppActionTypes.SET_LOCAL_CHAIN_FILTER_OPTION,
  selectedLocalChainFilterOption,
});

export const setLocalAssetsDropdown = (
  selectedLocalAssetsDropdown: LocalAssetsDropdown | undefined,
): AppActionType => ({
  type: AppActionTypes.SET_LOCAL_ASSETS_DROPDOWN,
  selectedLocalAssetsDropdown,
});

export const setMigrationComplete = (): AppActionType => ({
  type: AppActionTypes.SET_MIGRATION_COMPLETE,
});

export const setEDDSAKeyMigrationComplete = (): AppActionType => ({
  type: AppActionTypes.SET_EDDSA_KEY_MIGRATION_COMPLETE,
});

export const setKeyMigrationFailure = (): AppActionType => ({
  type: AppActionTypes.SET_KEY_MIGRATION_FAILURE,
});

export const setMigrationMMKVStorageComplete = (): AppActionType => ({
  type: AppActionTypes.SET_MIGRATION_MMKV_STORAGE_COMPLETE,
});

export const setKeyMigrationMMKVStorageFailure = (): AppActionType => ({
  type: AppActionTypes.SET_KEY_MIGRATION_MMKV_STORAGE_FAILURE,
});

export const setShowKeyMigrationFailureModal = (
  payload: boolean,
): AppActionType => ({
  type: AppActionTypes.SET_SHOW_KEY_MIGRATION_FAILURE_MODAL,
  payload,
});

export const setKeyMigrationFailureModalHasBeenShown = (): AppActionType => ({
  type: AppActionTypes.SET_KEY_MIGRATION_FAILURE_MODAL_HAS_BEEN_SHOWN,
});

export const activeModalUpdated = (id: ModalId | null): AppActionType => ({
  type: AppActionTypes.ACTIVE_MODAL_UPDATED,
  payload: id,
});

export const checkingBiometricForSending = (
  payload: boolean,
): AppActionType => ({
  type: AppActionTypes.CHECKING_BIOMETRIC_FOR_SENDING,
  payload,
});

export const setHasViewedZenLedgerWarning = (): AppActionType => ({
  type: AppActionTypes.SET_HAS_VIEWED_ZENLEDGER_WARNING,
});

export const setHasViewedBillsTab = (): AppActionType => ({
  type: AppActionTypes.SET_HAS_VIEWED_BILLS_TAB,
});

export const setUserFeedback = (feedBack: FeedbackType): AppActionType => ({
  type: AppActionTypes.USER_FEEDBACK,
  payload: feedBack,
});

export const setInAppBrowserOpen = (payload: boolean): AppActionType => ({
  type: AppActionTypes.IN_APP_BROWSER_OPEN,
  payload,
});

export const showArchaxBanner = (payload: boolean): AppActionType => ({
  type: AppActionTypes.SHOW_ARCHAX_BANNER,
  payload,
});

export const dismissPaymentSentModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_PAYMENT_SENT_MODAL,
});

export const clearPaymentSentModalOptions = (): AppActionType => ({
  type: AppActionTypes.CLEAR_PAYMENT_SENT_MODAL_OPTIONS,
});

export const showPaymentSentModal = (
  config: PaymentSentModalConfig,
): AppActionType => ({
  type: AppActionTypes.SHOW_PAYMENT_SENT_MODAL,
  payload: config,
});

import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigationState,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import debounce from 'lodash.debounce';
import Braze from '@braze/react-native-sdk';
import React, {useEffect, useMemo, useState} from 'react';
import {
  Appearance,
  AppState,
  AppStateStatus,
  DeviceEventEmitter,
  Linking,
  NativeEventEmitter,
  NativeModules,
  Platform,
  StatusBar,
} from 'react-native';
import 'react-native-gesture-handler';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {ThemeProvider} from 'styled-components/native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import BottomNotificationModal from './components/modal/bottom-notification/BottomNotification';
import OnGoingProcessModal from './components/modal/ongoing-process/OngoingProcess';
import {DeviceEmitterEvents} from './constants/device-emitter-events';
import {baseNavigatorOptions} from './constants/NavigationOptions';
import {LOCK_AUTHORIZED_TIME} from './constants/Lock';
import BiometricModal from './components/modal/biometric/BiometricModal';
import ArchaxBanner from './components/archax/archax-banner';
import {AppEffects, AppActions} from './store/app';
import {BitPayDarkTheme, BitPayLightTheme} from './themes/bitpay';
import {LogActions} from './store/log';
import {
  useAppDispatch,
  useAppSelector,
  useDeeplinks,
  useUrlEventHandler,
} from './utils/hooks';
import i18n from 'i18next';

import BitpayIdGroup, {
  BitpayIdGroupParamList,
} from './navigation/bitpay-id/BitpayIdGroup';
import OnboardingGroup, {
  OnboardingGroupParamList,
  OnboardingScreens,
} from './navigation/onboarding/OnboardingGroup';
import TabsStack, {
  TabsScreens,
  TabsStackParamList,
} from './navigation/tabs/TabsStack';
import WalletGroup, {
  WalletGroupParamList,
  WalletScreens,
} from './navigation/wallet/WalletGroup';
import ScanGroup, {ScanGroupParamList} from './navigation/scan/ScanGroup';
import GeneralSettingsGroup, {
  GeneralSettingsGroupParamList,
} from './navigation/tabs/settings/general/GeneralGroup';
import ContactsGroup, {
  ContactsGroupParamList,
} from './navigation/tabs/contacts/ContactsGroup';
import ExternalServicesSettingsGroup, {
  ExternalServicesSettingsGroupParamList,
} from './navigation/tabs/settings/external-services/ExternalServicesGroup';
import AboutGroup, {
  AboutGroupParamList,
} from './navigation/tabs/settings/about/AboutGroup';
import AuthGroup, {AuthGroupParamList} from './navigation/auth/AuthGroup';
import BuyCryptoGroup, {
  BuyCryptoGroupParamList,
} from './navigation/services/buy-crypto/BuyCryptoGroup';
import SellCryptoGroup, {
  SellCryptoGroupParamList,
} from './navigation/services/sell-crypto/SellCryptoGroup';
import SwapCryptoGroup, {
  SwapCryptoGroupParamList,
} from './navigation/services/swap-crypto/SwapCryptoGroup';
import IntroGroup, {
  IntroGroupParamList,
  IntroScreens,
} from './navigation/intro/IntroGroup';
import WalletConnectGroup, {
  WalletConnectGroupParamList,
} from './navigation/wallet-connect/WalletConnectGroup';
import GiftCardGroup, {
  GiftCardGroupParamList,
} from './navigation/tabs/shop/gift-card/GiftCardGroup';
import ChainSelectorModal from './components/modal/chain-selector/ChainSelector';
import DecryptEnterPasswordModal from './navigation/wallet/components/DecryptEnterPasswordModal';
import MerchantGroup, {
  MerchantGroupParamList,
} from './navigation/tabs/shop/merchant/MerchantGroup';
import PinModal from './components/modal/pin/PinModal';
import CoinbaseGroup, {
  CoinbaseGroupParamList,
} from './navigation/coinbase/CoinbaseGroup';
import {APP_ANALYTICS_ENABLED} from './constants/config';
import {BlurContainer} from './components/blur/Blur';
import DebugScreen, {
  DebugScreenParamList,
  DebugScreens,
} from './navigation/Debug';
import CardActivationGroup, {
  CardActivationGroupParamList,
} from './navigation/card-activation/CardActivationGroup';
import {
  createWalletsForAccounts,
  fixWalletAddresses,
  getEvmGasWallets,
  sleep,
} from './utils/helper-methods';
import {Analytics} from './store/analytics/analytics.effects';
import {
  checkNotificationsPermissions,
  handleBwsEvent,
  shortcutListener,
  startOnGoingProcessModal,
} from './store/app/app.effects';
import NotificationsSettingsGroup, {
  NotificationsSettingsGroupParamsList,
} from './navigation/tabs/settings/notifications/NotificationsGroup';
import QuickActions, {ShortcutItem} from 'react-native-quick-actions';
import ZenLedgerGroup, {
  ZenLedgerGroupParamsList,
} from './navigation/zenledger/ZenLedgerGroup';
import NetworkFeePolicySettingsGroup, {
  NetworkFeePolicySettingsGroupParamsList,
} from './navigation/tabs/settings/NetworkFeePolicy/NetworkFeePolicyGroup';
import BillGroup, {
  BillGroupParamList,
} from './navigation/tabs/shop/bill/BillGroup';
import InAppNotification from './components/modal/in-app-notification/InAppNotification';
import RNBootSplash from 'react-native-bootsplash';
import {dismissOnGoingProcessModal, showBlur} from './store/app/app.actions';
import SettingsGroup, {
  SettingsGroupParamList,
} from './navigation/tabs/settings/SettingsGroup';
//import {ImportLedgerWalletModal} from './components/modal/import-ledger-wallet/ImportLedgerWalletModal';
import {WalletConnectStartModal} from './components/modal/wallet-connect/WalletConnectStartModal';
import {KeyMethods} from './store/wallet/wallet.models';
import {
  setAccountEVMCreationMigrationComplete,
  setAccountSVMCreationMigrationComplete,
  setSvmAddressCreationFixComplete,
  successAddWallet,
  successGetReceiveAddress,
} from './store/wallet/wallet.actions';
import {BrazeWrapper} from './lib/Braze';
import {selectSettingsNotificationState} from './store/app/app.selectors';
import {HeaderShownContext} from '@react-navigation/elements';
import PaymentSent from './navigation/wallet/components/PaymentSent';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {
  getBaseEVMAccountCreationCoinsAndTokens,
  getBaseSVMAccountCreationCoinsAndTokens,
} from './constants/currencies';
import Logger from 'bitcore-wallet-client/ts_build/lib/log';
import {BwcProvider} from './lib/bwc';
const BWC = BwcProvider.getInstance();

const {Timer, SilentPushEvent, InAppMessageModule} = NativeModules;

// ROOT NAVIGATION CONFIG
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsStackParamList>;
} & DebugScreenParamList &
  MerchantGroupParamList &
  BitpayIdGroupParamList &
  ScanGroupParamList &
  CoinbaseGroupParamList &
  BuyCryptoGroupParamList &
  SellCryptoGroupParamList &
  SwapCryptoGroupParamList &
  CardActivationGroupParamList &
  OnboardingGroupParamList &
  IntroGroupParamList &
  AuthGroupParamList &
  GiftCardGroupParamList &
  AboutGroupParamList &
  NetworkFeePolicySettingsGroupParamsList &
  NotificationsSettingsGroupParamsList &
  ExternalServicesSettingsGroupParamList &
  ContactsGroupParamList &
  GeneralSettingsGroupParamList &
  WalletConnectGroupParamList &
  BillGroupParamList &
  WalletGroupParamList &
  ZenLedgerGroupParamsList &
  SettingsGroupParamList;

// ROOT NAVIGATION CONFIG
export enum RootStacks {
  TABS = 'Tabs',
}

// ROOT NAVIGATION CONFIG
export type NavScreenParams = NavigatorScreenParams<
  DebugScreenParamList &
    AuthGroupParamList &
    OnboardingGroupParamList &
    BitpayIdGroupParamList &
    WalletGroupParamList &
    CardActivationGroupParamList &
    GiftCardGroupParamList &
    MerchantGroupParamList &
    BillGroupParamList &
    GeneralSettingsGroupParamList &
    ContactsGroupParamList &
    ExternalServicesSettingsGroupParamList &
    AboutGroupParamList &
    CoinbaseGroupParamList &
    BuyCryptoGroupParamList &
    SellCryptoGroupParamList &
    SwapCryptoGroupParamList &
    ScanGroupParamList &
    WalletConnectGroupParamList &
    NotificationsSettingsGroupParamsList &
    ZenLedgerGroupParamsList &
    NetworkFeePolicySettingsGroupParamsList &
    SettingsGroupParamList
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type SilentPushEventObj = {
  b_use_webview?: number;
  multisigContractAddress?: string | null;
  ab_uri?: string;
  walletId?: string;
  copayerId?: string;
  aps?: any;
  notification_type?: string;
  ab?: any;
  tokenAddress?: string | null;
  chain?: string;
  coin?: string;
  network?: string;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
export const navigate = (
  name: keyof RootStackParamList,
  params: NavScreenParams,
) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
};

export const getNavigationTabName = () => {
  const tabNames = [
    TabsScreens.HOME,
    TabsScreens.SHOP,
    TabsScreens.TRANSACT_BUTTON,
    TabsScreens.CARD,
    TabsScreens.SETTINGS,
  ];
  const navigationState = navigationRef.getState();
  const navigationTabIndex = navigationState?.routes?.[0]?.state?.index;
  if (typeof navigationTabIndex !== 'number') {
    return TabsScreens.HOME;
  }
  return tabNames[navigationTabIndex] || TabsScreens.HOME;
};

export const Root = createNativeStackNavigator<RootStackParamList>();

export default () => {
  const dispatch = useAppDispatch();
  const [, rerender] = useState({});
  const linking = useDeeplinks();
  const urlEventHandler = useUrlEventHandler();
  const onboardingCompleted = useAppSelector(
    ({APP}) => APP.onboardingCompleted,
  );
  const introCompleted = useAppSelector(({APP}) => APP.introCompleted);
  const checkingBiometricForSending = useAppSelector(
    ({APP}) => APP.checkingBiometricForSending,
  );
  const appColorScheme = useAppSelector(({APP}) => APP.colorScheme);
  const appLanguage = useAppSelector(({APP}) => APP.defaultLanguage);
  const pinLockActive = useAppSelector(({APP}) => APP.pinLockActive);
  const failedAppInit = useAppSelector(({APP}) => APP.failedAppInit);
  const biometricLockActive = useAppSelector(
    ({APP}) => APP.biometricLockActive,
  );
  const lockAuthorizedUntil = useAppSelector(
    ({APP}) => APP.lockAuthorizedUntil,
  );
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const accountEvmCreationMigrationComplete = useAppSelector(
    ({WALLET}) => WALLET.accountEvmCreationMigrationComplete,
  );
  const accountSvmCreationMigrationComplete = useAppSelector(
    ({WALLET}) => WALLET.accountSvmCreationMigrationComplete,
  );
  const svmAddressFixComplete = useAppSelector(
    ({WALLET}) => WALLET.svmAddressFixComplete,
  );
  const notificationsState = useAppSelector(selectSettingsNotificationState);
  const currentLocation = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);

  const blurScreenList: string[] = [
    OnboardingScreens.IMPORT,
    OnboardingScreens.RECOVERY_PHRASE,
    OnboardingScreens.VERIFY_PHRASE,
    TabsScreens.HOME,
    WalletScreens.ADDRESSES,
    WalletScreens.ALL_ADDRESSES,
    WalletScreens.COPAYERS,
    WalletScreens.EXPORT_KEY,
    WalletScreens.EXPORT_WALLET,
    WalletScreens.JOIN_MULTISIG,
    WalletScreens.KEY_OVERVIEW,
    WalletScreens.ACCOUNT_DETAILS,
    WalletScreens.TRANSACTION_PROPOSAL_NOTIFICATIONS,
    WalletScreens.WALLET_DETAILS,
  ];

  const debouncedOnStateChange = useMemo(
    () =>
      debounce((state: NavigationState | undefined) => {
        // storing current route
        if (state) {
          const parentRoute = state.routes[state.index];

          if (parentRoute.state) {
            const childRoute =
              parentRoute.state.routes[parentRoute.state.index || 0];

            dispatch(
              LogActions.info(`Navigation event... ${parentRoute.name}`),
            );

            if (APP_ANALYTICS_ENABLED) {
              let stackName;
              let screenName;

              if (parentRoute.name === RootStacks.TABS) {
                const tabStack =
                  parentRoute.state.routes[parentRoute.state.index || 0];

                stackName = tabStack.name + ' Tab';
              } else {
                stackName = parentRoute.name;
                screenName = childRoute.name;
              }

              dispatch(Analytics.screen(stackName, {screen: screenName || ''}));
            }
          }
        }
      }, 300),
    [dispatch],
  );

  // MAIN APP INIT
  useEffect(() => {
    if (!failedAppInit) {
      dispatch(AppEffects.startAppInit());
    } else {
      navigationRef.navigate(DebugScreens.DEBUG, {name: 'Failed app init'});
    }
  }, [dispatch, failedAppInit]);

  // LANGUAGE
  useEffect(() => {
    if (appLanguage && appLanguage !== i18n.language) {
      i18n.changeLanguage(appLanguage);
    }
  }, [appLanguage]);

  // LOCATION
  useEffect(() => {
    if (currentLocation) {
      if (currentLocation.countryShortCode.toUpperCase() === 'GB') {
        dispatch(AppActions.showArchaxBanner(true));
      } else {
        dispatch(AppActions.showArchaxBanner(false));
      }
    }
  }, [dispatch, currentLocation]);

  // CHECK NOTIFICATIONS SETTINGS
  useEffect(() => {
    const _checkNotificationsPermissions = async () => {
      const {announcements, confirmedTx, pushNotifications} =
        notificationsState;
      const systemEnabled = await checkNotificationsPermissions();
      if (
        !systemEnabled &&
        (announcements || confirmedTx || pushNotifications)
      ) {
        dispatch(AppEffects.setNotifications(false));
        dispatch(AppEffects.setConfirmTxNotifications(false));
        dispatch(AppEffects.setAnnouncementsNotifications(false));
      }
    };

    const onAppStateChange = (status: AppStateStatus) => {
      if (status === 'active') {
        _checkNotificationsPermissions();
      }
    };

    _checkNotificationsPermissions();
    const subscriptionAppStateChange = AppState.addEventListener(
      'change',
      onAppStateChange,
    );

    return () => subscriptionAppStateChange.remove();
  }, []);

  // CHECK PIN || BIOMETRIC
  useEffect(() => {
    async function onAppStateChange(status: AppStateStatus) {
      // status === 'active' when the app goes from background to foreground,

      const showLockOption = () => {
        if (biometricLockActive) {
          dispatch(AppActions.showBiometricModal({}));
        } else if (pinLockActive) {
          dispatch(AppActions.showPinModal({type: 'check'}));
        } else {
          dispatch(AppActions.showBlur(false));
        }
      };

      if (onboardingCompleted && navigationRef.isReady()) {
        if (status === 'active' && checkingBiometricForSending) {
          dispatch(AppActions.checkingBiometricForSending(false));
          dispatch(AppActions.showBlur(false));
        } else if (status === 'inactive' && checkingBiometricForSending) {
          dispatch(AppActions.showBlur(false));
        } else if (status === 'active' && !failedAppInit) {
          if (lockAuthorizedUntil) {
            const timeSinceBoot = await Timer.getRelativeTime();
            const totalSecs =
              Number(lockAuthorizedUntil) - Number(timeSinceBoot);
            if (totalSecs < 0) {
              dispatch(AppActions.lockAuthorizedUntil(undefined));
              showLockOption();
            } else {
              const timeSinceBoot = await Timer.getRelativeTime();
              const authorizedUntil =
                Number(timeSinceBoot) + LOCK_AUTHORIZED_TIME;
              dispatch(AppActions.lockAuthorizedUntil(authorizedUntil));
              dispatch(AppActions.showBlur(false));
            }
          } else {
            showLockOption();
          }
        } else if (failedAppInit) {
          dispatch(AppActions.showBlur(false));
        } else {
          const currentNavState = navigationRef
            .getState()
            ?.routes?.slice(-1)[0];
          const currentScreen: string | undefined =
            currentNavState?.name ?? navigationRef.getCurrentRoute()?.name;
          const currentTab: number | undefined = currentNavState?.state?.index;
          if (
            (currentScreen && blurScreenList.includes(currentScreen)) ||
            (currentScreen === 'Tabs' && (!currentTab || currentTab === 0))
          ) {
            dispatch(AppActions.showBlur(true));
          } else {
            dispatch(AppActions.showBlur(false));
          }
        }
      }
    }

    const subscriptionAppStateChange = AppState.addEventListener(
      'change',
      onAppStateChange,
    );
    return () => subscriptionAppStateChange.remove();
  }, [
    dispatch,
    onboardingCompleted,
    pinLockActive,
    lockAuthorizedUntil,
    biometricLockActive,
    checkingBiometricForSending,
    failedAppInit,
  ]);

  // Silent Push Notifications
  useEffect(() => {
    function onMessageReceived(response: SilentPushEventObj) {
      dispatch(
        LogActions.debug(
          '[Root] Silent Push Notification',
          JSON.stringify(response),
        ),
      );
      dispatch(handleBwsEvent(response));
    }

    const eventEmitter = new NativeEventEmitter(SilentPushEvent);
    eventEmitter.addListener('SilentPushNotification', onMessageReceived);
    return () => DeviceEventEmitter.removeAllListeners('inAppMessageReceived');
  }, [dispatch]);

  // IAM handler
  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      // App should be ready to show IAM (after PIN or Biometric)
      if (status === 'active') {
        if (pinLockActive || biometricLockActive) {
          const _subscriptionToPinModalDismissed =
            DeviceEventEmitter.addListener(
              DeviceEmitterEvents.APP_LOCK_MODAL_DISMISSED,
              async () => {
                _subscriptionToPinModalDismissed.remove();
                InAppMessageModule.notifyReactNativeAppLoaded();
              },
            );
        } else if (!onboardingCompleted) {
          const _subscriptionToOnboardingCompleted =
            DeviceEventEmitter.addListener(
              DeviceEmitterEvents.APP_ONBOARDING_COMPLETED,
              async () => {
                _subscriptionToOnboardingCompleted.remove();
                InAppMessageModule.notifyReactNativeAppLoaded();
              },
            );
        } else {
          InAppMessageModule.notifyReactNativeAppLoaded();
        }
      } else {
        InAppMessageModule.notifyReactNativeAppPaused();
      }
    }

    const subscriptionAppStateChange = AppState.addEventListener(
      'change',
      onAppStateChange,
    );

    return () => subscriptionAppStateChange.remove();
  }, [pinLockActive, biometricLockActive, onboardingCompleted]);

  useEffect(() => {
    const eventBrazeListener = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.SHOULD_DELETE_BRAZE_USER,
      async ({oldEid, newEid, agreedToMarketingCommunications}) => {
        await sleep(20000);
        LogActions.info('Deleting old user EID: ', oldEid);
        await BrazeWrapper.delete(oldEid);
        // Wait for a few seconds to ensure the user is deleted
        await sleep(5000);
        Analytics.endMergingUser();
        await sleep(5000);
        LogActions.info(
          'Updating Email Notification Subscription to new EID: ',
          newEid,
          agreedToMarketingCommunications,
        );
        Braze.setEmailNotificationSubscriptionType(
          agreedToMarketingCommunications
            ? Braze.NotificationSubscriptionTypes.OPTED_IN
            : Braze.NotificationSubscriptionTypes.SUBSCRIBED,
        );
        dispatch(
          AppEffects.setAnnouncementsNotifications(
            agreedToMarketingCommunications,
          ),
        );
      },
    );

    return () => {
      eventBrazeListener.remove();
    };
  }, []);

  // THEME
  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      // status === 'active' when the app goes from background to foreground,
      // if no app scheme set, rerender in case the system theme has changed
      if (status === 'active' && !appColorScheme) {
        rerender({});
      }
    }

    const subscriptionAppStateChange = AppState.addEventListener(
      'change',
      onAppStateChange,
    );

    return () => subscriptionAppStateChange.remove();
  }, [rerender, appColorScheme]);

  // Patch BWC logger to forward logs to the debug screen.
  // Note: BWC logs full request bodies — we filter long messages to avoid clutter.
  useEffect(() => {
    const patchLogger = (loggerInstance: Record<string, any>) => {
      ['debug', 'info', 'log', 'warn', 'error', 'fatal'].forEach(level => {
        loggerInstance[level] = (...args: any[]) => {
          try {
            const message = args
              .map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
              .join(' ');
            if (message.length < 800) {
              const logLevel = level === 'fatal' ? 'error' : level;
              dispatch(
                (LogActions as Record<string, Function>)[logLevel](
                  `[BWC] ${message}`,
                ),
              );
            }
          } catch (_) {}
        };
      });
    };
    patchLogger(Logger);
  }, []);

  const scheme = appColorScheme || Appearance.getColorScheme();
  const theme = scheme === 'dark' ? BitPayDarkTheme : BitPayLightTheme;

  // ROOT STACKS AND GLOBAL COMPONENTS
  const initialRoute = onboardingCompleted
    ? RootStacks.TABS
    : introCompleted
    ? OnboardingScreens.ONBOARDING_START
    : IntroScreens.START;

  return (
    <SafeAreaProvider style={{backgroundColor: theme.colors.background}}>
      <StatusBar
        animated={true}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={'transparent'}
        translucent={true}
      />

      <ThemeProvider theme={theme}>
        <GestureHandlerRootView style={{flex: 1}}>
          <BottomSheetModalProvider>
            <SafeAreaView
              style={{flex: 1}}
              edges={
                Platform.OS === 'android'
                  ? ['left', 'right', 'bottom']
                  : undefined
              }>
              {showArchaxBanner && <ArchaxBanner />}
              {/* https://github.com/react-navigation/react-navigation/issues/11353#issuecomment-1548114655 */}
              <HeaderShownContext.Provider value>
                <NavigationContainer
                  ref={navigationRef}
                  theme={theme}
                  linking={linking}
                  onReady={async () => {
                    DeviceEventEmitter.emit(
                      DeviceEmitterEvents.APP_NAVIGATION_READY,
                    );

                    dispatch(showBlur(pinLockActive || biometricLockActive));
                    await RNBootSplash.hide({fade: true});
                    // avoid splash conflicting with modal in iOS
                    // https://stackoverflow.com/questions/65359539/showing-a-react-native-modal-right-after-app-startup-freezes-the-screen-in-ios
                    dispatch(
                      LogActions.debug(
                        `Biometric Lock Active: ${biometricLockActive} | Pin Lock Active: ${pinLockActive}`,
                      ),
                    );
                    if (pinLockActive) {
                      await sleep(500);
                      dispatch(AppActions.showPinModal({type: 'check'}));
                    } else if (biometricLockActive) {
                      await sleep(500);
                      dispatch(AppActions.showBiometricModal({}));
                    }

                    const urlHandler = async () => {
                      if (onboardingCompleted) {
                        const getBrazeInitialUrl = async (): Promise<string> =>
                          new Promise(resolve =>
                            Braze.getInitialURL(deepLink => resolve(deepLink)),
                          );
                        const [url, brazeUrl] = await Promise.all([
                          Linking.getInitialURL(),
                          getBrazeInitialUrl(),
                        ]);
                        await sleep(10);
                        urlEventHandler({url: url || brazeUrl});
                      }
                    };

                    // we need to ensure that each wallet has a receive address before we can create the account list.
                    const runAddressFix = async () => {
                      const walletsToFix = Object.values(keys).flatMap(key =>
                        key.wallets.filter(
                          wallet =>
                            !wallet.receiveAddress &&
                            wallet?.credentials?.isComplete(),
                        ),
                      );
                      if (walletsToFix.length > 0) {
                        dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));
                        await sleep(1000); // give the modal time to show
                        await fixWalletAddresses({
                          appDispatch: dispatch,
                          wallets: walletsToFix,
                          skipDispatch: false,
                        });
                        dispatch(LogActions.info('success [runAddressFix]'));
                        dispatch(dismissOnGoingProcessModal());
                      }
                    };

                    // we need to ensure that each evm account has all supported wallets attached.
                    const runCompleteEvmWalletsAccountFix = async () => {
                      try {
                        if (Object.keys(keys).length === 0) {
                          dispatch(setAccountEVMCreationMigrationComplete());
                          return;
                        }
                        dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));
                        await sleep(1000); // give the modal time to show
                        await Promise.all(
                          Object.values(keys).map(async key => {
                            const evmWallets = getEvmGasWallets(key.wallets);
                            const accountsArray = [
                              ...new Set(
                                evmWallets.map(
                                  wallet => wallet.credentials.account,
                                ),
                              ),
                            ];
                            const wallets = await createWalletsForAccounts(
                              dispatch,
                              accountsArray,
                              key.methods as KeyMethods,
                              getBaseEVMAccountCreationCoinsAndTokens(),
                            );
                            key.wallets.push(...wallets);
                            dispatch(successAddWallet({key}));
                          }),
                        );
                        dispatch(
                          LogActions.info(
                            'success [runCompleteEvmWalletsAccountFix]',
                          ),
                        );
                        dispatch(setAccountEVMCreationMigrationComplete());
                        dispatch(dismissOnGoingProcessModal());
                      } catch (error) {
                        const errMsg =
                          error instanceof Error
                            ? error.message
                            : JSON.stringify(error);
                        dispatch(
                          LogActions.error(
                            `Error in [runCompleteEvmWalletsAccountFix]: ${errMsg}`,
                          ),
                        );
                        dispatch(setAccountEVMCreationMigrationComplete());
                        dispatch(dismissOnGoingProcessModal());
                      }
                    };

                    // we need to ensure that for each key we have equal svm wallets attached.
                    const runCompleteSvmWalletsAccountFix = async () => {
                      try {
                        if (Object.keys(keys).length === 0) {
                          dispatch(setAccountSVMCreationMigrationComplete());
                          return;
                        }
                        dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));
                        await sleep(1000); // give the modal time to show
                        await Promise.all(
                          Object.values(keys).map(async key => {
                            if (!key?.properties?.xPrivKeyEDDSA) {
                              dispatch(
                                LogActions.info(
                                  'skipping SVM creation — private key is encrypted',
                                ),
                              );
                              return;
                            }
                            const wallets = await createWalletsForAccounts(
                              dispatch,
                              [0],
                              key.methods as KeyMethods,
                              getBaseSVMAccountCreationCoinsAndTokens(),
                            );
                            key.wallets.push(...wallets);
                            dispatch(
                              LogActions.info(
                                `success adding SVM account for key: ${key?.id}`,
                              ),
                            );
                            dispatch(successAddWallet({key}));
                          }),
                        );
                        dispatch(
                          LogActions.info(
                            'success [runCompleteSvmWalletsAccountFix]',
                          ),
                        );
                        dispatch(setAccountSVMCreationMigrationComplete());
                        dispatch(dismissOnGoingProcessModal());
                      } catch (error) {
                        const errMsg =
                          error instanceof Error
                            ? error.message
                            : JSON.stringify(error);
                        dispatch(
                          LogActions.error(
                            `Error in [runCompleteSvmWalletsAccountFix]: ${errMsg}`,
                          ),
                        );
                        dispatch(setAccountSVMCreationMigrationComplete());
                        dispatch(dismissOnGoingProcessModal());
                      }
                    };

                    const runSvmAddressCreationFix = async () => {
                      dispatch(
                        LogActions.persistLog(
                          LogActions.info('start [runSvmAddressCreationFix]'),
                        ),
                      );
                      try {
                        if (Object.keys(keys).length === 0) {
                          dispatch(setSvmAddressCreationFixComplete());
                          return;
                        }
                        dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));
                        await sleep(1000);
                        await Promise.all(
                          Object.values(keys).map(async key => {
                            if (!key?.properties?.xPrivKeyEDDSA) {
                              dispatch(
                                LogActions.persistLog(
                                  LogActions.info(
                                    'skipping SVM address fix — private key is encrypted',
                                  ),
                                ),
                              );
                              return;
                            }
                            for (const wallet of key.wallets) {
                              if (
                                wallet.chain?.toLowerCase() !== 'sol' ||
                                !wallet.credentials.isComplete() ||
                                !wallet.receiveAddress
                              ) {
                                continue;
                              }
                              const xPrivKeyHex = key.properties!.xPrivKeyEDDSA;
                              const derivedAddress =
                                BWC.getCore().Deriver.derivePrivateKeyWithPath(
                                  'SOL',
                                  wallet.network,
                                  xPrivKeyHex,
                                  wallet.credentials.rootPath,
                                  null,
                                );
                              if (
                                derivedAddress &&
                                derivedAddress?.address !==
                                  wallet.receiveAddress
                              ) {
                                dispatch(
                                  LogActions.persistLog(
                                    LogActions.debug(
                                      `Invalidating receive address ${wallet.receiveAddress} for wallet ${wallet.id} of key ${key.id} - replacing for correct one: ${derivedAddress.address}`,
                                    ),
                                  ),
                                );
                                dispatch(
                                  Analytics.track(
                                    'Solana Address Creation Fix',
                                    {
                                      invalidAddress: wallet.receiveAddress,
                                      validAddress: derivedAddress.address,
                                      walletId: wallet.id,
                                      context: 'solanaAddressCreationFix',
                                    },
                                  ),
                                );
                                dispatch(
                                  successGetReceiveAddress({
                                    keyId: key.id,
                                    walletId: wallet.id,
                                    receiveAddress: derivedAddress.address,
                                  }),
                                );
                              }
                            }
                          }),
                        );
                        dispatch(
                          LogActions.persistLog(
                            LogActions.info(
                              'success [runSvmAddressCreationFix]',
                            ),
                          ),
                        );
                        dispatch(setSvmAddressCreationFixComplete());
                        dispatch(dismissOnGoingProcessModal());
                      } catch (error) {
                        const errMsg =
                          error instanceof Error
                            ? error.message
                            : JSON.stringify(error);
                        dispatch(
                          LogActions.persistLog(
                            LogActions.error(
                              `Error in [runSvmAddressCreationFix]: ${errMsg}`,
                            ),
                          ),
                        );
                        dispatch(setSvmAddressCreationFixComplete());
                        dispatch(dismissOnGoingProcessModal());
                      }
                    };

                    if (pinLockActive || biometricLockActive) {
                      const subscriptionToPinModalDismissed =
                        DeviceEventEmitter.addListener(
                          DeviceEmitterEvents.APP_LOCK_MODAL_DISMISSED,
                          async () => {
                            subscriptionToPinModalDismissed.remove();
                            await runAddressFix();
                            if (!accountEvmCreationMigrationComplete) {
                              await sleep(1000);
                              await runCompleteEvmWalletsAccountFix();
                            }
                            if (!accountSvmCreationMigrationComplete) {
                              await sleep(1000);
                              await runCompleteSvmWalletsAccountFix();
                            }
                            if (!svmAddressFixComplete) {
                              await sleep(1000);
                              await runSvmAddressCreationFix();
                            }
                            urlHandler();
                          },
                        );
                    } else {
                      await runAddressFix();
                      if (!accountEvmCreationMigrationComplete) {
                        await sleep(1000);
                        await runCompleteEvmWalletsAccountFix();
                      }
                      if (!accountSvmCreationMigrationComplete) {
                        await sleep(1000);
                        await runCompleteSvmWalletsAccountFix();
                      }
                      if (!svmAddressFixComplete) {
                        await sleep(1000);
                        await runSvmAddressCreationFix();
                      }
                      urlHandler();
                    }

                    dispatch(LogActions.info('QuickActions Initialized'));
                    QuickActions.popInitialAction()
                      .then(item =>
                        dispatch(shortcutListener(item, navigationRef as any)),
                      )
                      .catch(console.error);
                    DeviceEventEmitter.addListener(
                      'quickActionShortcut',
                      (item: ShortcutItem) => {
                        dispatch(shortcutListener(item, navigationRef as any));
                      },
                    );
                  }}
                  onStateChange={debouncedOnStateChange}>
                  <Root.Navigator
                    screenOptions={{
                      ...baseNavigatorOptions,
                      headerShown: false,
                      headerStyle: {
                        backgroundColor: theme.colors.background,
                      },
                    }}
                    initialRouteName={initialRoute}>
                    <Root.Screen
                      name={DebugScreens.DEBUG}
                      component={DebugScreen}
                      options={{
                        ...baseNavigatorOptions,
                        gestureEnabled: false,
                      }}
                    />
                    <Root.Screen
                      name={RootStacks.TABS}
                      component={TabsStack}
                      options={{
                        gestureEnabled: false,
                      }}
                    />
                    {AuthGroup({Auth: Root, theme})}
                    {IntroGroup({Intro: Root})}
                    {OnboardingGroup({Onboarding: Root, theme})}
                    {SettingsGroup({Settings: Root})}
                    {BitpayIdGroup({BitpayId: Root, theme})}
                    {WalletGroup({Wallet: Root, theme})}
                    {CardActivationGroup({CardActivation: Root, theme})}
                    {ScanGroup({Scan: Root, theme})}
                    {GiftCardGroup({GiftCard: Root, theme})}
                    {MerchantGroup({Merchant: Root, theme})}
                    {BillGroup({Bill: Root, theme})}
                    {GeneralSettingsGroup({GeneralSettings: Root})}
                    {ContactsGroup({Contacts: Root, theme})}
                    {ExternalServicesSettingsGroup({
                      ExternalServicesSettings: Root,
                      theme,
                    })}
                    {NotificationsSettingsGroup({Notifications: Root, theme})}
                    {NetworkFeePolicySettingsGroup({
                      NetworkFeePolicySettings: Root,
                      theme,
                    })}
                    {AboutGroup({About: Root, theme})}
                    {CoinbaseGroup({Coinbase: Root, theme})}
                    {BuyCryptoGroup({BuyCrypto: Root, theme})}
                    {SellCryptoGroup({SellCrypto: Root, theme})}
                    {SwapCryptoGroup({SwapCrypto: Root, theme})}
                    {WalletConnectGroup({WalletConnect: Root, theme})}
                    {ZenLedgerGroup({ZenLedger: Root, theme})}
                  </Root.Navigator>
                  <OnGoingProcessModal />
                  <InAppNotification />
                  <BottomNotificationModal />
                  <DecryptEnterPasswordModal />
                  <BlurContainer />
                  <PinModal />
                  <BiometricModal />
                  {/* <ImportLedgerWalletModal /> */}
                  <WalletConnectStartModal />
                  <ChainSelectorModal />
                  <PaymentSent />
                </NavigationContainer>
              </HeaderShownContext.Provider>
            </SafeAreaView>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

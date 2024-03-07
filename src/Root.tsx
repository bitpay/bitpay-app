import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigationState,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import debounce from 'lodash.debounce';
import Braze from 'react-native-appboy-sdk';
import React, {useEffect, useMemo, useState} from 'react';
import {
  Appearance,
  AppState,
  AppStateStatus,
  DeviceEventEmitter,
  Linking,
  NativeEventEmitter,
  NativeModules,
  StatusBar,
} from 'react-native';
import 'react-native-gesture-handler';
import {ThemeProvider} from 'styled-components/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import BottomNotificationModal from './components/modal/bottom-notification/BottomNotification';
import OnGoingProcessModal from './components/modal/ongoing-process/OngoingProcess';
import {DeviceEmitterEvents} from './constants/device-emitter-events';
import {baseNavigatorOptions} from './constants/NavigationOptions';
import {LOCK_AUTHORIZED_TIME} from './constants/Lock';
import BiometricModal from './components/modal/biometric/BiometricModal';
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
import {sleep} from './utils/helper-methods';
import {Analytics} from './store/analytics/analytics.effects';
import {handleBwsEvent, shortcutListener} from './store/app/app.effects';
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
import {showBlur} from './store/app/app.actions';
import InAppMessage from './components/modal/in-app-message/InAppMessage';
import SettingsGroup, {
  SettingsGroupParamList,
} from './navigation/tabs/settings/SettingsGroup';
import {ImportLedgerWalletModal} from './components/modal/import-ledger-wallet/ImportLedgerWalletModal';

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

export type SilentPushEvent = {
  b_use_webview?: number;
  multisigContractAddress?: string | null;
  ab_uri?: string;
  walletId?: string;
  copayerId?: string;
  aps?: any;
  notification_type?: string;
  ab?: any;
  tokenAddress?: string | null;
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
            const timeSinceBoot = await NativeModules.Timer.getRelativeTime();
            const totalSecs =
              Number(lockAuthorizedUntil) - Number(timeSinceBoot);
            if (totalSecs < 0) {
              dispatch(AppActions.lockAuthorizedUntil(undefined));
              showLockOption();
            } else {
              const timeSinceBoot = await NativeModules.Timer.getRelativeTime();
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
    function onMessageReceived(response: SilentPushEvent) {
      dispatch(
        LogActions.debug(
          '[Root] Silent Push Notification',
          JSON.stringify(response),
        ),
      );
      dispatch(handleBwsEvent(response));
    }
    const eventEmitter = new NativeEventEmitter(NativeModules.SilentPushEvent);
    eventEmitter.addListener('SilentPushNotification', onMessageReceived);
    return () => DeviceEventEmitter.removeAllListeners('inAppMessageReceived');
  }, [dispatch]);

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

  const scheme = appColorScheme || Appearance.getColorScheme();
  const theme = scheme === 'dark' ? BitPayDarkTheme : BitPayLightTheme;

  // ROOT STACKS AND GLOBAL COMPONENTS
  const initialRoute = onboardingCompleted
    ? RootStacks.TABS
    : introCompleted
    ? OnboardingScreens.ONBOARDING_START
    : IntroScreens.START;

  return (
    <SafeAreaProvider>
      <StatusBar
        animated={true}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={'transparent'}
        translucent={true}
      />

      <ThemeProvider theme={theme}>
        <NavigationContainer
          ref={navigationRef}
          theme={theme}
          linking={linking}
          onReady={async () => {
            DeviceEventEmitter.emit(DeviceEmitterEvents.APP_NAVIGATION_READY);

            dispatch(showBlur(pinLockActive || biometricLockActive));
            await RNBootSplash.hide({fade: true});
            // avoid splash conflicting with modal in iOS
            // https://stackoverflow.com/questions/65359539/showing-a-react-native-modal-right-after-app-startup-freezes-the-screen-in-ios
            dispatch(LogActions.debug(`Pin Lock Active: ${pinLockActive}`));
            dispatch(
              LogActions.debug(`Biometric Lock Active: ${biometricLockActive}`),
            );
            if (pinLockActive) {
              await sleep(500);
              dispatch(AppActions.showPinModal({type: 'check'}));
            }
            if (biometricLockActive) {
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

            if (pinLockActive || biometricLockActive) {
              const subscriptionToPinModalDismissed =
                DeviceEventEmitter.addListener(
                  DeviceEmitterEvents.APP_LOCK_MODAL_DISMISSED,
                  () => {
                    subscriptionToPinModalDismissed.remove();
                    urlHandler();
                  },
                );
            } else {
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
            {AuthGroup({Auth: Root})}
            {IntroGroup({Intro: Root})}
            {OnboardingGroup({Onboarding: Root})}
            {SettingsGroup({Settings: Root})}
            {BitpayIdGroup({BitpayId: Root})}
            {WalletGroup({Wallet: Root})}
            {CardActivationGroup({CardActivation: Root})}
            {ScanGroup({Scan: Root})}
            {GiftCardGroup({GiftCard: Root})}
            {MerchantGroup({Merchant: Root})}
            {BillGroup({Bill: Root})}
            {GeneralSettingsGroup({GeneralSettings: Root})}
            {ContactsGroup({Contacts: Root})}
            {ExternalServicesSettingsGroup({ExternalServicesSettings: Root})}
            {NotificationsSettingsGroup({Notifications: Root})}
            {NetworkFeePolicySettingsGroup({NetworkFeePolicySettings: Root})}
            {AboutGroup({About: Root})}
            {CoinbaseGroup({Coinbase: Root})}
            {BuyCryptoGroup({BuyCrypto: Root})}
            {SellCryptoGroup({SellCrypto: Root})}
            {SwapCryptoGroup({SwapCrypto: Root})}
            {WalletConnectGroup({WalletConnect: Root})}
            {ZenLedgerGroup({ZenLedger: Root})}
          </Root.Navigator>
          <OnGoingProcessModal />
          <InAppNotification />
          <InAppMessage />
          <BottomNotificationModal />
          <DecryptEnterPasswordModal />
          <BlurContainer />
          <PinModal />
          <BiometricModal />
          <ImportLedgerWalletModal />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

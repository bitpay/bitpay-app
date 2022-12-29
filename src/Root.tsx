import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigationState,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import debounce from 'lodash.debounce';
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
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from './constants/NavigationOptions';
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

import BitpayIdStack, {
  BitpayIdStackParamList,
} from './navigation/bitpay-id/BitpayIdStack';
import OnboardingStack, {
  OnboardingStackParamList,
} from './navigation/onboarding/OnboardingStack';
import TabsStack, {
  TabsScreens,
  TabsStackParamList,
} from './navigation/tabs/TabsStack';
import WalletStack, {
  WalletStackParamList,
} from './navigation/wallet/WalletStack';
import ScanStack, {ScanStackParamList} from './navigation/scan/ScanStack';
import GeneralSettingsStack, {
  GeneralSettingsStackParamList,
} from './navigation/tabs/settings/general/GeneralStack';
import ContactsStack, {
  ContactsStackParamList,
} from './navigation/tabs/contacts/ContactsStack';
import ExternalServicesSettingsStack, {
  ExternalServicesSettingsStackParamList,
} from './navigation/tabs/settings/external-services/ExternalServicesStack';
import AboutStack, {
  AboutStackParamList,
} from './navigation/tabs/settings/about/AboutStack';
import AuthStack, {AuthStackParamList} from './navigation/auth/AuthStack';

import BuyCryptoStack, {
  BuyCryptoStackParamList,
} from './navigation/services/buy-crypto/BuyCryptoStack';
import SwapCryptoStack, {
  SwapCryptoStackParamList,
} from './navigation/services/swap-crypto/SwapCryptoStack';
import IntroStack, {IntroStackParamList} from './navigation/intro/IntroStack';
import WalletConnectStack, {
  WalletConnectStackParamList,
} from './navigation/wallet-connect/WalletConnectStack';
import {ShopStackParamList} from './navigation/tabs/shop/ShopStack';
import GiftCardStack, {
  GiftCardStackParamList,
} from './navigation/tabs/shop/gift-card/GiftCardStack';
import GiftCardDeeplinkScreen, {
  GiftCardDeeplinkScreenParamList,
} from './navigation/tabs/shop/gift-card/GiftCardDeeplink';
import DecryptEnterPasswordModal from './navigation/wallet/components/DecryptEnterPasswordModal';
import MerchantStack, {
  MerchantStackParamList,
} from './navigation/tabs/shop/merchant/MerchantStack';
import PinModal from './components/modal/pin/PinModal';
import CoinbaseStack, {
  CoinbaseStackParamList,
} from './navigation/coinbase/CoinbaseStack';
import BpDevtools from './components/bp-devtools/BpDevtools';
import {APP_ANALYTICS_ENABLED, DEVTOOLS_ENABLED} from './constants/config';
import {BlurContainer} from './components/blur/Blur';
import DebugScreen, {DebugScreenParamList} from './navigation/Debug';
import CardActivationStack, {
  CardActivationStackParamList,
} from './navigation/card-activation/CardActivationStack';
import {sleep} from './utils/helper-methods';
import {
  Analytics,
  handleBwsEvent,
  shortcutListener,
} from './store/app/app.effects';
import NotificationsSettingsStack, {
  NotificationsSettingsStackParamsList,
} from './navigation/tabs/settings/notifications/NotificationsStack';
import QuickActions, {ShortcutItem} from 'react-native-quick-actions';

// ROOT NAVIGATION CONFIG
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Intro: NavigatorScreenParams<IntroStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Tabs: NavigatorScreenParams<TabsStackParamList>;
  BitpayId: NavigatorScreenParams<BitpayIdStackParamList>;
  Wallet: NavigatorScreenParams<WalletStackParamList>;
  CardActivation: NavigatorScreenParams<CardActivationStackParamList>;
  Scan: NavigatorScreenParams<ScanStackParamList>;
  Shop: NavigatorScreenParams<ShopStackParamList>;
  GiftCard: NavigatorScreenParams<GiftCardStackParamList>;
  GiftCardDeeplink: GiftCardDeeplinkScreenParamList;
  Merchant: NavigatorScreenParams<MerchantStackParamList>;
  GeneralSettings: NavigatorScreenParams<GeneralSettingsStackParamList>;
  Contacts: NavigatorScreenParams<ContactsStackParamList>;
  ExternalServicesSettings: NavigatorScreenParams<ExternalServicesSettingsStackParamList>;
  About: NavigatorScreenParams<AboutStackParamList>;
  Coinbase: NavigatorScreenParams<CoinbaseStackParamList>;
  BuyCrypto: NavigatorScreenParams<BuyCryptoStackParamList>;
  SwapCrypto: NavigatorScreenParams<SwapCryptoStackParamList>;
  WalletConnect: NavigatorScreenParams<WalletConnectStackParamList>;
  Debug: DebugScreenParamList;
  NotificationsSettings: NavigatorScreenParams<NotificationsSettingsStackParamsList>;
};
// ROOT NAVIGATION CONFIG
export enum RootStacks {
  HOME = 'Home',
  AUTH = 'Auth',
  INTRO = 'Intro',
  ONBOARDING = 'Onboarding',
  TABS = 'Tabs',
  BITPAY_ID = 'BitpayId',
  WALLET = 'Wallet',
  CARD_ACTIVATION = 'CardActivation',
  SCAN = 'Scan',
  CONTACTS = 'Contacts',
  GIFT_CARD = 'GiftCard',
  GIFT_CARD_DEEPLINK = 'GiftCardDeeplink',
  MERCHANT = 'Merchant',
  // SETTINGS
  GENERAL_SETTINGS = 'GeneralSettings',
  EXTERNAL_SERVICES_SETTINGS = 'ExternalServicesSettings',
  ABOUT = 'About',
  COINBASE = 'Coinbase',
  BUY_CRYPTO = 'BuyCrypto',
  SWAP_CRYPTO = 'SwapCrypto',
  WALLET_CONNECT = 'WalletConnect',
  DEBUG = 'Debug',
  NOTIFICATIONS_SETTINGS = 'NotificationsSettings',
}

// ROOT NAVIGATION CONFIG
export type NavScreenParams = NavigatorScreenParams<
  AuthStackParamList &
    OnboardingStackParamList &
    BitpayIdStackParamList &
    WalletStackParamList &
    CardActivationStackParamList &
    GiftCardStackParamList &
    MerchantStackParamList &
    GeneralSettingsStackParamList &
    ContactsStackParamList &
    ExternalServicesSettingsStackParamList &
    AboutStackParamList &
    CoinbaseStackParamList &
    BuyCryptoStackParamList &
    SwapCryptoStackParamList &
    ScanStackParamList &
    WalletConnectStackParamList &
    NotificationsSettingsStackParamsList
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

const Root = createStackNavigator<RootStackParamList>();

export default () => {
  const dispatch = useAppDispatch();
  const [, rerender] = useState({});
  const linking = useDeeplinks();
  const urlEventHandler = useUrlEventHandler();
  const onboardingCompleted = useAppSelector(
    ({APP}) => APP.onboardingCompleted,
  );
  const introCompleted = useAppSelector(({APP}) => APP.introCompleted);
  const appIsLoading = useAppSelector(({APP}) => APP.appIsLoading);
  const checkingBiometricForSending = useAppSelector(
    ({APP}) => APP.checkingBiometricForSending,
  );
  const appColorScheme = useAppSelector(({APP}) => APP.colorScheme);
  const cachedRoute = useAppSelector(({APP}) => APP.currentRoute);
  const appLanguage = useAppSelector(({APP}) => APP.defaultLanguage);
  const pinLockActive = useAppSelector(({APP}) => APP.pinLockActive);
  const failedAppInit = useAppSelector(({APP}) => APP.failedAppInit);
  const biometricLockActive = useAppSelector(
    ({APP}) => APP.biometricLockActive,
  );
  const lockAuthorizedUntil = useAppSelector(
    ({APP}) => APP.lockAuthorizedUntil,
  );

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
              AppActions.setCurrentRoute([
                parentRoute.name,
                {
                  screen: childRoute.name,
                  params: childRoute.params,
                },
              ]),
            );
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

                if (tabStack.name === TabsScreens.SHOP) {
                  dispatch(Analytics.track('Clicked Shop tab', {}));
                }
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
      navigationRef.navigate(RootStacks.DEBUG, {name: 'Failed app init'});
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
    function onAppStateChange(status: AppStateStatus) {
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

      if (onboardingCompleted) {
        if (status === 'active' && checkingBiometricForSending) {
          dispatch(AppActions.checkingBiometricForSending(false));
          dispatch(AppActions.showBlur(false));
        } else if (status === 'inactive' && checkingBiometricForSending) {
          dispatch(AppActions.showBlur(false));
        } else if (status === 'active' && !appIsLoading) {
          if (lockAuthorizedUntil) {
            const now = Math.floor(Date.now() / 1000);
            const totalSecs = lockAuthorizedUntil - now;
            if (totalSecs < 0) {
              dispatch(AppActions.lockAuthorizedUntil(undefined));
              showLockOption();
            } else {
              const authorizedUntil =
                Math.floor(Date.now() / 1000) + LOCK_AUTHORIZED_TIME;
              dispatch(AppActions.lockAuthorizedUntil(authorizedUntil));
              dispatch(AppActions.showBlur(false));
            }
          } else {
            showLockOption();
          }
        } else if (failedAppInit) {
          dispatch(AppActions.showBlur(false));
        } else {
          dispatch(AppActions.showBlur(true));
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
    appIsLoading,
    failedAppInit,
  ]);

  // Silent Push Notifications
  useEffect(() => {
    function onMessageReceived(response: SilentPushEvent) {
      console.log(
        '##### Received Silent Push Notification',
        JSON.stringify(response),
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
    ? RootStacks.ONBOARDING
    : RootStacks.INTRO;

  const showDevtools = __DEV__ && DEVTOOLS_ENABLED;

  return (
    <SafeAreaProvider>
      <StatusBar
        animated={true}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={'transparent'}
        translucent={true}
      />

      <ThemeProvider theme={theme}>
        {showDevtools ? <BpDevtools /> : null}

        <NavigationContainer
          ref={navigationRef}
          theme={theme}
          linking={linking}
          onReady={async () => {
            DeviceEventEmitter.emit(DeviceEmitterEvents.APP_NAVIGATION_READY);

            // routing to previous route if onboarding
            if (cachedRoute && !onboardingCompleted) {
              const [cachedStack, cachedParams] = cachedRoute;
              navigationRef.navigate(cachedStack, cachedParams);
              dispatch(
                LogActions.info(
                  `Navigating to cached route... ${cachedStack} ${JSON.stringify(
                    cachedParams,
                  )}`,
                ),
              );
            } else {
              const url = await Linking.getInitialURL();
              await sleep(10);
              urlEventHandler({url});
            }

            LogActions.info('QuickActions Initialized');
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
              ...baseScreenOptions,
              headerShown: false,
            }}
            initialRouteName={initialRoute}>
            <Root.Screen
              name={RootStacks.DEBUG}
              component={DebugScreen}
              options={{
                ...baseNavigatorOptions,
                gestureEnabled: false,
                animationEnabled: false,
              }}
            />
            <Root.Screen name={RootStacks.AUTH} component={AuthStack} />
            <Root.Screen name={RootStacks.INTRO} component={IntroStack} />
            <Root.Screen
              name={RootStacks.ONBOARDING}
              component={OnboardingStack}
            />
            <Root.Screen
              name={RootStacks.TABS}
              component={TabsStack}
              options={{
                gestureEnabled: false,
              }}
            />
            <Root.Screen
              name={RootStacks.BITPAY_ID}
              component={BitpayIdStack}
            />
            <Root.Screen
              options={{
                gestureEnabled: false,
              }}
              name={RootStacks.WALLET}
              component={WalletStack}
            />
            <Root.Screen
              name={RootStacks.CARD_ACTIVATION}
              component={CardActivationStack}
              options={{
                gestureEnabled: false,
              }}
            />
            <Root.Screen name={RootStacks.SCAN} component={ScanStack} />
            <Root.Screen
              name={RootStacks.GIFT_CARD}
              component={GiftCardStack}
              options={{
                gestureEnabled: false,
              }}
            />
            <Root.Screen
              name={RootStacks.GIFT_CARD_DEEPLINK}
              component={GiftCardDeeplinkScreen}
            />
            <Root.Screen name={RootStacks.MERCHANT} component={MerchantStack} />
            {/* SETTINGS */}
            <Root.Screen
              name={RootStacks.GENERAL_SETTINGS}
              component={GeneralSettingsStack}
            />
            <Root.Screen name={RootStacks.CONTACTS} component={ContactsStack} />
            <Root.Screen
              name={RootStacks.EXTERNAL_SERVICES_SETTINGS}
              component={ExternalServicesSettingsStack}
            />
            <Root.Screen
              name={RootStacks.NOTIFICATIONS_SETTINGS}
              component={NotificationsSettingsStack}
            />
            <Root.Screen name={RootStacks.ABOUT} component={AboutStack} />
            <Root.Screen name={RootStacks.COINBASE} component={CoinbaseStack} />
            <Root.Screen
              name={RootStacks.BUY_CRYPTO}
              component={BuyCryptoStack}
            />
            <Root.Screen
              name={RootStacks.SWAP_CRYPTO}
              component={SwapCryptoStack}
              options={{
                gestureEnabled: false,
              }}
            />
            <Root.Screen
              name={RootStacks.WALLET_CONNECT}
              component={WalletConnectStack}
            />
          </Root.Navigator>
          <OnGoingProcessModal />
          <BottomNotificationModal />
          <DecryptEnterPasswordModal />
          <BlurContainer />
          <PinModal />
          <BiometricModal />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

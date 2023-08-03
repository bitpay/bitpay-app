import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigationState,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
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
  Platform,
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
import {APP_ANALYTICS_ENABLED} from './constants/config';
import {BlurContainer} from './components/blur/Blur';
import DebugScreen, {DebugScreenParamList} from './navigation/Debug';
import CardActivationStack, {
  CardActivationStackParamList,
} from './navigation/card-activation/CardActivationStack';
import {sleep} from './utils/helper-methods';
import {Analytics} from './store/analytics/analytics.effects';
import {handleBwsEvent, shortcutListener} from './store/app/app.effects';
import NotificationsSettingsStack, {
  NotificationsSettingsStackParamsList,
} from './navigation/tabs/settings/notifications/NotificationsStack';
import QuickActions, {ShortcutItem} from 'react-native-quick-actions';
import ZenLedgerStack, {
  ZenLedgerStackParamsList,
} from './navigation/zenledger/ZenLedgerStack';
import {WalletBackupActions} from './store/wallet-backup';
import {successCreateKey} from './store/wallet/wallet.actions';
import {bootstrapKey, bootstrapWallets} from './store/transforms/transforms';
import {Key, Wallet} from './store/wallet/wallet.models';
import {Keys} from './store/wallet/wallet.reducer';
import NetworkFeePolicySettingsStack, {
  NetworkFeePolicySettingsStackParamsList,
} from './navigation/tabs/settings/NetworkFeePolicy/NetworkFeePolicyStack';
import {WalletActions} from './store/wallet';
import BillStack, {
  BillStackParamList,
} from './navigation/tabs/shop/bill/BillStack';
import InAppNotification from './components/modal/in-app-notification/InAppNotification';
import {sensitiveStorage} from './store';

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
  Bill: NavigatorScreenParams<BillStackParamList>;
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
  ZenLedger: NavigatorScreenParams<ZenLedgerStackParamsList>;
  NetworkFeePolicySettings: NavigatorScreenParams<NetworkFeePolicySettingsStackParamsList>;
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
  BILL = 'Bill',
  // SETTINGS
  GENERAL_SETTINGS = 'GeneralSettings',
  EXTERNAL_SERVICES_SETTINGS = 'ExternalServicesSettings',
  ABOUT = 'About',
  COINBASE = 'Coinbase',
  BUY_CRYPTO = 'BuyCrypto',
  SWAP_CRYPTO = 'SwapCrypto',
  WALLET_CONNECT_V2 = 'WalletConnect',
  DEBUG = 'Debug',
  NOTIFICATIONS_SETTINGS = 'NotificationsSettings',
  ZENLEDGER = 'ZenLedger',
  NETWORK_FEE_POLICY_SETTINGS = 'NetworkFeePolicySettings',
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
    BillStackParamList &
    GeneralSettingsStackParamList &
    ContactsStackParamList &
    ExternalServicesSettingsStackParamList &
    AboutStackParamList &
    CoinbaseStackParamList &
    BuyCryptoStackParamList &
    SwapCryptoStackParamList &
    ScanStackParamList &
    WalletConnectStackParamList &
    NotificationsSettingsStackParamsList &
    ZenLedgerStackParamsList
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
  const expectedKeyLengthChange = useAppSelector(
    ({WALLET}) => WALLET.expectedKeyLengthChange,
  );
  const backupKeys = useAppSelector(({WALLET_BACKUP}) => WALLET_BACKUP.keys);
  const [previousKeysLength, setPreviousKeysLength] = useState(
    () => Object.keys(backupKeys).length,
  );

  const bootstrapKeyAndWallets = ({
    keyId,
    keys,
  }: {
    keyId: string;
    keys: Keys;
  }) => {
    keys[keyId] = bootstrapKey(keys[keyId], keyId, log => dispatch(log)) as Key;
    if (!keys[keyId]) {
      throw new Error('bootstrapKey function failed');
    }
    keys[keyId].wallets = bootstrapWallets(keys[keyId].wallets, log =>
      dispatch(log),
    ) as Wallet[];
  };

  const recoverKeys = ({backupKeys, keys}: {backupKeys: Keys; keys: Keys}) => {
    if (Object.keys(backupKeys).length === 0) {
      LogActions.persistLog(
        LogActions.warn('No backup available for recovering keys.'),
      );
      return;
    }
    // find missing keys in the backup
    const missingKeys: string[] = Object.keys(backupKeys).filter(
      backupKeyId => !keys[backupKeyId],
    );

    // use backup keys to recover the missing keys
    missingKeys.forEach((missingKey: string) => {
      try {
        bootstrapKeyAndWallets({keyId: missingKey, keys: backupKeys});
        dispatch(
          successCreateKey({
            key: backupKeys[missingKey],
            lengthChange: 0,
          }),
        );
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.persistLog(
            LogActions.warn(`Something went wrong. Backup failed. ${errStr}`),
          ),
        );
      }
    });
  };

  const debounceBoostrapAndSave = useMemo(
    () =>
      debounce((keys: Keys) => {
        const newKeyBackup = {...keys};
        const keyIds = Object.keys(newKeyBackup);
        keyIds.forEach(keyId =>
          bootstrapKeyAndWallets({keyId, keys: newKeyBackup}),
        );
        dispatch(WalletBackupActions.successBackupUpWalletKeys(newKeyBackup));

        // second backup for iOS using sensitive storage
        if (Platform.OS === 'ios') {
          sensitiveStorage.setItem('WALLET_BACKUP', newKeyBackup);
        }
      }, 1500),
    [],
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

  // SENSITIVE STORAGE KEY LOGIC
  useEffect(() => {
    // check if there are any differences between the keys in the sensitive storage and the keys in the redux store
    // check for differences on app start
    const checkSensitiveStorageForDiffs = async () => {
      if (Platform.OS === 'ios') {
        dispatch(
          LogActions.debug(
            'checking sensitive storage for differences with redux store',
          ),
        );
        try {
          const storedKeys = await sensitiveStorage.getItem('WALLET_BACKUP');
          if (storedKeys) {
            dispatch(
              LogActions.debug(
                'sensitive storage keys found.. checking diffs...',
              ),
            );
            const storedKeysLength = Object.keys(storedKeys).length;
            const keysLength = Object.keys(keys).length;
            if (storedKeysLength !== keysLength) {
              const sensitiveStorageWalletBackup =
                await sensitiveStorage.getItem('WALLET_BACKUP');
              recoverKeys({backupKeys: sensitiveStorageWalletBackup, keys});
            }
          }
        } catch (err) {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          dispatch(
            LogActions.persistLog(
              LogActions.warn(
                `Something went wrong backing up with sensitive storage most recent version of keys. ${errStr}`,
              ),
            ),
          );
        }
      }
    };
    checkSensitiveStorageForDiffs();
  }, []);

  // BACKUP KEY LOGIC
  useEffect(() => {
    let checkObjDiff = (obj1: Keys, obj2: Keys) => {
      if (Object.keys(obj1).length !== Object.keys(obj2).length) {
        return true;
      }
      const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
      for (const key of keys) {
        const mnemonicEncryptedChanged =
          obj1[key]?.properties?.mnemonicEncrypted !==
          obj2[key]?.properties?.mnemonicEncrypted;
        const backupCompleteChanged =
          obj1[key]?.backupComplete !== obj2[key]?.backupComplete;
        const keyNameChanged = obj1[key]?.keyName !== obj2[key]?.keyName;
        const walletLengthChanged =
          obj1[key]?.wallets?.length !== obj2[key]?.wallets?.length;
        if (
          mnemonicEncryptedChanged ||
          backupCompleteChanged ||
          keyNameChanged ||
          walletLengthChanged
        ) {
          return true;
        }
      }
      return false;
    };

    const numNewKeys = Object.keys(keys).length;
    const keyLengthChange = previousKeysLength - numNewKeys;
    setPreviousKeysLength(numNewKeys);
    dispatch(WalletActions.setExpectedKeyLengthChange(0));

    // keys length changed as expected
    if (expectedKeyLengthChange === keyLengthChange) {
      try {
        // check if any key was added or removed or if there is any diff worth to save
        if (checkObjDiff(keys, backupKeys)) {
          debounceBoostrapAndSave(keys);
        }
        return;
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.persistLog(
            LogActions.warn(
              `Something went wrong backing up most recent version of keys. ${errStr}`,
            ),
          ),
        );
        recoverKeys({backupKeys, keys});
        return;
      }
    }
    if (keyLengthChange >= 1) {
      dispatch(
        LogActions.persistLog(
          LogActions.warn('one or more keys were deleted unexpectedly'),
        ),
      );

      recoverKeys({backupKeys, keys});
    }
  }, [dispatch, keys, previousKeysLength, expectedKeyLengthChange]);

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

      if (onboardingCompleted) {
        if (status === 'active' && checkingBiometricForSending) {
          dispatch(AppActions.checkingBiometricForSending(false));
          dispatch(AppActions.showBlur(false));
        } else if (status === 'inactive' && checkingBiometricForSending) {
          dispatch(AppActions.showBlur(false));
        } else if (status === 'active' && !appIsLoading) {
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
      LogActions.debug(
        '[Root] Silent Push Notification',
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
            <Root.Screen name={RootStacks.BILL} component={BillStack} />
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
            <Root.Screen
              name={RootStacks.NETWORK_FEE_POLICY_SETTINGS}
              component={NetworkFeePolicySettingsStack}
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
              name={RootStacks.WALLET_CONNECT_V2}
              component={WalletConnectStack}
            />
            <Root.Screen
              name={RootStacks.ZENLEDGER}
              component={ZenLedgerStack}
            />
          </Root.Navigator>
          <OnGoingProcessModal />
          <InAppNotification />
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

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
  NativeModules,
  StatusBar,
} from 'react-native';
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
} from './utils/hooks';
import i18n from 'i18next';

import TabsStack, {
  TabsStackParamList,
} from './navigation/tabs/TabsStack';
import WalletStack, {
  WalletStackParamList,
} from './navigation/wallet/WalletStack';
import GeneralSettingsStack, {
  GeneralSettingsStackParamList,
} from './navigation/tabs/settings/general/GeneralStack';
import ContactsStack, {
  ContactsStackParamList,
} from './navigation/tabs/contacts/ContactsStack';
import AboutStack, {
  AboutStackParamList,
} from './navigation/tabs/settings/about/AboutStack';

import DecryptEnterPasswordModal from './navigation/wallet/components/DecryptEnterPasswordModal';
import PinModal from './components/modal/pin/PinModal';
import {APP_ANALYTICS_ENABLED} from './constants/config';
import DebugScreen, {DebugScreenParamList} from './navigation/Debug';
import {WalletBackupActions} from './store/wallet-backup';
import {successCreateKey} from './store/wallet/wallet.actions';
import {bootstrapKey, bootstrapWallets} from './store/transforms/transforms';
import {Key, Wallet} from './store/wallet/wallet.models';
import {Keys} from './store/wallet/wallet.reducer';
import NetworkFeePolicySettingsStack, {
  NetworkFeePolicySettingsStackParamsList,
} from './navigation/tabs/settings/NetworkFeePolicy/NetworkFeePolicyStack';
import {WalletActions} from './store/wallet';

// ROOT NAVIGATION CONFIG
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsStackParamList>;
  Wallet: NavigatorScreenParams<WalletStackParamList>;
  GeneralSettings: NavigatorScreenParams<GeneralSettingsStackParamList>;
  Contacts: NavigatorScreenParams<ContactsStackParamList>;
  About: NavigatorScreenParams<AboutStackParamList>;
  Debug: DebugScreenParamList;
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
  // SETTINGS
  GENERAL_SETTINGS = 'GeneralSettings',
  ABOUT = 'About',
  BUY_CRYPTO = 'BuyCrypto',
  SWAP_CRYPTO = 'SwapCrypto',
  WALLET_CONNECT_V2 = 'WalletConnect',
  DEBUG = 'Debug',
  NOTIFICATIONS_SETTINGS = 'NotificationsSettings',
  NETWORK_FEE_POLICY_SETTINGS = 'NetworkFeePolicySettings',
}

// ROOT NAVIGATION CONFIG
export type NavScreenParams = NavigatorScreenParams<
    WalletStackParamList &
    GeneralSettingsStackParamList &
    ContactsStackParamList &
    AboutStackParamList
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

  const {keys, expectedKeyLengthChange} = useAppSelector(({WALLET}) => WALLET);
  const backupKeys = useAppSelector(({WALLET_BACKUP}) => WALLET_BACKUP.keys);
  const [previousKeysLength, setPreviousKeysLength] = useState(
    Object.keys(backupKeys).length,
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
              } else {
                stackName = parentRoute.name;
                screenName = childRoute.name;
              }
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
  const initialRoute = RootStacks.TABS

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
          onReady={async () => {
            DeviceEventEmitter.emit(DeviceEmitterEvents.APP_NAVIGATION_READY);
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
            <Root.Screen
              name={RootStacks.TABS}
              component={TabsStack}
              options={{
                gestureEnabled: false,
              }}
            />
            <Root.Screen
              options={{
                gestureEnabled: false,
              }}
              name={RootStacks.WALLET}
              component={WalletStack}
            />
            <Root.Screen
              name={RootStacks.GENERAL_SETTINGS}
              component={GeneralSettingsStack}
            />
             <Root.Screen name={RootStacks.CONTACTS} component={ContactsStack} />
            <Root.Screen
              name={RootStacks.NETWORK_FEE_POLICY_SETTINGS}
              component={NetworkFeePolicySettingsStack}
            />
            <Root.Screen name={RootStacks.ABOUT} component={AboutStack} />
          </Root.Navigator>
          {/* <OnGoingProcessModal /> */}
          {/* <BottomNotificationModal /> */}
          {/* <DecryptEnterPasswordModal /> */}
          {/* <PinModal /> */}
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

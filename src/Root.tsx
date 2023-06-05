import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import debounce from 'lodash.debounce';
import React, {useEffect, useMemo, useState} from 'react';
import {Appearance, AppState, AppStateStatus, StatusBar} from 'react-native';
import 'react-native-gesture-handler';
import {ThemeProvider} from 'styled-components/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import BottomNotificationModal from './components/modal/bottom-notification/BottomNotification';
import OnGoingProcessModal from './components/modal/ongoing-process/OngoingProcess';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from './constants/NavigationOptions';
import {AppEffects} from './store/app';
import {BitPayDarkTheme, BitPayLightTheme} from './themes/bitpay';
import {LogActions} from './store/log';
import {useAppDispatch, useAppSelector} from './utils/hooks';
import i18n from 'i18next';

import WalletStack, {
  WalletStackParamList,
} from './navigation/wallet/WalletStack';
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

import BuyCryptoStack, {
  BuyCryptoStackParamList,
} from './navigation/services/buy-crypto/BuyCryptoStack';
import SwapCryptoStack, {
  SwapCryptoStackParamList,
} from './navigation/services/swap-crypto/SwapCryptoStack';
import WalletConnectStack, {
  WalletConnectStackParamList,
} from './navigation/wallet-connect/WalletConnectStack';
//import DecryptEnterPasswordModal from './navigation/wallet/components/DecryptEnterPasswordModal';
import CoinbaseStack, {
  CoinbaseStackParamList,
} from './navigation/coinbase/CoinbaseStack';
import DebugScreen, {DebugScreenParamList} from './navigation/Debug';
import NotificationsSettingsStack, {
  NotificationsSettingsStackParamsList,
} from './navigation/tabs/settings/notifications/NotificationsStack';
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
import TabsStack, {TabsStackParamList} from './navigation/tabs/TabsStack';

// ROOT NAVIGATION CONFIG
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsStackParamList>;
  Wallet: NavigatorScreenParams<WalletStackParamList>;
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
  TABS = 'Tabs',
  WALLET = 'Wallet',
  CONTACTS = 'Contacts',
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
  WalletStackParamList &
    GeneralSettingsStackParamList &
    ContactsStackParamList &
    ExternalServicesSettingsStackParamList &
    AboutStackParamList &
    CoinbaseStackParamList &
    BuyCryptoStackParamList &
    SwapCryptoStackParamList &
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
  const appColorScheme = useAppSelector(({APP}) => APP.colorScheme);
  const appLanguage = useAppSelector(({APP}) => APP.defaultLanguage);
  const failedAppInit = useAppSelector(({APP}) => APP.failedAppInit);

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
  const initialRoute = RootStacks.TABS;

  return (
    <SafeAreaProvider>
      <StatusBar
        animated={true}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={'transparent'}
        translucent={true}
      />

      <ThemeProvider theme={theme}>
        <NavigationContainer ref={navigationRef} theme={theme}>
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
          <BottomNotificationModal />
          {/*
          <DecryptEnterPasswordModal />
          */}
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import Backup from './screens/Backup';
import RecoveryPhrase, {RecoveryPhraseProps} from './screens/RecoveryPhrase';
import VerifyPhrase, {VerifyPhraseProps} from './screens/VerifyPhrase';
import CurrencySelection from './screens/CurrencySelection';
import KeyOverview from './screens/KeyOverview';
import KeySettings from './screens/KeySettings';
import WalletDetails from './screens/WalletDetails';
import WalletSettings from './screens/WalletSettings';
import Import, {ImportProps} from './screens/Import';
import CreationOptions from './screens/CreationOptions';
import {HeaderTitle} from '../../components/styled/Text';
import CreateEncryptionPassword from './screens/CreateEncryptionPassword';
import {Key} from '../../store/wallet/wallet.models';
import {WalletRowProps} from '../../components/list/WalletRow';
import ExportKey from './screens/ExportKey';

export type WalletStackParamList = {
  CurrencySelection: undefined;
  BackupKey: {keyId: string};
  RecoveryPhrase: RecoveryPhraseProps;
  VerifyPhrase: VerifyPhraseProps;
  KeyOverview: {key: Key};
  KeySettings: {key: Key};
  WalletDetails: {wallet: WalletRowProps};
  WalletSettings: {wallet: WalletRowProps};
  CreationOptions: undefined;
  Import: ImportProps;
  CreateEncryptPassword: {key: Key};
  ExportKey: {key: Key};
};

export enum WalletScreens {
  CURRENCY_SELECTION = 'CurrencySelection',
  BACKUP_KEY = 'BackupKey',
  RECOVERY_PHRASE = 'RecoveryPhrase',
  VERIFY_PHRASE = 'VerifyPhrase',
  KEY_OVERVIEW = 'KeyOverview',
  KEY_SETTINGS = 'KeySettings',
  WALLET_DETAILS = 'WalletDetails',
  WALLET_SETTINGS = 'WalletSettings',
  CREATION_OPTIONS = 'CreationOptions',
  IMPORT = 'Import',
  CREATE_ENCRYPT_PASSWORD = 'CreateEncryptPassword',
  EXPORT_KEY = 'ExportKey',
}

const Wallet = createStackNavigator<WalletStackParamList>();

const WalletStack = () => {
  return (
    <>
      <Wallet.Navigator
        screenOptions={{...baseNavigatorOptions, ...baseScreenOptions}}
        initialRouteName={WalletScreens.BACKUP_KEY}>
        <Wallet.Screen
          options={{
            headerTitle: () => <HeaderTitle>Select Currencies</HeaderTitle>,
            headerTitleAlign: 'center',
            gestureEnabled: false,
          }}
          name={WalletScreens.CURRENCY_SELECTION}
          component={CurrencySelection}
        />
        <Wallet.Screen
          options={{
            gestureEnabled: false,
            headerLeft: () => null,
          }}
          name={WalletScreens.BACKUP_KEY}
          component={Backup}
        />
        <Wallet.Screen
          options={{
            gestureEnabled: false,
            headerLeft: () => null,
          }}
          name={WalletScreens.RECOVERY_PHRASE}
          component={RecoveryPhrase}
        />
        <Wallet.Screen
          options={{
            gestureEnabled: false,
            headerLeft: () => null,
          }}
          name={WalletScreens.VERIFY_PHRASE}
          component={VerifyPhrase}
        />
        <Wallet.Screen
          name={WalletScreens.KEY_OVERVIEW}
          component={KeyOverview}
        />
        <Wallet.Screen
          name={WalletScreens.KEY_SETTINGS}
          component={KeySettings}
        />
        <Wallet.Screen
          name={WalletScreens.WALLET_DETAILS}
          component={WalletDetails}
        />
        <Wallet.Screen
          name={WalletScreens.WALLET_SETTINGS}
          component={WalletSettings}
        />
        <Wallet.Screen name={WalletScreens.IMPORT} component={Import} />
        <Wallet.Screen
          name={WalletScreens.CREATION_OPTIONS}
          component={CreationOptions}
        />
        <Wallet.Screen
          name={WalletScreens.CREATE_ENCRYPTION_PASSWORD}
          component={CreateEncryptionPassword}
        />
        <Wallet.Screen name={WalletScreens.EXPORT_KEY} component={ExportKey} />
      </Wallet.Navigator>
    </>
  );
};

export default WalletStack;

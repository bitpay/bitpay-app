import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import Backup from './screens/Backup';
import RecoveryPhrase, {RecoveryPhraseProps} from './screens/RecoveryPhrase';
import VerifyPhrase, {VerifyPhraseProps} from './screens/VerifyPhrase';
import SelectAssets from './screens/SelectAssets';
import WalletOverview from './screens/WalletOverview';
import {WalletObj} from '../../store/wallet/wallet.models';
import WalletSettings from './screens/WalletSettings';
import AssetDetails from './screens/AssetDetails';
import {AssetRowProps} from '../../components/list/AssetRow';
import AssetSettings from './screens/AssetSettings';
import ImportWallet, {ImportWalletProps} from './screens/ImportWallet';
import SelectWalletType from './screens/SelectWalletType';
import {HeaderTitle} from '../../components/styled/Text';
import CreateEncryptPassword from './screens/CreateEncryptPassword';
import ExportKey from './screens/ExportKey';

export type WalletStackParamList = {
  SelectAssets: undefined;
  BackupWallet: {keyId: string};
  RecoveryPhrase: RecoveryPhraseProps;
  VerifyPhrase: VerifyPhraseProps;
  WalletOverview: {wallet: WalletObj};
  WalletSettings: {wallet: WalletObj};
  AssetDetails: {asset: AssetRowProps};
  AssetSettings: {asset: AssetRowProps};
  SelectWalletType: undefined;
  ImportWallet: ImportWalletProps;
  CreateEncryptPassword: {wallet: WalletObj};
  ExportKey: {wallet: WalletObj};
};

export enum WalletScreens {
  SELECT_ASSETS = 'SelectAssets',
  BACKUP_WALLET = 'BackupWallet',
  RECOVERY_PHRASE = 'RecoveryPhrase',
  VERIFY_PHRASE = 'VerifyPhrase',
  WALLET_OVERVIEW = 'WalletOverview',
  WALLET_SETTINGS = 'WalletSettings',
  ASSET_DETAILS = 'AssetDetails',
  ASSET_SETTINGS = 'AssetSettings',
  SELECT_WALLET_TYPE = 'SelectWalletType',
  IMPORT_WALLET = 'ImportWallet',
  CREATE_ENCRYPT_PASSWORD = 'CreateEncryptPassword',
  EXPORT_KEY = 'ExportKey',
}

const Wallet = createStackNavigator<WalletStackParamList>();

const WalletStack = () => {
  return (
    <>
      <Wallet.Navigator
        screenOptions={{...baseNavigatorOptions, ...baseScreenOptions}}
        initialRouteName={WalletScreens.BACKUP_WALLET}>
        <Wallet.Screen
          options={{
            headerTitle: () => <HeaderTitle>Select Assets</HeaderTitle>,
            headerTitleAlign: 'center',
            gestureEnabled: false,
          }}
          name={WalletScreens.SELECT_ASSETS}
          component={SelectAssets}
        />
        <Wallet.Screen
          options={{
            gestureEnabled: false,
            headerLeft: () => null,
          }}
          name={WalletScreens.BACKUP_WALLET}
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
          name={WalletScreens.WALLET_OVERVIEW}
          component={WalletOverview}
        />
        <Wallet.Screen
          name={WalletScreens.WALLET_SETTINGS}
          component={WalletSettings}
        />
        <Wallet.Screen
          name={WalletScreens.ASSET_DETAILS}
          component={AssetDetails}
        />
        <Wallet.Screen
          name={WalletScreens.ASSET_SETTINGS}
          component={AssetSettings}
        />
        <Wallet.Screen
          name={WalletScreens.IMPORT_WALLET}
          component={ImportWallet}
        />
        <Wallet.Screen
          name={WalletScreens.SELECT_WALLET_TYPE}
          component={SelectWalletType}
        />
        <Wallet.Screen
          name={WalletScreens.CREATE_ENCRYPT_PASSWORD}
          component={CreateEncryptPassword}
        />
        <Wallet.Screen name={WalletScreens.EXPORT_KEY} component={ExportKey} />
      </Wallet.Navigator>
    </>
  );
};

export default WalletStack;

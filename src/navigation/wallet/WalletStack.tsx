import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import Backup, {BackupParamList} from './screens/Backup';
import RecoveryPhrase, {
  RecoveryPhraseParamList,
} from './screens/RecoveryPhrase';
import VerifyPhrase, {VerifyPhraseParamList} from './screens/VerifyPhrase';
import CurrencySelection, {
  CurrencySelectionParamList,
} from './screens/CurrencySelection';
import KeyOverview from './screens/KeyOverview';
import KeySettings from './screens/KeySettings';
import WalletDetails from './screens/WalletDetails';
import WalletSettings from './screens/WalletSettings';
import Import, {ImportParamList} from './screens/Import';
import CreationOptions from './screens/CreationOptions';
import {HeaderTitle} from '../../components/styled/Text';
import CreateEncryptionPassword from './screens/CreateEncryptionPassword';
import {Key, Wallet as WalletModel} from '../../store/wallet/wallet.models';
import {WalletRowProps} from '../../components/list/WalletRow';
import ExtendedPrivateKey from './screens/ExtendedPrivateKey';
import DeleteKey from './screens/DeleteKey';
import ExportKey from './screens/ExportKey';
import TermsOfUse, {
  TermsOfUseParamList,
} from '../onboarding/screens/TermsOfUse';
import AddWallet, {AddWalletParamList} from './screens/AddWallet';
import Amount, {AmountParamList} from './screens/send/Amount';
import SendTo from './screens/send/SendTo';
import RequestSpecificAmount from './screens/request-specific-amount/RequestSpecificAmount';
import RequestSpecificAmountQR from './screens/request-specific-amount/RequestSpecificAmountQR';

export type WalletStackParamList = {
  CurrencySelection: CurrencySelectionParamList;
  AddWallet: AddWalletParamList;
  BackupKey: BackupParamList;
  RecoveryPhrase: RecoveryPhraseParamList;
  VerifyPhrase: VerifyPhraseParamList;
  TermsOfUse: TermsOfUseParamList;
  KeyOverview: {key: Key};
  KeySettings: {key: Key};
  WalletDetails: {walletId: string; key: Key};
  WalletSettings: {wallet: WalletRowProps};
  CreationOptions: undefined;
  Import: ImportParamList | undefined;
  CreateEncryptPassword: {key: Key};
  ExtendedPrivateKey: {key: Key};
  DeleteKey: {keyId: string};
  ExportKey: {key: Key};
  Amount: AmountParamList;
  SendTo: {wallet: WalletModel};
  RequestSpecificAmount: {wallet: WalletModel};
  RequestSpecificAmountQR: {wallet: WalletModel; requestAmount: number};
};

export enum WalletScreens {
  CURRENCY_SELECTION = 'CurrencySelection',
  ADD_WALLET = 'AddWallet',
  BACKUP_KEY = 'BackupKey',
  RECOVERY_PHRASE = 'RecoveryPhrase',
  VERIFY_PHRASE = 'VerifyPhrase',
  TERMS_OF_USE = 'TermsOfUse',
  KEY_OVERVIEW = 'KeyOverview',
  KEY_SETTINGS = 'KeySettings',
  WALLET_DETAILS = 'WalletDetails',
  WALLET_SETTINGS = 'WalletSettings',
  CREATION_OPTIONS = 'CreationOptions',
  IMPORT = 'Import',
  CREATE_ENCRYPT_PASSWORD = 'CreateEncryptPassword',
  EXTENDED_PRIVATE_KEY = 'ExtendedPrivateKey',
  DELETE_KEY = 'DeleteKey',
  EXPORT_KEY = 'ExportKey',
  AMOUNT = 'Amount',
  SEND_TO = 'SendTo',
  REQUEST_SPECIFIC_AMOUNT = 'RequestSpecificAmount',
  REQUEST_SPECIFIC_AMOUNT_QR = 'RequestSpecificAmountQR',
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
          }}
          name={WalletScreens.ADD_WALLET}
          component={AddWallet}
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
          name={WalletScreens.CREATE_ENCRYPT_PASSWORD}
          component={CreateEncryptionPassword}
        />
        <Wallet.Screen
          name={WalletScreens.EXTENDED_PRIVATE_KEY}
          component={ExtendedPrivateKey}
        />
        <Wallet.Screen name={WalletScreens.DELETE_KEY} component={DeleteKey} />
        <Wallet.Screen name={WalletScreens.EXPORT_KEY} component={ExportKey} />
        <Wallet.Screen
          name={WalletScreens.TERMS_OF_USE}
          component={TermsOfUse}
        />
        <Wallet.Screen name={WalletScreens.AMOUNT} component={Amount} />
        <Wallet.Screen name={WalletScreens.SEND_TO} component={SendTo} />
        <Wallet.Screen
          name={WalletScreens.REQUEST_SPECIFIC_AMOUNT}
          component={RequestSpecificAmount}
        />
        <Wallet.Screen
          name={WalletScreens.REQUEST_SPECIFIC_AMOUNT_QR}
          component={RequestSpecificAmountQR}
        />
      </Wallet.Navigator>
    </>
  );
};

export default WalletStack;

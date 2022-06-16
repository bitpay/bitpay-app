import React from 'react';
import {createStackNavigator, TransitionPresets} from '@react-navigation/stack';
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
import KeyExplanation from './screens/KeyExplanation';
import KeySettings from './screens/KeySettings';
import WalletDetails from './screens/WalletDetails';
import WalletSettings from './screens/WalletSettings';
import Import, {ImportParamList} from './screens/Import';
import CreationOptions from './screens/CreationOptions';
import {HeaderTitle} from '../../components/styled/Text';
import CreateEncryptionPassword from './screens/CreateEncryptionPassword';
import {
  Key,
  Wallet as WalletModel,
  _Credentials,
} from '../../store/wallet/wallet.models';
import ExtendedPrivateKey from './screens/ExtendedPrivateKey';
import DeleteKey from './screens/DeleteKey';
import ExportKey from './screens/ExportKey';
import TermsOfUse, {
  TermsOfUseParamList,
} from '../onboarding/screens/TermsOfUse';
import AddWallet, {AddWalletParamList} from './screens/AddWallet';
import Amount, {AmountParamList} from './screens/Amount';
import SendTo from './screens/send/SendTo';
import Confirm, {ConfirmParamList} from './screens/send/confirm/Confirm';
import CreateMultisig, {CreateMultisigProps} from './screens/CreateMultisig';
import JoinMultisig, {JoinMultisigParamList} from './screens/JoinMultisig';
import Copayers from './screens/Copayers';
import AddingOptions, {AddingOptionsParamList} from './screens/AddingOptions';
import UpdateKeyOrWalletName from './screens/UpdateKeyOrWalletName';
import RequestSpecificAmountQR from './screens/request-specific-amount/RequestSpecificAmountQR';
import TransactionDetails from './screens/TransactionDetails';
import TransactionProposalDetails from './screens/TransactionProposalDetails';
import GlobalSelect, {GlobalSelectParamList} from './screens/GlobalSelect';
import KeyGlobalSelect, {
  KeyGlobalSelectParamList,
} from './screens/KeyGlobalSelect';
import DebitCardConfirm, {
  DebitCardConfirmParamList,
} from './screens/send/confirm/DebitCardConfirm';
import GiftCardConfirm, {
  GiftCardConfirmParamList,
} from './screens/send/confirm/GiftCardConfirm';
import WalletInformation from './screens/wallet-settings/WalletInformation';
import ExportWallet from './screens/wallet-settings/ExportWallet';
import Addresses from './screens/wallet-settings/Addresses';
import AllAddresses, {
  AllAddressesParamList,
} from './screens/wallet-settings/AllAddresses';
import PayProConfirm, {
  PayProConfirmParamList,
} from './screens/send/confirm/PayProConfirm';
import PriceCharts, {PriceChartsParamList} from './screens/PriceCharts';
import ClearEncryptPassword, {
  ClearEncryptPasswordParamList,
} from './screens/ClearEncryptPassword';
import PayProConfirmTwoFactor from './screens/send/confirm/PayProConfirmTwoFactor';
import {useTranslation} from 'react-i18next';

export type WalletStackParamList = {
  CurrencySelection: CurrencySelectionParamList;
  AddWallet: AddWalletParamList;
  BackupKey: BackupParamList;
  RecoveryPhrase: RecoveryPhraseParamList;
  VerifyPhrase: VerifyPhraseParamList;
  TermsOfUse: TermsOfUseParamList;
  KeyOverview: {id: string; context?: 'createNewMultisigKey'};
  KeyExplanation: undefined;
  KeySettings: {key: Key; context?: 'createEncryptPassword'};
  UpdateKeyOrWalletName: {
    key: Key;
    wallet?: {walletId: string; walletName: string | undefined};
    context: 'key' | 'wallet';
  };
  WalletDetails: {
    walletId: string;
    key?: Key;
    skipInitializeHistory?: boolean;
  };
  WalletSettings: {walletId: string; key: Key};
  CreationOptions: undefined;
  Import: ImportParamList | undefined;
  CreateEncryptPassword: {key: Key};
  ExtendedPrivateKey: {xPrivKey: string};
  DeleteKey: {keyId: string};
  ExportKey: {code: string; keyName: string | undefined};
  Amount: AmountParamList;
  SendTo: {
    wallet: WalletModel;
  };
  Confirm: ConfirmParamList;
  DebitCardConfirm: DebitCardConfirmParamList;
  GiftCardConfirm: GiftCardConfirmParamList;
  PayProConfirm: PayProConfirmParamList;
  PayProConfirmTwoFactor: {onSubmit: (code: string) => Promise<void>};
  CreateMultisig: CreateMultisigProps;
  JoinMultisig: JoinMultisigParamList | undefined;
  Copayers: {wallet: WalletModel; status: _Credentials};
  AddingOptions: AddingOptionsParamList;
  RequestSpecificAmountQR: {wallet: WalletModel; requestAmount: number};
  TransactionDetails: {wallet: WalletModel; transaction: any};
  TransactionProposalDetails: {wallet: WalletModel; transaction: any; key: Key};
  GlobalSelect: GlobalSelectParamList;
  KeyGlobalSelect: KeyGlobalSelectParamList;
  WalletInformation: {wallet: WalletModel};
  ExportWallet: {
    wallet: WalletModel;
    keyObj: {
      mnemonic: string;
      mnemonicHasPassphrase: boolean;
      xPrivKey: string;
    };
  };
  Addresses: {wallet: WalletModel};
  AllAddresses: AllAddressesParamList;
  PriceCharts: PriceChartsParamList;
  ClearEncryptPassword: ClearEncryptPasswordParamList;
};

export enum WalletScreens {
  CURRENCY_SELECTION = 'CurrencySelection',
  ADD_WALLET = 'AddWallet',
  BACKUP_KEY = 'BackupKey',
  RECOVERY_PHRASE = 'RecoveryPhrase',
  VERIFY_PHRASE = 'VerifyPhrase',
  TERMS_OF_USE = 'TermsOfUse',
  KEY_OVERVIEW = 'KeyOverview',
  KEY_EXPLANATION = 'KeyExplanation',
  KEY_SETTINGS = 'KeySettings',
  UPDATE_KEY_OR_WALLET_NAME = 'UpdateKeyOrWalletName',
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
  CONFIRM = 'Confirm',
  DEBIT_CARD_CONFIRM = 'DebitCardConfirm',
  GIFT_CARD_CONFIRM = 'GiftCardConfirm',
  PAY_PRO_CONFIRM = 'PayProConfirm',
  PAY_PRO_CONFIRM_TWO_FACTOR = 'PayProConfirmTwoFactor',
  CREATE_MULTISIG = 'CreateMultisig',
  JOIN_MULTISIG = 'JoinMultisig',
  COPAYERS = 'Copayers',
  ADDING_OPTIONS = 'AddingOptions',
  REQUEST_SPECIFIC_AMOUNT_QR = 'RequestSpecificAmountQR',
  TRANSACTION_DETAILS = 'TransactionDetails',
  TRANSACTION_PROPOSAL_DETAILS = 'TransactionProposalDetails',
  GLOBAL_SELECT = 'GlobalSelect',
  KEY_GLOBAL_SELECT = 'KeyGlobalSelect',
  WALLET_INFORMATION = 'WalletInformation',
  EXPORT_WALLET = 'ExportWallet',
  ADDRESSES = 'Addresses',
  ALL_ADDRESSES = 'AllAddresses',
  PRICE_CHARTS = 'PriceCharts',
  CLEAR_ENCRYPT_PASSWORD = 'ClearEncryptPassword',
}

const Wallet = createStackNavigator<WalletStackParamList>();

const WalletStack = () => {
  const {t} = useTranslation();
  return (
    <>
      <Wallet.Navigator
        screenOptions={{...baseNavigatorOptions, ...baseScreenOptions}}
        initialRouteName={WalletScreens.BACKUP_KEY}>
        <Wallet.Screen
          options={{
            headerTitle: () => (
              <HeaderTitle>{t('Select Currencies')}</HeaderTitle>
            ),
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
          name={WalletScreens.KEY_EXPLANATION}
          component={KeyExplanation}
        />
        <Wallet.Screen
          name={WalletScreens.KEY_SETTINGS}
          component={KeySettings}
        />
        <Wallet.Screen
          name={WalletScreens.UPDATE_KEY_OR_WALLET_NAME}
          component={UpdateKeyOrWalletName}
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
        <Wallet.Screen name={WalletScreens.CONFIRM} component={Confirm} />
        <Wallet.Screen
          options={{
            headerTitle: () => <HeaderTitle>{t('Add Funds')}</HeaderTitle>,
            ...TransitionPresets.ModalPresentationIOS,
          }}
          name={WalletScreens.DEBIT_CARD_CONFIRM}
          component={DebitCardConfirm}
        />
        <Wallet.Screen
          options={{
            headerTitle: () => (
              <HeaderTitle>{t('Confirm Payment')}</HeaderTitle>
            ),
            ...TransitionPresets.ModalPresentationIOS,
          }}
          name={WalletScreens.GIFT_CARD_CONFIRM}
          component={GiftCardConfirm}
        />
        <Wallet.Screen
          options={{
            headerTitle: () => (
              <HeaderTitle>{t('Confirm Payment')}</HeaderTitle>
            ),
          }}
          name={WalletScreens.PAY_PRO_CONFIRM}
          component={PayProConfirm}
        />
        <Wallet.Screen
          options={{
            headerTitle: () => (
              <HeaderTitle>{t('Two-Step Verification')}</HeaderTitle>
            ),
          }}
          name={WalletScreens.PAY_PRO_CONFIRM_TWO_FACTOR}
          component={PayProConfirmTwoFactor}
        />
        <Wallet.Screen
          options={{
            headerTitle: () => (
              <HeaderTitle>{t('Create Multisig Wallet')}</HeaderTitle>
            ),
          }}
          name={WalletScreens.CREATE_MULTISIG}
          component={CreateMultisig}
        />
        <Wallet.Screen
          options={{
            headerTitle: () => (
              <HeaderTitle>{t('Join Shared Wallet')}</HeaderTitle>
            ),
          }}
          name={WalletScreens.JOIN_MULTISIG}
          component={JoinMultisig}
        />
        <Wallet.Screen
          options={{
            headerTitle: () => <HeaderTitle>{t('Invitation')}</HeaderTitle>,
          }}
          name={WalletScreens.COPAYERS}
          component={Copayers}
        />
        <Wallet.Screen
          name={WalletScreens.ADDING_OPTIONS}
          component={AddingOptions}
        />
        <Wallet.Screen
          options={{
            ...TransitionPresets.ModalPresentationIOS,
          }}
          name={WalletScreens.REQUEST_SPECIFIC_AMOUNT_QR}
          component={RequestSpecificAmountQR}
        />
        <Wallet.Screen
          options={{
            ...TransitionPresets.ModalPresentationIOS,
          }}
          name={WalletScreens.TRANSACTION_DETAILS}
          component={TransactionDetails}
        />
        <Wallet.Screen
          options={{
            ...TransitionPresets.ModalPresentationIOS,
          }}
          name={WalletScreens.TRANSACTION_PROPOSAL_DETAILS}
          component={TransactionProposalDetails}
        />
        <Wallet.Screen
          options={{
            headerTitle: () => (
              <HeaderTitle>{t('Select a currency')}</HeaderTitle>
            ),
          }}
          name={WalletScreens.GLOBAL_SELECT}
          component={GlobalSelect}
        />
        <Wallet.Screen
          options={{
            headerTitle: () => <HeaderTitle>{t('Select a key')}</HeaderTitle>,
          }}
          name={WalletScreens.KEY_GLOBAL_SELECT}
          component={KeyGlobalSelect}
        />
        <Wallet.Screen
          name={WalletScreens.WALLET_INFORMATION}
          component={WalletInformation}
        />
        <Wallet.Screen
          name={WalletScreens.EXPORT_WALLET}
          component={ExportWallet}
        />
        <Wallet.Screen name={WalletScreens.ADDRESSES} component={Addresses} />
        <Wallet.Screen
          options={{
            ...TransitionPresets.ModalPresentationIOS,
          }}
          name={WalletScreens.ALL_ADDRESSES}
          component={AllAddresses}
        />
        <Wallet.Screen
          options={{
            ...TransitionPresets.ModalPresentationIOS,
          }}
          name={WalletScreens.PRICE_CHARTS}
          component={PriceCharts}
        />
        <Wallet.Screen
          options={{
            headerTitle: () => (
              <HeaderTitle>{t('Clear Encrypt Password')}</HeaderTitle>
            ),
          }}
          name={WalletScreens.CLEAR_ENCRYPT_PASSWORD}
          component={ClearEncryptPassword}
        />
      </Wallet.Navigator>
    </>
  );
};

export default WalletStack;

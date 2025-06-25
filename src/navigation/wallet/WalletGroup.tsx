import React from 'react';
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
import AccountDetails, {
  AccountDetailsScreenParamList,
} from './screens/AccountDetails';
import WalletDetails, {
  WalletDetailsScreenParamList,
} from './screens/WalletDetails';
import WalletSettings from './screens/WalletSettings';
import AccountSettings from './screens/AccountSettings';
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
import AddCustomToken, {
  AddCustomTokenParamList,
} from './screens/AddCustomToken';
import AmountScreen, {AmountScreenParamList} from './screens/AmountScreen';
import SendTo from './screens/send/SendTo';
import Confirm, {ConfirmParamList} from './screens/send/confirm/Confirm';
import CreateMultisig, {
  CreateMultisigParamsList,
} from './screens/CreateMultisig';
import JoinMultisig, {JoinMultisigParamList} from './screens/JoinMultisig';
import Copayers from './screens/Copayers';
import AddingOptions, {AddingOptionsParamList} from './screens/AddingOptions';
import UpdateKeyOrWalletName from './screens/UpdateKeyOrWalletName';
import RequestSpecificAmountQR from './screens/request-specific-amount/RequestSpecificAmountQR';
import TransactionDetails from './screens/TransactionDetails';
import TransactionProposalDetails from './screens/TransactionProposalDetails';
import TransactionProposalNotifications from './screens/TransactionProposalNotifications';
import GlobalSelect, {GlobalSelectParamList} from './screens/GlobalSelect';
import KeyGlobalSelect, {
  KeyGlobalSelectParamList,
} from './screens/KeyGlobalSelect';
import DebitCardConfirm, {
  DebitCardConfirmParamList,
} from './screens/send/confirm/DebitCardConfirm';
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
import PayProConfirmTwoFactor, {
  PayProConfirmTwoFactorParamList,
} from './screens/send/confirm/PayProConfirmTwoFactor';
import {useTranslation} from 'react-i18next';
import SendToOptions, {SendToOptionsParamList} from './screens/SendToOptions';
import SelectInputs, {SelectInputsParamList} from './screens/SelectInputs';
import EnterBuyerProvidedEmail from './screens/send/EnterBuyerProvidedEmail';
import ExportTransactionHistory from './screens/wallet-settings/ExportTransactionHistory';
import ClearTransactionHistoryCache from './screens/wallet-settings/ClearTransactionHistoryCache';
import PaperWallet from './screens/PaperWallet';
import BackupOnboarding, {
  BackupOnboardingParamList,
} from './screens/BackupOnboarding';
import {Root} from '../../Root';
import {baseNavigatorOptions} from '../../constants/NavigationOptions';
import HeaderBackButton from '../../components/back/HeaderBackButton';
import {AccountRowProps} from '../../components/list/AccountListRow';

interface WalletProps {
  Wallet: typeof Root;
}

export type WalletGroupParamList = {
  CurrencySelection: CurrencySelectionParamList;
  AddWallet: AddWalletParamList;
  AddCustomToken: AddCustomTokenParamList;
  BackupKey: BackupParamList;
  BackupOnboarding: BackupOnboardingParamList;
  RecoveryPhrase: RecoveryPhraseParamList;
  VerifyPhrase: VerifyPhraseParamList;
  TermsOfUse: TermsOfUseParamList | undefined;
  KeyOverview: {id: string; context?: 'createNewMultisigKey'};
  KeyExplanation: undefined;
  KeySettings: {key: Key; context?: 'createEncryptPassword'};
  UpdateKeyOrWalletName: {
    key: Key;
    wallet?: {walletId: string; walletName: string | undefined};
    accountItem?: AccountRowProps;
    context: 'key' | 'wallet' | 'account';
  };
  AccountDetails: AccountDetailsScreenParamList;
  WalletDetails: WalletDetailsScreenParamList;
  WalletSettings: {walletId: string; key: Key; copayerId?: string};
  AccountSettings: {
    key: Key;
    selectedAccountAddress: string;
    context: 'keySettings' | 'accountDetails';
    isSvmAccount?: boolean;
  };
  CreationOptions: undefined;
  Import: ImportParamList;
  CreateEncryptPassword: {key: Key};
  ExtendedPrivateKey: {xPrivKey: string};
  DeleteKey: {keyId: string};
  ExportKey: {code: string; keyName: string | undefined};
  WalletAmountScreen: AmountScreenParamList;
  SendTo: {
    wallet: WalletModel;
  };
  Confirm: ConfirmParamList;
  DebitCardConfirm: DebitCardConfirmParamList;
  PayProConfirm: PayProConfirmParamList;
  PayProConfirmTwoFactor: PayProConfirmTwoFactorParamList;
  CreateMultisig: CreateMultisigParamsList;
  JoinMultisig: JoinMultisigParamList | undefined;
  Copayers: {wallet: WalletModel; status: _Credentials};
  AddingOptions: AddingOptionsParamList;
  RequestSpecificAmountQR: {wallet: WalletModel; requestAmount: number};
  TransactionDetails: {
    wallet: WalletModel;
    transaction: any;
    onMemoChange: () => void;
  };
  TransactionProposalDetails: {
    walletId: string;
    transactionId: string;
    keyId: string;
    copayerId?: string;
  };
  TransactionProposalNotifications: {
    walletId?: string;
    keyId?: string;
    copayerId?: string;
  };
  GlobalSelect: GlobalSelectParamList;
  KeyGlobalSelect: KeyGlobalSelectParamList;
  WalletInformation: {wallet: WalletModel; accountItem?: AccountRowProps};
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
  SendToOptions: SendToOptionsParamList;
  SelectInputs: SelectInputsParamList;
  EnterBuyerProvidedEmail: {data: string};
  ExportTransactionHistory: {wallet: WalletModel};
  ClearTransactionHistoryCache: {wallet: WalletModel; key: Key};
  PaperWallet: {scannedPrivateKey: string};
};

export enum WalletScreens {
  CURRENCY_SELECTION = 'CurrencySelection',
  ADD_WALLET = 'AddWallet',
  ADD_CUSTOM_TOKEN = 'AddCustomToken',
  BACKUP_KEY = 'BackupKey',
  BACKUP_ONBOARDING = 'BackupOnboarding',
  RECOVERY_PHRASE = 'RecoveryPhrase',
  VERIFY_PHRASE = 'VerifyPhrase',
  TERMS_OF_USE = 'TermsOfUse',
  KEY_OVERVIEW = 'KeyOverview',
  KEY_EXPLANATION = 'KeyExplanation',
  KEY_SETTINGS = 'KeySettings',
  UPDATE_KEY_OR_WALLET_NAME = 'UpdateKeyOrWalletName',
  ACCOUNT_DETAILS = 'AccountDetails',
  ACCOUNT_SETTINGS = 'AccountSettings',
  WALLET_DETAILS = 'WalletDetails',
  WALLET_SETTINGS = 'WalletSettings',
  CREATION_OPTIONS = 'CreationOptions',
  IMPORT = 'Import',
  CREATE_ENCRYPT_PASSWORD = 'CreateEncryptPassword',
  EXTENDED_PRIVATE_KEY = 'ExtendedPrivateKey',
  DELETE_KEY = 'DeleteKey',
  EXPORT_KEY = 'ExportKey',
  AMOUNT = 'WalletAmountScreen',
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
  EXPORT_TRANSACTION_HISTORY = 'ExportTransactionHistory',
  TRANSACTION_DETAILS = 'TransactionDetails',
  TRANSACTION_PROPOSAL_DETAILS = 'TransactionProposalDetails',
  TRANSACTION_PROPOSAL_NOTIFICATIONS = 'TransactionProposalNotifications',
  GLOBAL_SELECT = 'GlobalSelect',
  KEY_GLOBAL_SELECT = 'KeyGlobalSelect',
  WALLET_INFORMATION = 'WalletInformation',
  EXPORT_WALLET = 'ExportWallet',
  ADDRESSES = 'Addresses',
  ALL_ADDRESSES = 'AllAddresses',
  PRICE_CHARTS = 'PriceCharts',
  CLEAR_ENCRYPT_PASSWORD = 'ClearEncryptPassword',
  SEND_TO_OPTIONS = 'SendToOptions',
  SELECT_INPUTS = 'SelectInputs',
  ENTER_BUYER_PROVIDED_EMAIL = 'EnterBuyerProvidedEmail',
  CLEAR_TRANSACTION_HISTORY_CACHE = 'ClearTransactionHistoryCache',
  PAPER_WALLET = 'PaperWallet',
}

const WalletGroup: React.FC<WalletProps> = ({Wallet}) => {
  const {t} = useTranslation();
  return (
    <Wallet.Group
      screenOptions={() => ({
        ...baseNavigatorOptions,
        headerLeft: () => <HeaderBackButton />,
      })}>
      <Wallet.Screen
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Select Currencies')}</HeaderTitle>
          ),
        }}
        name={WalletScreens.CURRENCY_SELECTION}
        component={CurrencySelection}
      />
      <Wallet.Screen name={WalletScreens.ADD_WALLET} component={AddWallet} />
      <Wallet.Screen
        name={WalletScreens.ADD_CUSTOM_TOKEN}
        component={AddCustomToken}
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
        name={WalletScreens.BACKUP_ONBOARDING}
        component={BackupOnboarding}
      />
      <Wallet.Screen
        name={WalletScreens.RECOVERY_PHRASE}
        component={RecoveryPhrase}
      />
      <Wallet.Screen
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
        name={WalletScreens.ACCOUNT_DETAILS}
        component={AccountDetails}
      />
      <Wallet.Screen
        name={WalletScreens.ACCOUNT_SETTINGS}
        component={AccountSettings}
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
      <Wallet.Screen name={WalletScreens.TERMS_OF_USE} component={TermsOfUse} />
      <Wallet.Screen name={WalletScreens.AMOUNT} component={AmountScreen} />
      <Wallet.Screen name={WalletScreens.SEND_TO} component={SendTo} />
      <Wallet.Screen
        options={{gestureEnabled: false}}
        name={WalletScreens.CONFIRM}
        component={Confirm}
      />
      <Wallet.Screen
        options={{
          gestureEnabled: false,
          headerTitle: () => <HeaderTitle>{t('Add Funds')}</HeaderTitle>,
        }}
        name={WalletScreens.DEBIT_CARD_CONFIRM}
        component={DebitCardConfirm}
      />
      <Wallet.Screen
        options={{
          gestureEnabled: false,
          headerTitle: () => <HeaderTitle>{t('Confirm Payment')}</HeaderTitle>,
        }}
        name={WalletScreens.PAY_PRO_CONFIRM}
        component={PayProConfirm}
      />
      <Wallet.Screen
        options={{
          gestureEnabled: false,
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
        name={WalletScreens.REQUEST_SPECIFIC_AMOUNT_QR}
        component={RequestSpecificAmountQR}
      />
      <Wallet.Screen
        name={WalletScreens.TRANSACTION_DETAILS}
        component={TransactionDetails}
      />
      <Wallet.Screen
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Export Transaction History')}</HeaderTitle>
          ),
        }}
        name={WalletScreens.EXPORT_TRANSACTION_HISTORY}
        component={ExportTransactionHistory}
      />
      <Wallet.Screen
        name={WalletScreens.TRANSACTION_PROPOSAL_DETAILS}
        component={TransactionProposalDetails}
      />
      <Wallet.Screen
        name={WalletScreens.TRANSACTION_PROPOSAL_NOTIFICATIONS}
        component={TransactionProposalNotifications}
      />
      <Wallet.Screen
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Select a Currency')}</HeaderTitle>
          ),
        }}
        name={WalletScreens.GLOBAL_SELECT}
        component={GlobalSelect}
      />
      <Wallet.Screen
        options={{
          headerTitle: () => <HeaderTitle>{t('Select a Key')}</HeaderTitle>,
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
        name={WalletScreens.ALL_ADDRESSES}
        component={AllAddresses}
      />
      <Wallet.Screen
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
      <Wallet.Screen
        name={WalletScreens.SEND_TO_OPTIONS}
        component={SendToOptions}
      />
      <Wallet.Screen
        name={WalletScreens.SELECT_INPUTS}
        component={SelectInputs}
      />
      <Wallet.Screen
        options={{
          headerTitle: () => <HeaderTitle>{t('Enter Email')}</HeaderTitle>,
        }}
        name={WalletScreens.ENTER_BUYER_PROVIDED_EMAIL}
        component={EnterBuyerProvidedEmail}
      />
      <Wallet.Screen
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Clear Transaction History Cache')}</HeaderTitle>
          ),
        }}
        name={WalletScreens.CLEAR_TRANSACTION_HISTORY_CACHE}
        component={ClearTransactionHistoryCache}
      />
      <Wallet.Screen
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Sweep Paper Wallet')}</HeaderTitle>
          ),
        }}
        name={WalletScreens.PAPER_WALLET}
        component={PaperWallet}
      />
    </Wallet.Group>
  );
};

export default WalletGroup;

import {CurrencyOpts} from '../../constants/currencies';
import {
  Key,
  Token,
  Wallet,
  TransactionProposal,
  CacheFeeLevel,
  CryptoBalance,
} from './wallet.models';

export enum WalletActionTypes {
  SET_WALLET_TERMS_ACCEPTED = 'WALLET/SET_WALLET_TERMS_ACCEPTED',
  SUCCESS_WALLET_STORE_INIT = 'WALLET/SUCCESS_WALLET_STORE_INIT',
  FAILED_WALLET_STORE_INIT = 'WALLET/FAILED_WALLET_STORE_INIT',
  SUCCESS_CREATE_KEY = 'WALLET/SUCCESS_CREATE_KEY',
  FAILED_CREATE_KEY = 'WALLET/FAILED_CREATE_KEY',
  SUCCESS_UPDATE_KEY = 'WALLET/SUCCESS_UPDATE_KEY',
  FAILED_UPDATE_KEY = 'WALLET/FAILED_UPDATE_KEY',
  SUCCESS_IMPORT = 'WALLET/SUCCESS_IMPORT',
  FAILED_IMPORT = 'WALLET/FAILED_IMPORT',
  SET_BACKUP_COMPLETE = 'WALLET/SET_BACKUP_COMPLETE',
  DELETE_KEY = 'WALLET/DELETE_KEY',
  SUCCESS_ENCRYPT_OR_DECRYPT_PASSWORD = 'WALLET/SUCCESS_ENCRYPT_OR_DECRYPT_PASSWORD',
  SUCCESS_GET_TOKEN_OPTIONS = 'WALLET/SUCCESS_GET_TOKEN_OPTIONS',
  SUCCESS_GET_CUSTOM_TOKEN_OPTIONS = 'WALLET/SUCCESS_GET_CUSTOM_TOKEN_OPTIONS',
  FAILED_GET_TOKEN_OPTIONS = 'WALLET/FAILED_GET_TOKEN_OPTIONS',
  SUCCESS_ADD_WALLET = 'WALLET/SUCCESS_ADD_WALLET',
  FAILED_ADD_WALLET = 'WALLET/FAILED_ADD_WALLET',
  SUCCESS_UPDATE_WALLET_STATUS = 'WALLET/SUCCESS_UPDATE_WALLET_STATUS',
  FAILED_UPDATE_WALLET_STATUS = 'WALLET/FAILED_UPDATE_WALLET_STATUS',
  SUCCESS_UPDATE_KEY_TOTAL_BALANCE = 'WALLET/SUCCESS_UPDATE_KEY_TOTAL_BALANCE',
  SUCCESS_UPDATE_KEYS_TOTAL_BALANCE = 'WALLET/SUCCESS_UPDATE_KEYS_TOTAL_BALANCE',
  FAILED_UPDATE_KEY_TOTAL_BALANCE = 'WALLET/FAILED_UPDATE_KEY_TOTAL_BALANCE',
  SUCCESS_UPDATE_ALL_KEYS_AND_STATUS = 'WALLET/SUCCESS_UPDATE_ALL_KEYS_AND_STATUS',
  FAILED_UPDATE_ALL_KEYS_AND_STATUS = 'WALLET/FAILED_UPDATE_ALL_KEYS_AND_STATUS',
  UPDATE_PORTFOLIO_BALANCE = 'WALLET/UPDATE_PORTFOLIO_BALANCE',
  UPDATE_KEY_NAME = 'WALLET/UPDATE_KEY_NAME',
  UPDATE_WALLET_NAME = 'WALLET/UPDATE_WALLET_NAME',
  SET_WALLET_REFRESHING = 'WALLET/SET_WALLET_REFRESHING',
  SUCCESS_GET_RECEIVE_ADDRESS = 'WALLET/SUCCESS_GET_RECEIVE_ADDRESS',
  SET_USE_UNCONFIRMED_FUNDS = 'WALLET/SET_USE_UNCONFIRMED_FUNDS',
  SET_CUSTOMIZE_NONCE = 'WALLET/SET_CUSTOMIZE_NONCE',
  SET_QUEUED_TRANSACTIONS = 'WALLET/SET_QUEUED_TRANSACTIONS',
  SET_ENABLE_REPLACE_BY_FEE = 'WALLET/SET_ENABLE_REPLACE_BY_FEE',
  UPDATE_WALLET_TX_HISTORY = 'WALLET/UPDATE_WALLET_TX_HISTORY',
  SYNC_WALLETS = 'WALLET/SYNC_WALLETS',
  TOGGLE_HIDE_WALLET = 'WALLET/TOGGLE_HIDE_WALLET',
  UPDATE_CACHE_FEE_LEVEL = 'WALLET/UPDATE_CACHE_FEE_LEVEL',
  UPDATE_DEFERRED_IMPORT = 'WALLET/UPDATE_DEFERRED_IMPORT',
  CLEAR_DEFERRED_IMPORT = 'WALLET/CLEAR_DEFERRED_IMPORT',
  SET_CUSTOM_TOKENS_MIGRATION_COMPLETE = 'APP/SET_CUSTOM_TOKENS_MIGRATION_COMPLETE',
}

interface successWalletStoreInit {
  type: typeof WalletActionTypes.SUCCESS_WALLET_STORE_INIT;
}

interface failedWalletStoreInit {
  type: typeof WalletActionTypes.FAILED_WALLET_STORE_INIT;
}

interface successCreateKey {
  type: typeof WalletActionTypes.SUCCESS_CREATE_KEY;
  payload: {
    key: Key;
  };
}

interface failedCreateKey {
  type: typeof WalletActionTypes.FAILED_CREATE_KEY;
}

interface successUpdateKey {
  type: typeof WalletActionTypes.SUCCESS_UPDATE_KEY;
  payload: {
    key: Key;
  };
}

interface failedUpdateKey {
  type: typeof WalletActionTypes.FAILED_UPDATE_KEY;
}

interface successAddWallet {
  type: typeof WalletActionTypes.SUCCESS_ADD_WALLET;
  payload: {
    key: Key;
  };
}

interface failedAddWallet {
  type: typeof WalletActionTypes.FAILED_ADD_WALLET;
}

interface successImport {
  type: typeof WalletActionTypes.SUCCESS_IMPORT;
  payload: {
    key: Key;
  };
}

interface failedImport {
  type: typeof WalletActionTypes.FAILED_IMPORT;
}

interface setBackupComplete {
  type: typeof WalletActionTypes.SET_BACKUP_COMPLETE;
  payload: string;
}

interface successEncryptOrDecryptPassword {
  type: typeof WalletActionTypes.SUCCESS_ENCRYPT_OR_DECRYPT_PASSWORD;
  payload: {
    key: Key;
  };
}

interface deleteKey {
  type: typeof WalletActionTypes.DELETE_KEY;
  payload: {
    keyId: string;
  };
}

interface successGetTokenOptions {
  type: typeof WalletActionTypes.SUCCESS_GET_TOKEN_OPTIONS;
  payload: {
    tokenOptionsByAddress: {[key in string]: Token};
    tokenDataByAddress: {[key in string]: CurrencyOpts};
  };
}

interface successGetCustomTokenOptions {
  type: typeof WalletActionTypes.SUCCESS_GET_CUSTOM_TOKEN_OPTIONS;
  payload: {
    customTokenOptionsByAddress: {[key in string]: Token};
    customTokenDataByAddress: {[key in string]: CurrencyOpts};
  };
}

interface failedGetTokenOptions {
  type: typeof WalletActionTypes.FAILED_GET_TOKEN_OPTIONS;
}

interface setWalletTermsAccepted {
  type: typeof WalletActionTypes.SET_WALLET_TERMS_ACCEPTED;
}

interface successUpdateWalletStatus {
  type: typeof WalletActionTypes.SUCCESS_UPDATE_WALLET_STATUS;
  payload: {
    keyId: string;
    walletId: string;
    status: {
      balance: CryptoBalance;
      pendingTxps: TransactionProposal[];
    };
  };
}

interface failedUpdateWalletStatus {
  type: typeof WalletActionTypes.FAILED_UPDATE_WALLET_STATUS;
  payload: {
    keyId: string;
    walletId: string;
  };
}

interface successUpdateKeysTotalBalance {
  type: typeof WalletActionTypes.SUCCESS_UPDATE_KEYS_TOTAL_BALANCE;
  payload: {
    keyId: string;
    totalBalance: number;
    totalBalanceLastDay: number;
  }[];
}

interface failedUpdateKeyTotalBalance {
  type: typeof WalletActionTypes.FAILED_UPDATE_KEY_TOTAL_BALANCE;
}

interface successUpdateAllKeysAndStatus {
  type: typeof WalletActionTypes.SUCCESS_UPDATE_ALL_KEYS_AND_STATUS;
}

interface failedUpdateAllKeysAndStatus {
  type: typeof WalletActionTypes.FAILED_UPDATE_ALL_KEYS_AND_STATUS;
}

interface updatePortfolioBalance {
  type: typeof WalletActionTypes.UPDATE_PORTFOLIO_BALANCE;
}

interface successGetReceiveAddress {
  type: typeof WalletActionTypes.SUCCESS_GET_RECEIVE_ADDRESS;
  payload: {
    keyId: string;
    walletId: string;
    receiveAddress: string;
  };
}

interface updateKeyName {
  type: typeof WalletActionTypes.UPDATE_KEY_NAME;
  payload: {
    keyId: string;
    name: string;
  };
}

interface updateWalletName {
  type: typeof WalletActionTypes.UPDATE_WALLET_NAME;
  payload: {
    keyId: string;
    walletId: string;
    name: string;
  };
}

interface setWalletRefreshing {
  type: typeof WalletActionTypes.SET_WALLET_REFRESHING;
  payload: {
    keyId: string;
    walletId: string;
    isRefreshing: boolean;
  };
}

interface setUseUnconfirmedFunds {
  type: typeof WalletActionTypes.SET_USE_UNCONFIRMED_FUNDS;
  payload: boolean;
}
interface setCustomizeNonce {
  type: typeof WalletActionTypes.SET_CUSTOMIZE_NONCE;
  payload: boolean;
}
interface setQueuedTransactions {
  type: typeof WalletActionTypes.SET_QUEUED_TRANSACTIONS;
  payload: boolean;
}
interface setEnableReplaceByFee {
  type: typeof WalletActionTypes.SET_ENABLE_REPLACE_BY_FEE;
  payload: boolean;
}
interface updateWalletTxHistory {
  type: typeof WalletActionTypes.UPDATE_WALLET_TX_HISTORY;

  payload: {
    keyId: string;
    walletId: string;
    transactionHistory: {
      transactions: any[];
      loadMore: boolean;
      hasConfirmingTxs: boolean;
    };
  };
}

interface syncWallets {
  type: typeof WalletActionTypes.SYNC_WALLETS;
  payload: {
    keyId: string;
    wallets: Wallet[];
  };
}

interface toggleHideWallet {
  type: typeof WalletActionTypes.TOGGLE_HIDE_WALLET;
  payload: {
    wallet: Wallet;
  };
}

interface updateCacheFeeLevel {
  type: typeof WalletActionTypes.UPDATE_CACHE_FEE_LEVEL;
  payload: CacheFeeLevel;
}

interface SetCustomTokensMigrationComplete {
  type: typeof WalletActionTypes.SET_CUSTOM_TOKENS_MIGRATION_COMPLETE;
}

export type WalletActionType =
  | successWalletStoreInit
  | failedWalletStoreInit
  | successCreateKey
  | failedCreateKey
  | successUpdateKey
  | failedUpdateKey
  | successAddWallet
  | failedAddWallet
  | successImport
  | failedImport
  | setBackupComplete
  | deleteKey
  | successEncryptOrDecryptPassword
  | successGetTokenOptions
  | successGetCustomTokenOptions
  | failedGetTokenOptions
  | setWalletTermsAccepted
  | successUpdateWalletStatus
  | failedUpdateWalletStatus
  | successUpdateKeysTotalBalance
  | failedUpdateKeyTotalBalance
  | updatePortfolioBalance
  | successUpdateAllKeysAndStatus
  | failedUpdateAllKeysAndStatus
  | updateKeyName
  | updateWalletName
  | setWalletRefreshing
  | successGetReceiveAddress
  | setUseUnconfirmedFunds
  | setCustomizeNonce
  | setQueuedTransactions
  | setEnableReplaceByFee
  | updateWalletTxHistory
  | syncWallets
  | toggleHideWallet
  | updateCacheFeeLevel
  | SetCustomTokensMigrationComplete;

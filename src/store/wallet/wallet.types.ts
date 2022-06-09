import {CurrencyOpts} from '../../constants/currencies';
import {
  CacheKeys,
  DateRanges,
  Key,
  PriceHistory,
  Rates,
  Token,
  Wallet,
  WalletBalance,
  TransactionProposal,
  RatesByDateRange,
  CacheFeeLevel,
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
  SUCCESS_GET_RATES = 'WALLET/SUCCESS_GET_RATES',
  FAILED_GET_RATES = 'WALLET/FAILED_GET_RATES',
  UPDATE_CACHE_KEY = 'WALLET/UPDATE_CACHE_KEY',
  SUCCESS_GET_PRICE_HISTORY = 'WALLET/SUCCESS_GET_PRICE_HISTORY',
  FAILED_GET_PRICE_HISTORY = 'WALLET/FAILED_GET_PRICE_HISTORY',
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
  SET_ENABLE_REPLACE_BY_FEE = 'WALLET/SET_ENABLE_REPLACE_BY_FEE',
  UPDATE_WALLET_TX_HISTORY = 'WALLET/UPDATE_WALLET_TX_HISTORY',
  SYNC_WALLETS = 'WALLET/SYNC_WALLETS',
  TOGGLE_HIDE_WALLET = 'WALLET/TOGGLE_HIDE_WALLET',
  TOGGLE_HIDE_BALANCE = 'WALLET/TOGGLE_HIDE_BALANCE',
  TOGGLE_HIDE_KEY_BALANCE = 'WALLET/TOGGLE_HIDE_KEY_BALANCE',
  UPDATE_CACHE_FEE_LEVEL = 'WALLET/UPDATE_CACHE_FEE_LEVEL',
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

interface successGetRates {
  type: typeof WalletActionTypes.SUCCESS_GET_RATES;
  payload: {
    rates?: Rates;
    ratesByDateRange?: RatesByDateRange;
    lastDayRates?: Rates;
    dateRange?: DateRanges;
  };
}

interface failedGetRates {
  type: typeof WalletActionTypes.FAILED_GET_RATES;
}

interface updateCacheKey {
  type: typeof WalletActionTypes.UPDATE_CACHE_KEY;
  payload: {
    cacheKey: CacheKeys;
    dateRange?: DateRanges;
  };
}

interface successGetPriceHistory {
  type: typeof WalletActionTypes.SUCCESS_GET_PRICE_HISTORY;
  payload: Array<PriceHistory>;
}

interface failedGetPriceHistory {
  type: typeof WalletActionTypes.FAILED_GET_PRICE_HISTORY;
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
    tokenOptions: {[key in string]: Token};
    tokenData: {[key in string]: CurrencyOpts};
    tokenOptionsByAddress: {[key in string]: Token};
  };
}

interface successGetCustomTokenOptions {
  type: typeof WalletActionTypes.SUCCESS_GET_CUSTOM_TOKEN_OPTIONS;
  payload: {
    customTokenOptions: {[key in string]: Token};
    customTokenData: {[key in string]: CurrencyOpts};
    customTokenOptionsByAddress: {[key in string]: Token};
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
      balance: WalletBalance;
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

interface successUpdateKeyTotalBalance {
  type: typeof WalletActionTypes.SUCCESS_UPDATE_KEY_TOTAL_BALANCE;
  payload: {
    keyId: string;
    totalBalance: number;
    totalBalanceLastDay: number;
  };
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

interface toggleHideBalance {
  type: typeof WalletActionTypes.TOGGLE_HIDE_BALANCE;
  payload: {
    wallet: Wallet;
  };
}

interface toggleHideKeyBalance {
  type: typeof WalletActionTypes.TOGGLE_HIDE_KEY_BALANCE;
  payload: {
    keyId: string;
  };
}

interface updateCacheFeeLevel {
  type: typeof WalletActionTypes.UPDATE_CACHE_FEE_LEVEL;
  payload: CacheFeeLevel;
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
  | successGetRates
  | failedGetRates
  | updateCacheKey
  | successGetPriceHistory
  | failedGetPriceHistory
  | deleteKey
  | successEncryptOrDecryptPassword
  | successGetTokenOptions
  | successGetCustomTokenOptions
  | failedGetTokenOptions
  | setWalletTermsAccepted
  | successUpdateWalletStatus
  | failedUpdateWalletStatus
  | successUpdateKeyTotalBalance
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
  | setEnableReplaceByFee
  | updateWalletTxHistory
  | syncWallets
  | toggleHideWallet
  | toggleHideBalance
  | toggleHideKeyBalance
  | updateCacheFeeLevel;

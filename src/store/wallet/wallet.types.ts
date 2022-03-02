import {
  CacheKeys,
  Key,
  PriceHistory,
  Rates,
  Token,
  WalletBalance,
} from './wallet.models';

export enum WalletActionTypes {
  SET_WALLET_TERMS_ACCEPTED = 'WALLET/SET_WALLET_TERMS_ACCEPTED',
  SUCCESS_WALLET_STORE_INIT = 'WALLET/SUCCESS_WALLET_STORE_INIT',
  FAILED_WALLET_STORE_INIT = 'WALLET/FAILED_WALLET_STORE_INIT',
  SUCCESS_CREATE_KEY = 'WALLET/SUCCESS_CREATE_KEY',
  FAILED_CREATE_KEY = 'WALLET/FAILED_CREATE_KEY',
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
  FAILED_GET_TOKEN_OPTIONS = 'WALLET/FAILED_GET_TOKEN_OPTIONS',
  SUCCESS_ADD_WALLET = 'WALLET/SUCCESS_ADD_WALLET',
  FAILED_ADD_WALLET = 'WALLET/FAILED_ADD_WALLET',
  SUCCESS_UPDATE_WALLET_BALANCE = 'WALLET/SUCCESS_UPDATE_WALLET_BALANCE',
  FAILED_UPDATE_WALLET_BALANCE = 'WALLET/FAILED_UPDATE_WALLET_BALANCE',
  SUCCESS_UPDATE_KEY_TOTAL_BALANCE = 'WALLET/SUCCESS_UPDATE_KEY_TOTAL_BALANCE',
  FAILED_UPDATE_KEY_TOTAL_BALANCE = 'WALLET/FAILED_UPDATE_KEY_TOTAL_BALANCE',
  SUCCESS_UPDATE_ALL_KEYS_AND_BALANCES = 'WALLET/SUCCESS_UPDATE_ALL_KEYS_AND_BALANCES',
  FAILED_UPDATE_ALL_KEYS_AND_BALANCES = 'WALLET/FAILED_UPDATE_ALL_KEYS_AND_BALANCES',
  UPDATE_PORTFOLIO_BALANCE = 'WALLET/UPDATE_PORTFOLIO_BALANCE',
  TOGGLE_HOME_KEY_CARD = 'WALLET/TOGGLE_HOME_KEY_CARD',
  UPDATE_KEY_NAME = 'WALLET/UPDATE_KEY_NAME',
  UPDATE_WALLET_NAME = 'WALLET/UPDATE_WALLET_NAME',
  SET_WALLET_REFRESHING = 'WALLET/SET_WALLET_REFRESHING',
  SUCCESS_GET_RECEIVE_ADDRESS = 'WALLET/SUCCESS_GET_RECEIVE_ADDRESS',
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
    rates: Rates;
  };
}

interface failedGetRates {
  type: typeof WalletActionTypes.FAILED_GET_RATES;
}

interface updateCacheKey {
  type: typeof WalletActionTypes.UPDATE_CACHE_KEY;
  payload: CacheKeys;
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
  payload: {[key in string]: Token};
}

interface failedGetTokenOptions {
  type: typeof WalletActionTypes.FAILED_GET_TOKEN_OPTIONS;
}

interface setWalletTermsAccepted {
  type: typeof WalletActionTypes.SET_WALLET_TERMS_ACCEPTED;
}

interface successUpdateWalletBalance {
  type: typeof WalletActionTypes.SUCCESS_UPDATE_WALLET_BALANCE;
  payload: {
    keyId: string;
    walletId: string;
    balance: WalletBalance;
  };
}

interface failedUpdateWalletBalance {
  type: typeof WalletActionTypes.FAILED_UPDATE_WALLET_BALANCE;
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
  };
}

interface failedUpdateKeyTotalBalance {
  type: typeof WalletActionTypes.FAILED_UPDATE_KEY_TOTAL_BALANCE;
}

interface successUpdateAllKeysAndBalances {
  type: typeof WalletActionTypes.SUCCESS_UPDATE_ALL_KEYS_AND_BALANCES;
}

interface failedUpdateAllKeysAndBalances {
  type: typeof WalletActionTypes.FAILED_UPDATE_ALL_KEYS_AND_BALANCES;
}

interface updatePortfolioBalance {
  type: typeof WalletActionTypes.UPDATE_PORTFOLIO_BALANCE;
}

interface toggleHomeKeyCard {
  type: typeof WalletActionTypes.TOGGLE_HOME_KEY_CARD;
  payload: {
    keyId: string;
    show: boolean;
  };
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

export type WalletActionType =
  | successWalletStoreInit
  | failedWalletStoreInit
  | successCreateKey
  | failedCreateKey
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
  | failedGetTokenOptions
  | setWalletTermsAccepted
  | successUpdateWalletBalance
  | failedUpdateWalletBalance
  | successUpdateKeyTotalBalance
  | failedUpdateKeyTotalBalance
  | updatePortfolioBalance
  | successUpdateAllKeysAndBalances
  | failedUpdateAllKeysAndBalances
  | toggleHomeKeyCard
  | updateKeyName
  | updateWalletName
  | setWalletRefreshing
  | successGetReceiveAddress;

import {ExchangeRate, KeyObj, PriceHistory, WalletObj} from './wallet.models';

export enum WalletActionTypes {
  SUCCESS_WALLET_STORE_INIT = 'WALLET/SUCCESS_WALLET_STORE_INIT',
  FAILED_WALLET_STORE_INIT = 'WALLET/FAILED_WALLET_STORE_INIT',
  SUCCESS_CREATE_WALLET = 'WALLET/SUCCESS_CREATE_WALLET',
  FAILED_CREATE_WALLET = 'WALLET/FAILED_CREATE_WALLET',
  SET_BACKUP_COMPLETE = 'WALLET/SET_BACKUP_COMPLETE',
  SUCCESS_GET_RATES = 'WALLET/SUCCESS_GET_RATES',
  FAILED_GET_RATES = 'WALLET/FAILED_GET_RATES',
  SUCCESS_GET_PRICE_HISTORY = 'WALLET/SUCCESS_GET_PRICE_HISTORY',
  FAILED_GET_PRICE_HISTORY = 'WALLET/FAILED_GET_PRICE_HISTORY',
}

interface successWalletStoreInit {
  type: typeof WalletActionTypes.SUCCESS_WALLET_STORE_INIT;
}

interface failedWalletStoreInit {
  type: typeof WalletActionTypes.FAILED_WALLET_STORE_INIT;
}

interface successCreateWallet {
  type: typeof WalletActionTypes.SUCCESS_CREATE_WALLET;
  payload: {
    key: KeyObj;
    wallet: WalletObj;
  };
}

interface failedCreateWallet {
  type: typeof WalletActionTypes.FAILED_CREATE_WALLET;
}

interface setBackupComplete {
  type: typeof WalletActionTypes.SET_BACKUP_COMPLETE;
  payload: string;
}

interface successGetRates {
  type: typeof WalletActionTypes.SUCCESS_GET_RATES;
  payload: {
    rates: {[key in string]: Array<ExchangeRate>};
  };
}

interface failedGetRates {
  type: typeof WalletActionTypes.FAILED_GET_RATES;
}

interface successGetPriceHistory {
  type: typeof WalletActionTypes.SUCCESS_GET_PRICE_HISTORY;
  payload: Array<PriceHistory>;
}

interface failedGetPriceHistory {
  type: typeof WalletActionTypes.FAILED_GET_PRICE_HISTORY;
}

export type WalletActionType =
  | successWalletStoreInit
  | failedWalletStoreInit
  | successCreateWallet
  | failedCreateWallet
  | setBackupComplete
  | successGetRates
  | failedGetRates
  | successGetPriceHistory
  | failedGetPriceHistory;

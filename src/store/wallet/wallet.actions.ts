import {WalletActionType, WalletActionTypes} from './wallet.types';
import {ExchangeRateObj, KeyObj} from './wallet.models';

export const successWalletStoreInit = (): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_WALLET_STORE_INIT,
});

export const failedWalletStoreInit = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_WALLET_STORE_INIT,
});

export const successCreateWallet = (payload: {
  key: KeyObj;
  // TODO type
  wallet: any;
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_CREATE_WALLET,
  payload,
});

export const failedCreateWallet = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_CREATE_WALLET,
});

export const setBackupComplete = (keyId: string): WalletActionType => ({
  type: WalletActionTypes.SET_BACKUP_COMPLETE,
  payload: keyId,
});

export const successGetRates = (payload: {
  rates: ExchangeRateObj;
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_GET_RATES,
  payload,
});

export const failedGetRates = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_GET_RATES,
});

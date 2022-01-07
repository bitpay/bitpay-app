import {WalletActionType, WalletActionTypes} from './wallet.types';
import {ExchangeRate, KeyMethods, KeyObj, PriceHistory} from './wallet.models';

export const successWalletStoreInit = (): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_WALLET_STORE_INIT,
});

export const failedWalletStoreInit = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_WALLET_STORE_INIT,
});

export const successCreateWallet = (payload: {
  key: KeyObj;
  keyMethods: KeyMethods;
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
  rates: {[key in string]: Array<ExchangeRate>};
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_GET_RATES,
  payload,
});

export const failedGetRates = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_GET_RATES,
});

export const successGetPriceHistory = (
  payload: Array<PriceHistory>,
): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_GET_PRICE_HISTORY,
  payload,
});

export const failedGetPriceHistory = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_GET_PRICE_HISTORY,
});

export const updateAssetBalance = (payload: {
  keyId: string;
  assetId: string;
  balance: number;
}): WalletActionType => ({
  type: WalletActionTypes.UPDATE_ASSET_BALANCE,
  payload,
});

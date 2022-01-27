import {WalletActionType, WalletActionTypes} from './wallet.types';
import {
  ExchangeRate,
  Key,
  PriceHistory,
  Token,
} from './wallet.models';
import {ReceiveAddressConfig} from '../../navigation/wallet/components/ReceiveAddress';

export const successWalletStoreInit = (): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_WALLET_STORE_INIT,
});

export const failedWalletStoreInit = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_WALLET_STORE_INIT,
});

export const successCreateKey = (payload: {key: Key}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_CREATE_KEY,
  payload,
});

export const failedCreateKey = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_CREATE_KEY,
});

export const successImport = (payload: {key: Key}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_IMPORT,
  payload,
});

export const failedImport = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_IMPORT,
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

export const updateWalletBalance = (payload: {
  keyId: string;
  walletId: string;
  balance: number;
}): WalletActionType => ({
  type: WalletActionTypes.UPDATE_WALLET_BALANCE,
  payload,
});

export const successEncryptOrDecryptPassword = (payload: {
  key: Key;
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_ENCRYPT_OR_DECRYPT_PASSWORD,
  payload,
});

export const deleteKey = (payload: {keyId: string}): WalletActionType => ({
  type: WalletActionTypes.DELETE_KEY,
  payload,
});

export const successGetTokenOptions = (payload: {
  [key in string]: Token;
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_GET_TOKEN_OPTIONS,
  payload,
});

export const failedGetTokenOptions = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_GET_TOKEN_OPTIONS,
});

export const showReceiveAddressModal = (
  payload: ReceiveAddressConfig,
): WalletActionType => ({
  type: WalletActionTypes.SHOW_RECEIVE_ADDRESS_MODAL,
  payload,
});

export const dismissReceiveAddressModal = (): WalletActionType => ({
  type: WalletActionTypes.DISMISS_RECEIVE_ADDRESS_MODAL,
});

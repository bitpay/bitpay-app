import {WalletActionType, WalletActionTypes} from './wallet.types';
import {
  Key,
  PriceHistory,
  Token,
  WalletBalance,
  Wallet,
  Rates,
  CacheKeys,
} from './wallet.models';

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

export const successAddWallet = (payload: {key: Key}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_ADD_WALLET,
  payload,
});

export const failedAddWallet = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_ADD_WALLET,
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

export const successGetRates = (payload: {rates: Rates}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_GET_RATES,
  payload,
});

export const failedGetRates = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_GET_RATES,
});

export const updateCacheKey = (payload: CacheKeys): WalletActionType => ({
  type: WalletActionTypes.UPDATE_CACHE_KEY,
  payload,
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

export const setWalletTermsAccepted = (): WalletActionType => ({
  type: WalletActionTypes.SET_WALLET_TERMS_ACCEPTED,
});

export const successUpdateWalletBalance = (payload: {
  keyId: string;
  walletId: string;
  balance: WalletBalance;
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_UPDATE_WALLET_BALANCE,
  payload,
});

export const failedUpdateWalletBalance = (payload: {
  keyId: string;
  walletId: string;
}): WalletActionType => ({
  type: WalletActionTypes.FAILED_UPDATE_WALLET_BALANCE,
  payload,
});

export const successUpdateKeyTotalBalance = (payload: {
  keyId: string;
  totalBalance: number;
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_UPDATE_KEY_TOTAL_BALANCE,
  payload,
});

export const failedUpdateKeyTotalBalance = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_UPDATE_KEY_TOTAL_BALANCE,
});

export const successUpdateAllKeysAndBalances = (): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_UPDATE_ALL_KEYS_AND_BALANCES,
});

export const failedUpdateAllKeysAndBalances = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_UPDATE_ALL_KEYS_AND_BALANCES,
});

export const updatePortfolioBalance = (): WalletActionType => ({
  type: WalletActionTypes.UPDATE_PORTFOLIO_BALANCE,
});

export const toggleHomeKeyCard = (payload: {
  keyId: string;
  show: boolean;
}): WalletActionType => ({
  type: WalletActionTypes.TOGGLE_HOME_KEY_CARD,
  payload,
});

export const updateKeyName = (payload: {
  keyId: string;
  name: string;
}): WalletActionType => ({
  type: WalletActionTypes.UPDATE_KEY_NAME,
  payload,
});

export const updateWalletName = (payload: {
  keyId: string;
  walletId: string;
  name: string;
}): WalletActionType => ({
  type: WalletActionTypes.UPDATE_WALLET_NAME,
  payload,
});

export const setWalletRefreshing = (payload: {
  keyId: string;
  walletId: string;
  isRefreshing: boolean;
}): WalletActionType => ({
  type: WalletActionTypes.SET_WALLET_REFRESHING,
  payload,
});

export const successGetReceiveAddress = (payload: {
  keyId: string;
  walletId: string;
  receiveAddress: string;
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_GET_RECEIVE_ADDRESS,
  payload,
});

export const setUseUnconfirmedFunds = (payload: boolean): WalletActionType => ({
  type: WalletActionTypes.SET_USE_UNCONFIRMED_FUNDS,
  payload,
});

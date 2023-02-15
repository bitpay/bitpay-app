import {WalletActionType, WalletActionTypes} from './wallet.types';
import {
  CacheFeeLevel,
  CryptoBalance,
  Key,
  Token,
  TransactionProposal,
  Wallet,
} from './wallet.models';
import {CurrencyOpts} from '../../constants/currencies';

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

export const successUpdateKey = (payload: {key: Key}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_UPDATE_KEY,
  payload,
});

export const failedUpdateKey = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_UPDATE_KEY,
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
  tokenOptions: {[key in string]: Token};
  tokenData: {[key in string]: CurrencyOpts};
  tokenOptionsByAddress: {[key in string]: Token};
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_GET_TOKEN_OPTIONS,
  payload,
});

export const successGetCustomTokenOptions = (payload: {
  customTokenOptions: {[key in string]: Token};
  customTokenData: {[key in string]: CurrencyOpts};
  customTokenOptionsByAddress: {[key in string]: Token};
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_GET_CUSTOM_TOKEN_OPTIONS,
  payload,
});

export const failedGetTokenOptions = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_GET_TOKEN_OPTIONS,
});

export const setWalletTermsAccepted = (): WalletActionType => ({
  type: WalletActionTypes.SET_WALLET_TERMS_ACCEPTED,
});

export const successUpdateWalletStatus = (payload: {
  keyId: string;
  walletId: string;
  status: {
    balance: CryptoBalance;
    pendingTxps: TransactionProposal[];
  };
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_UPDATE_WALLET_STATUS,
  payload,
});

export const failedUpdateWalletStatus = (payload: {
  keyId: string;
  walletId: string;
}): WalletActionType => ({
  type: WalletActionTypes.FAILED_UPDATE_WALLET_STATUS,
  payload,
});

export const successUpdateKeysTotalBalance = (
  payload: {
    keyId: string;
    totalBalance: number;
    totalBalanceLastDay: number;
  }[],
): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_UPDATE_KEYS_TOTAL_BALANCE,
  payload,
});

export const failedUpdateKeyTotalBalance = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_UPDATE_KEY_TOTAL_BALANCE,
});

export const successUpdateAllKeysAndStatus = (): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_UPDATE_ALL_KEYS_AND_STATUS,
});

export const failedUpdateAllKeysAndStatus = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_UPDATE_ALL_KEYS_AND_STATUS,
});

export const updatePortfolioBalance = (): WalletActionType => ({
  type: WalletActionTypes.UPDATE_PORTFOLIO_BALANCE,
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

export const updateWalletTxHistory = (payload: {
  keyId: string;
  walletId: string;
  transactionHistory: {
    transactions: any[];
    loadMore: boolean;
    hasConfirmingTxs: boolean;
  };
}): WalletActionType => ({
  type: WalletActionTypes.UPDATE_WALLET_TX_HISTORY,
  payload,
});

export const setUseUnconfirmedFunds = (payload: boolean): WalletActionType => ({
  type: WalletActionTypes.SET_USE_UNCONFIRMED_FUNDS,
  payload,
});

export const setCustomizeNonce = (payload: boolean): WalletActionType => ({
  type: WalletActionTypes.SET_CUSTOMIZE_NONCE,
  payload,
});

export const setQueuedTransactions = (payload: boolean): WalletActionType => ({
  type: WalletActionTypes.SET_QUEUED_TRANSACTIONS,
  payload,
});

export const setEnableReplaceByFee = (payload: boolean): WalletActionType => ({
  type: WalletActionTypes.SET_ENABLE_REPLACE_BY_FEE,
  payload,
});

export const syncWallets = (payload: {
  keyId: string;
  wallets: Wallet[];
}): WalletActionType => ({
  type: WalletActionTypes.SYNC_WALLETS,
  payload,
});

export const toggleHideWallet = (payload: {
  wallet: Wallet;
}): WalletActionType => ({
  type: WalletActionTypes.TOGGLE_HIDE_WALLET,
  payload,
});

export const toggleHideBalance = (payload: {
  wallet: Wallet;
}): WalletActionType => ({
  type: WalletActionTypes.TOGGLE_HIDE_BALANCE,
  payload,
});

export const toggleHideKeyBalance = (payload: {
  keyId: string;
}): WalletActionType => ({
  type: WalletActionTypes.TOGGLE_HIDE_KEY_BALANCE,
  payload,
});

export const updateCacheFeeLevel = (
  payload: CacheFeeLevel,
): WalletActionType => ({
  type: WalletActionTypes.UPDATE_CACHE_FEE_LEVEL,
  payload,
});

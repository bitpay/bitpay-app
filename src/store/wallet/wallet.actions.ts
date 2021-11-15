import {WalletActionType, WalletActionTypes} from './wallet.types';
import {KeyObj} from './wallet.models';

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

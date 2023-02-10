import {initialState, WalletState} from '../wallet/wallet.reducer';
import {
  WalletBackupActionType,
  WalletBackupActionTypes,
} from './wallet-backup.types';

export const walletBackupReducer = (
  state: WalletState = initialState,
  action: WalletBackupActionType,
): WalletState => {
  switch (action.type) {
    case WalletBackupActionTypes.SUCCESS_BACKUP_WALLET_KEYS: {
      const keys = action.payload;
      return {...state, keys};
    }

    default:
      return state;
  }
};

import {Keys} from '../wallet/wallet.reducer';
import {
  WalletBackupActionType,
  WalletBackupActionTypes,
} from './wallet-backup.types';

export const successBackupUpWalletKeys = (
  payload: Keys,
): WalletBackupActionType => ({
  type: WalletBackupActionTypes.SUCCESS_BACKUP_WALLET_KEYS,
  payload,
});

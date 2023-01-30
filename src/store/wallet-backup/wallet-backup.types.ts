import {Keys} from '../wallet/wallet.reducer';

export enum WalletBackupActionTypes {
  SUCCESS_BACKUP_WALLET_KEYS = 'WALLET_BACKUP/SUCCESS_BACKUP_WALLET_KEYS',
}

interface successBackupUpWalletKeys {
  type: typeof WalletBackupActionTypes.SUCCESS_BACKUP_WALLET_KEYS;
  payload: Keys;
}

export type WalletBackupActionType = successBackupUpWalletKeys;

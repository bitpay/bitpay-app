import {KeyObj, KeyProfile} from './wallet.models';

export enum WalletActionTypes {
  SUCCESS_WALLET_STORE_INIT = 'WALLET/SUCCESS_WALLET_STORE_INIT',
  FAILED_WALLET_STORE_INIT = 'WALLET/FAILED_WALLET_STORE_INIT',
  CREATE_KEY_PROFILE = 'WALLET/CREATE_KEY_PROFILE',
  SUCCESS_ONBOARDING_CREATE_WALLET = 'WALLET/SUCCESS_ONBOARDING_CREATE_WALLET',
  FAILED_ONBOARDING_CREATE_WALLET = 'WALLET/FAILED_ONBOARDING_CREATE_WALLET',
  SET_BACKUP_COMPLETE = 'WALLET/SET_BACKUP_COMPLETE',
}

interface successWalletStoreInit {
  type: typeof WalletActionTypes.SUCCESS_WALLET_STORE_INIT;
}

interface failedWalletStoreInit {
  type: typeof WalletActionTypes.FAILED_WALLET_STORE_INIT;
}

interface createKeyProfile {
  type: typeof WalletActionTypes.CREATE_KEY_PROFILE;
  payload: KeyProfile;
}

interface successOnboardingCreateWallet {
  type: typeof WalletActionTypes.SUCCESS_ONBOARDING_CREATE_WALLET;
  payload: {
    key: KeyObj;
    // TODO type
    credentials: any;
  };
}

interface failedOnboardingCreateWallet {
  type: typeof WalletActionTypes.FAILED_ONBOARDING_CREATE_WALLET;
}

interface setBackupComplete {
  type: typeof WalletActionTypes.SET_BACKUP_COMPLETE;
  payload: string;
}

export type WalletActionType =
  | successWalletStoreInit
  | failedWalletStoreInit
  | createKeyProfile
  | successOnboardingCreateWallet
  | failedOnboardingCreateWallet
  | setBackupComplete;

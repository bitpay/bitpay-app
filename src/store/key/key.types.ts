import {KeyObj, KeyProfile} from './key.models';

export enum KeyActionTypes {
  SUCCESS_KEY_STORE_INIT = 'KEY/SUCCESS_KEY_STORE_INIT',
  FAILED_KEY_STORE_INIT = 'KEY/FAILED_KEY_STORE_INIT',
  CREATE_KEY_PROFILE = 'KEY/CREATE_KEY_PROFILE',
  SUCCESS_ONBOARDING_CREATE_WALLET = 'KEY/SUCCESS_ONBOARDING_CREATE_WALLET',
  FAILED_ONBOARDING_CREATE_WALLET = 'KEY/FAILED_ONBOARDING_CREATE_WALLET',
}

interface successKeyStoreInit {
  type: typeof KeyActionTypes.SUCCESS_KEY_STORE_INIT;
}

interface failedKeyStoreInit {
  type: typeof KeyActionTypes.FAILED_KEY_STORE_INIT;
}

interface createKeyProfile {
  type: typeof KeyActionTypes.CREATE_KEY_PROFILE;
  payload: KeyProfile;
}

interface successOnboardingCreateWallet {
  type: typeof KeyActionTypes.SUCCESS_ONBOARDING_CREATE_WALLET;
  payload: {
    key: KeyObj;
  };
}

interface failedOnboardingCreateWallet {
  type: typeof KeyActionTypes.FAILED_ONBOARDING_CREATE_WALLET;
}

export type KeyActionType =
  | successKeyStoreInit
  | failedKeyStoreInit
  | createKeyProfile
  | successOnboardingCreateWallet
  | failedOnboardingCreateWallet;

import {KeyActionType, KeyActionTypes} from './key.types';
import {KeyObj, KeyProfile} from './key.models';

export const successKeyStoreInit = (): KeyActionType => ({
  type: KeyActionTypes.SUCCESS_KEY_STORE_INIT,
});

export const failedKeyStoreInit = (): KeyActionType => ({
  type: KeyActionTypes.FAILED_KEY_STORE_INIT,
});

export const createKeyProfile = (keyProfile: KeyProfile): KeyActionType => ({
  type: KeyActionTypes.CREATE_KEY_PROFILE,
  payload: keyProfile,
});

export const successOnboardingCreateWallet = (payload: {
  key: KeyObj;
}): KeyActionType => ({
  type: KeyActionTypes.SUCCESS_ONBOARDING_CREATE_WALLET,
  payload,
});

export const failedOnboardingCreateWallet = (): KeyActionType => ({
  type: KeyActionTypes.FAILED_ONBOARDING_CREATE_WALLET,
});

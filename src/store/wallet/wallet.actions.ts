import {WalletActionType, WalletActionTypes} from './wallet.types';
import {KeyObj, KeyProfile} from './wallet.models';

export const successWalletStoreInit = (): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_WALLET_STORE_INIT,
});

export const failedWalletStoreInit = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_WALLET_STORE_INIT,
});

export const createKeyProfile = (keyProfile: KeyProfile): WalletActionType => ({
  type: WalletActionTypes.CREATE_KEY_PROFILE,
  payload: keyProfile,
});

export const successOnboardingCreateWallet = (payload: {
  key: KeyObj;
  // TODO type
  credentials: any;
}): WalletActionType => ({
  type: WalletActionTypes.SUCCESS_ONBOARDING_CREATE_WALLET,
  payload,
});

export const failedOnboardingCreateWallet = (): WalletActionType => ({
  type: WalletActionTypes.FAILED_ONBOARDING_CREATE_WALLET,
});

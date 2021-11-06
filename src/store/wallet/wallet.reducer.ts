import {KeyObj, KeyProfile} from './wallet.models';
import {WalletActionType, WalletActionTypes} from './wallet.types';

type WalletReduxPersistBlackList = [];
export const walletReduxPersistBlackList: WalletReduxPersistBlackList = [];

export interface WalletState {
  keyProfile: KeyProfile | undefined;
  keys: Array<KeyObj>;
  assets: Array<object> | undefined;
}

const initialState: WalletState = {
  keyProfile: undefined,
  keys: [],
  assets: [],
};

export const walletReducer = (
  state: WalletState = initialState,
  action: WalletActionType,
): WalletState => {
  switch (action.type) {
    case WalletActionTypes.CREATE_KEY_PROFILE:
      return {
        ...state,
        keyProfile: action.payload,
      };

    case WalletActionTypes.SUCCESS_ONBOARDING_CREATE_WALLET:
      const {key, credentials} = action.payload;
      return {
        ...state,
        keyProfile: {
          ...state.keyProfile,
          credentials,
        },
        keys: [...state.keys, key],
      };

    default:
      return state;
  }
};

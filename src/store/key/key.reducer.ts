import {KeyObj, KeyProfile} from './key.models';
import {KeyActionType, KeyActionTypes} from './key.types';

type KeyReduxPersistBlackList = [];
export const keyReduxPersistBlackList: KeyReduxPersistBlackList = [];

export interface KeyState {
  keyProfile: KeyProfile | undefined;
  keys: Array<KeyObj>;
  assets: Array<object> | undefined;
}

const initialState: KeyState = {
  keyProfile: undefined,
  keys: [],
  assets: [],
};

export const keyReducer = (
  state: KeyState = initialState,
  action: KeyActionType,
): KeyState => {
  switch (action.type) {
    case KeyActionTypes.CREATE_KEY_PROFILE:
      return {
        ...state,
        keyProfile: action.payload,
      };

    case KeyActionTypes.SUCCESS_ONBOARDING_CREATE_WALLET:
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

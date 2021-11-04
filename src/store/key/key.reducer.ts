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
    case KeyActionTypes.SUCCESS_ONBOARDING_CREATE_WALLET:
      const {key} = action.payload;
      return {
        ...state,
        keys: [...state.keys, key],
      };

    default:
      return state;
  }
};

import {AuthActionTypes, AuthActionType} from './auth.types';
import {Account} from './auth.models';

export interface AuthState {
  account: Account | undefined;
}

const initialState: AuthState = {
  account: undefined,
};

export const authReducer = (
  state: AuthState = initialState,
  action: AuthActionType,
): AuthState => {
  switch (action.type) {
    case AuthActionTypes.SUCCESS_CREATE_ACCOUNT:
      return {...state, account: action.payload};

    default:
      return state;
  }
};

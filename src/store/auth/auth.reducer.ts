import {AuthActionTypes, AuthActionType} from './auth.types';
import {Account, Session} from './auth.models';

export const authReduxPersistWhiteList = [];

export interface AuthState {
  account: Account | undefined;
  session: Session | undefined;
}

const initialState: AuthState = {
  account: undefined,
  session: undefined,
};

export const authReducer = (
  state: AuthState = initialState,
  action: AuthActionType,
): AuthState => {
  switch (action.type) {
    case AuthActionTypes.SUCCESS_GET_SESSION:
      return {...state, session: action.payload};

    case AuthActionTypes.SUCCESS_LOGIN:
      return {...state, account: action.payload};

    default:
      return state;
  }
};

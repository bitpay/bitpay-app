import {AuthActionTypes, AuthActionType} from './auth.types';
import {Account, Session} from './auth.models';

export const successGetSession = (session: Session) => ({
  type: AuthActionTypes.SUCCESS_GET_SESSION,
  payload: session,
});

export const failedGetSession = (): AuthActionType => ({
  type: AuthActionTypes.FAILED_GET_SESSION,
});

export const successLogin = (account: Account): AuthActionType => ({
  type: AuthActionTypes.SUCCESS_LOGIN,
  payload: account,
});

export const failedLogin = (): AuthActionType => ({
  type: AuthActionTypes.FAILED_LOGIN,
});

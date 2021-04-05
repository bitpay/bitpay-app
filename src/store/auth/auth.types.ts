import { Account, Session } from './auth.models';

export enum AuthActionTypes {
  SUCCESS_GET_SESSION = 'AUTH/SUCCESS_GET_SESSION',
  FAILED_GET_SESSION = 'AUTH/FAILED_GET_SESSION',
  SUCCESS_LOGIN = 'AUTH/SUCCESS_LOGIN',
  FAILED_LOGIN = 'AUTH/FAILED_LOGIN',
}

interface SuccessGetSession {
  type: typeof AuthActionTypes.SUCCESS_GET_SESSION;
  payload: Session;
}

interface FailedGetSession {
  type: typeof AuthActionTypes.FAILED_GET_SESSION;
}

interface SuccessLogin {
  type: typeof AuthActionTypes.SUCCESS_LOGIN;
  payload: Account;
}

interface FailedLogin {
  type: typeof AuthActionTypes.FAILED_LOGIN;
}

export type AuthActionType =
  | SuccessGetSession
  | FailedGetSession
  | SuccessLogin
  | FailedLogin;

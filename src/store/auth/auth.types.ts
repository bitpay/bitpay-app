import {Account, Session} from './auth.models';

export enum AuthActionTypes {
  SUCCESS_GET_SESSION = 'AUTH/SUCCESS_GET_SESSION',
  FAILED_GET_SESSION = 'AUTH/FAILED_GET_SESSION',
  SUCCESS_CREATE_ACCOUNT = 'AUTH/SUCCESS_CREATE_ACCOUNT',
}

interface SuccessGetSession {
  type: typeof AuthActionTypes.SUCCESS_GET_SESSION;
  payload: Session;
}

interface FailedGetSession {
  type: typeof AuthActionTypes.FAILED_GET_SESSION;
}

interface SuccessCreateAccount {
  type: typeof AuthActionTypes.SUCCESS_CREATE_ACCOUNT;
  payload: Account;
}

export type AuthActionType =
  | SuccessGetSession
  | FailedGetSession
  | SuccessCreateAccount;

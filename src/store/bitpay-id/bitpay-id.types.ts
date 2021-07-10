import {Account} from './bitpay-id.models';

export enum BitPayIdActionTypes {
  SUCCESS_LOGIN = 'BitPayId/SUCCESS_LOGIN',
  FAILED_LOGIN = 'BitPayId/FAILED_LOGIN',
}

interface SuccessLogin {
  type: typeof BitPayIdActionTypes.SUCCESS_LOGIN;
  payload: Account;
}

interface FailedLogin {
  type: typeof BitPayIdActionTypes.FAILED_LOGIN;
}

export type BitPayIdActionType = SuccessLogin | FailedLogin;

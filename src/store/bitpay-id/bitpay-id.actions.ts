import {BitPayIdActionTypes, BitPayIdActionType} from './bitpay-id.types';
import {Account} from './bitpay-id.models';

export const successLogin = (account: Account): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_LOGIN,
  payload: account,
});

export const failedLogin = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_LOGIN,
});

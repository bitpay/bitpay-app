import {BitPayIdActionTypes, BitPayIdActionType} from './bitpay-id.types';
import {User} from './bitpay-id.models';
import {Network} from '../../constants';

export const successLogin = (network: Network, user: User): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_LOGIN,
  payload: { network: network, user },
});

export const failedLogin = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_LOGIN,
});

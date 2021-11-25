import {BitPayIdActionTypes, BitPayIdActionType} from './bitpay-id.types';
import {Session, User} from './bitpay-id.models';
import {Network} from '../../constants';
import {LoginStatus, PairingBitPayIdStatus} from './bitpay-id.reducer';

export const successFetchSession = (session: Session): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_FETCH_SESSION,
  payload: {session},
});

export const failedFetchSession = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_FETCH_SESSION,
});

export const successLogin = (
  network: Network,
  user: User,
  session: Session,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_LOGIN,
  payload: {network, user, session},
});

export const failedLogin = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_LOGIN,
});

export const updateLoginStatus = (status: LoginStatus): BitPayIdActionType => ({
  type: BitPayIdActionTypes.UPDATE_LOGIN_STATUS,
  payload: status,
});

export const successPairingBitPayId = (
  network: Network,
  token: string,
  user: any,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_PAIRING_BITPAY_ID,
  payload: {network, token, user},
});

export const failedPairingBitPayId = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_PAIRING_BITPAY_ID,
});

export const updatePairingBitPayIdStatus = (
  status: PairingBitPayIdStatus,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.UPDATE_PAIRING_BITPAY_ID_STATUS,
  payload: status,
});

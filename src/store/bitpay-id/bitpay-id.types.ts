import {Network} from '../../constants';
import {Session, User} from './bitpay-id.models';
import {LoginStatus, PairingBitPayIdStatus} from './bitpay-id.reducer';

export enum BitPayIdActionTypes {
  SUCCESS_FETCH_SESSION = 'BitPayId/SUCCESS_FETCH_SESSION',
  FAILED_FETCH_SESSION = 'BitPayId/FAILED_FETCH_SESSION',
  SUCCESS_LOGIN = 'BitPayId/SUCCESS_LOGIN',
  FAILED_LOGIN = 'BitPayId/FAILED_LOGIN',
  UPDATE_LOGIN_STATUS = 'BitPayId/UPDATE_LOGIN_STATUS',
  SUCCESS_PAIRING_BITPAY_ID = 'BitPayId/SUCCESS_PAIRING_BITPAY_ID',
  FAILED_PAIRING_BITPAY_ID = 'BitPayId/FAILED_PAIRING_BITPAY_ID',
  UPDATE_PAIRING_BITPAY_ID_STATUS = 'BitPayId/UPDATE_PAIRING_BITPAY_ID_STATUS',
  BITPAY_ID_DISCONNECTED = 'BitPayId/BITPAY_ID_DISCONNECTED',
}

interface SuccessFetchSession {
  type: typeof BitPayIdActionTypes.SUCCESS_FETCH_SESSION;
  payload: {session: Session};
}

interface FailedFetchSession {
  type: typeof BitPayIdActionTypes.FAILED_FETCH_SESSION;
}

interface SuccessLogin {
  type: typeof BitPayIdActionTypes.SUCCESS_LOGIN;
  payload: {network: Network; session: Session};
}

interface FailedLogin {
  type: typeof BitPayIdActionTypes.FAILED_LOGIN;
}

interface UpdateLoginStatus {
  type: typeof BitPayIdActionTypes.UPDATE_LOGIN_STATUS;
  payload: LoginStatus;
}

interface SuccessPairingBitPayId {
  type: typeof BitPayIdActionTypes.SUCCESS_PAIRING_BITPAY_ID;
  payload: {network: Network; token: string; user: User};
}

interface FailedPairingBitPayId {
  type: typeof BitPayIdActionTypes.FAILED_PAIRING_BITPAY_ID;
}

interface UpdatePairingBitPayIdStatus {
  type: typeof BitPayIdActionTypes.UPDATE_PAIRING_BITPAY_ID_STATUS;
  payload: PairingBitPayIdStatus;
}

interface BitPayIdDisconnected {
  type: typeof BitPayIdActionTypes.BITPAY_ID_DISCONNECTED;
  payload: {network: Network};
}

export type BitPayIdActionType =
  | SuccessFetchSession
  | FailedFetchSession
  | SuccessLogin
  | FailedLogin
  | UpdateLoginStatus
  | SuccessPairingBitPayId
  | FailedPairingBitPayId
  | UpdatePairingBitPayIdStatus
  | BitPayIdDisconnected;

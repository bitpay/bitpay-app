import {BitPayIdActionTypes, BitPayIdActionType} from './bitpay-id.types';
import {Session, User} from './bitpay-id.models';
import {Network} from '../../constants';
import {
  FetchBasicInfoStatus,
  EmailPairingStatus,
  LoginStatus,
  PairingBitPayIdStatus,
  TwoFactorAuthStatus,
  TwoFactorPairingStatus,
  FetchSessionStatus,
  PendingLoginStatus,
} from './bitpay-id.reducer';

export const successFetchSession = (session: Session): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_FETCH_SESSION,
  payload: {session},
});

export const failedFetchSession = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_FETCH_SESSION,
});

export const updateFetchSessionStatus = (
  status: FetchSessionStatus,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.UPDATE_FETCH_SESSION_STATUS,
  payload: status,
});

export const successLogin = (
  network: Network,
  session: Session,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_LOGIN,
  payload: {network, session},
});

export const failedLogin = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_LOGIN,
});

export const pendingLogin = (
  status: PendingLoginStatus,
  session: Session,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.PENDING_LOGIN,
  payload: {status, session},
});

export const updateLoginStatus = (status: LoginStatus): BitPayIdActionType => ({
  type: BitPayIdActionTypes.UPDATE_LOGIN_STATUS,
  payload: status,
});

export const successSubmitTwoFactorAuth = (
  network: Network,
  session: Session,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_SUBMIT_TWO_FACTOR_AUTH,
  payload: {network, session},
});

export const failedSubmitTwoFactorAuth = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_SUBMIT_TWO_FACTOR_AUTH,
});

export const successSubmitTwoFactorPairing = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_SUBMIT_TWO_FACTOR_PAIRING,
});

export const failedSubmitTwoFactorPairing = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_SUBMIT_TWO_FACTOR_PAIRING,
});

export const updateTwoFactorAuthStatus = (
  status: TwoFactorAuthStatus,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.UPDATE_TWO_FACTOR_AUTH_STATUS,
  payload: status,
});

export const updateTwoFactorPairStatus = (
  status: TwoFactorPairingStatus,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.UPDATE_TWO_FACTOR_PAIRING_STATUS,
  payload: status,
});

export const successEmailPairing = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_EMAIL_PAIRING,
});

export const failedEmailPairing = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_EMAIL_PAIRING,
});

export const updateEmailPairingStatus = (
  status: EmailPairingStatus,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.UPDATE_EMAIL_PAIRING_STATUS,
  payload: status,
});

export const successPairingBitPayId = (
  network: Network,
  token: string,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_PAIRING_BITPAY_ID,
  payload: {network, token},
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

export const completedPairing = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.COMPLETED_PAIRING,
});

export const successFetchBasicInfo = (
  network: Network,
  user: User,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_FETCH_BASIC_INFO,
  payload: {network, user},
});

export const failedFetchBasicInfo = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_FETCH_BASIC_INFO,
});

export const updateFetchBasicInfoStatus = (
  status: FetchBasicInfoStatus,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.UPDATE_FETCH_BASIC_INFO_STATUS,
  payload: status,
});

export const bitPayIdDisconnected = (network: Network): BitPayIdActionType => ({
  type: BitPayIdActionTypes.BITPAY_ID_DISCONNECTED,
  payload: {network},
});

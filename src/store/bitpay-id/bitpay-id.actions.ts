import {InitialUserData} from '../../api/user/user.types';
import {Network} from '../../constants';
import {
  ReceivingAddress,
  SecuritySettings,
  Session,
  User,
} from './bitpay-id.models';
import {
  CreateAccountStatus,
  EmailPairingStatus,
  FetchBasicInfoStatus,
  FetchDoshTokenStatus,
  FetchSessionStatus,
  LoginStatus,
  PairingBitPayIdStatus,
  PendingLoginStatus,
  TwoFactorAuthStatus,
  TwoFactorPairingStatus,
} from './bitpay-id.reducer';
import {BitPayIdActionType, BitPayIdActionTypes} from './bitpay-id.types';

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

export const resetAuthStack = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.RESET_AUTH_STACK,
});

export const successCreateAccount = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_CREATE_ACCOUNT,
});

export const failedCreateAccount = (error?: string): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_CREATE_ACCOUNT,
  payload: {error},
});

export const updateCreateAccountStatus = (
  status: CreateAccountStatus,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.UPDATE_CREATE_ACCOUNT_STATUS,
  payload: status,
});

export const successLogin = (
  network: Network,
  session: Session,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_LOGIN,
  payload: {network, session},
});

export const failedLogin = (error?: string): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_LOGIN,
  payload: {error},
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

export const failedSubmitTwoFactorAuth = (
  error?: string,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_SUBMIT_TWO_FACTOR_AUTH,
  payload: {error},
});

export const successSubmitTwoFactorPairing = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_SUBMIT_TWO_FACTOR_PAIRING,
});

export const failedSubmitTwoFactorPairing = (
  error?: string,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_SUBMIT_TWO_FACTOR_PAIRING,
  payload: {error},
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

export const failedPairingBitPayId = (error?: string): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_PAIRING_BITPAY_ID,
  payload: {error},
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

export const successInitializeStore = (
  network: Network,
  data: InitialUserData,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_INITIALIZE_STORE,
  payload: {
    network,
    user: data.basicInfo,
    doshToken: data.doshToken,
  },
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

export const successResetMethodUser = (
  network: Network,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_RESET_METHOD_USER,
  payload: {network},
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

export const successFetchDoshToken = (
  network: Network,
  token: string,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_FETCH_DOSH_TOKEN,
  payload: {network, token},
});

export const failedFetchDoshToken = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FAILED_FETCH_DOSH_TOKEN,
});

export const updateFetchDoshTokenStatus = (
  status: FetchDoshTokenStatus,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.UPDATE_FETCH_DOSH_TOKEN_STATUS,
  payload: status,
});

export const forgotPasswordEmailStatus = (
  status: 'success' | 'failed',
  message: string,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.FORGOT_PASSWORD_EMAIL_STATUS,
  payload: {
    status,
    message,
  },
});

export const resetForgotPasswordEmailStatus = (): BitPayIdActionType => ({
  type: BitPayIdActionTypes.RESET_FORGOT_PASSWORD_EMAIL_STATUS,
});

export const successFetchReceivingAddresses = (
  network: Network,
  receivingAddresses: ReceivingAddress[],
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_FETCH_RECEIVING_ADDRESSES,
  payload: {network, receivingAddresses},
});

export const successFetchSecuritySettings = (
  network: Network,
  securitySettings: SecuritySettings,
): BitPayIdActionType => ({
  type: BitPayIdActionTypes.SUCCESS_FETCH_SECURITY_SETTINGS,
  payload: {network, securitySettings},
});

import {BitPayIdActionTypes, BitPayIdActionType} from './bitpay-id.types';
import {Session, User} from './bitpay-id.models';
import {Network} from '../../constants';

export const bitPayIdReduxPersistBlackList: (keyof BitPayIdState)[] = [
  'loginStatus',
  'twoFactorAuthStatus',
  'twoFactorPairingStatus',
  'pairingBitPayIdStatus',
  'fetchBasicInfoStatus',
  'doshToken',
];

export type FetchSessionStatus = 'loading' | 'success' | 'failed' | null;
export type LoginStatus =
  | 'success'
  | 'failed'
  | 'twoFactorPending'
  | 'emailAuthenticationPending'
  | null;
export type PendingLoginStatus = Extract<
  LoginStatus,
  'twoFactorPending' | 'emailAuthenticationPending'
>;
export type TwoFactorAuthStatus = 'success' | 'failed' | null;
export type TwoFactorPairingStatus = 'success' | 'failed' | null;
export type EmailPairingStatus = 'success' | 'failed' | null;
export type PairingBitPayIdStatus = 'success' | 'failed' | null;
export type FetchBasicInfoStatus = 'success' | 'failed' | null;

export interface BitPayIdState {
  session: Session;
  apiToken: {
    [key in Network]: string;
  };
  doshToken: {
    [key in Network]: string;
  };
  user: {
    [key in Network]: User | null;
  };
  fetchSessionStatus: FetchSessionStatus;
  loginStatus: LoginStatus;
  twoFactorAuthStatus: TwoFactorAuthStatus;
  twoFactorPairingStatus: TwoFactorPairingStatus;
  emailPairingStatus: EmailPairingStatus;
  pairingBitPayIdStatus: PairingBitPayIdStatus;
  fetchBasicInfoStatus: FetchBasicInfoStatus;
}

const initialState: BitPayIdState = {
  session: {
    csrfToken: '',
    isAuthenticated: false,
    noCaptchaKey: '',
  },
  apiToken: {
    [Network.mainnet]: '',
    [Network.testnet]: '',
  },
  doshToken: {
    [Network.mainnet]: '',
    [Network.testnet]: '',
  },
  user: {
    [Network.mainnet]: null,
    [Network.testnet]: null,
  },
  fetchSessionStatus: null,
  loginStatus: null,
  twoFactorAuthStatus: null,
  twoFactorPairingStatus: null,
  emailPairingStatus: null,
  pairingBitPayIdStatus: null,
  fetchBasicInfoStatus: null,
};

export const bitPayIdReducer = (
  state: BitPayIdState = initialState,
  action: BitPayIdActionType,
): BitPayIdState => {
  switch (action.type) {
    case BitPayIdActionTypes.SUCCESS_STORE_INIT:
      return {
        ...state,
        user: {
          ...state.user,
          [action.payload.network]: action.payload.user,
        },
        doshToken: {
          ...state.doshToken,
          [action.payload.network]: action.payload.doshToken,
        },
      };
    case BitPayIdActionTypes.SUCCESS_FETCH_SESSION:
      return {
        ...state,
        fetchSessionStatus: 'success',
        session: action.payload.session,
      };

    case BitPayIdActionTypes.FAILED_FETCH_SESSION:
      return {
        ...state,
        fetchSessionStatus: 'failed',
      };

    case BitPayIdActionTypes.UPDATE_FETCH_SESSION_STATUS:
      return {
        ...state,
        fetchSessionStatus: action.payload,
      };

    case BitPayIdActionTypes.SUCCESS_LOGIN:
      return {
        ...state,
        loginStatus: 'success',
        session: action.payload.session,
      };

    case BitPayIdActionTypes.PENDING_LOGIN:
      return {
        ...state,
        loginStatus: action.payload.status,
        session: action.payload.session,
      };

    case BitPayIdActionTypes.FAILED_LOGIN:
      return {
        ...state,
        loginStatus: 'failed',
      };

    case BitPayIdActionTypes.UPDATE_LOGIN_STATUS:
      return {
        ...state,
        loginStatus: action.payload,
      };

    case BitPayIdActionTypes.SUCCESS_SUBMIT_TWO_FACTOR_AUTH:
      return {
        ...state,
        twoFactorAuthStatus: 'success',
        session: {
          ...state.session,
          [action.payload.network]: action.payload.session,
        },
      };

    case BitPayIdActionTypes.SUCCESS_SUBMIT_TWO_FACTOR_PAIRING:
      return {
        ...state,
        twoFactorPairingStatus: 'success',
      };

    case BitPayIdActionTypes.FAILED_SUBMIT_TWO_FACTOR_AUTH:
      return {
        ...state,
        twoFactorAuthStatus: 'failed',
      };

    case BitPayIdActionTypes.FAILED_SUBMIT_TWO_FACTOR_PAIRING:
      return {
        ...state,
        twoFactorPairingStatus: 'failed',
      };

    case BitPayIdActionTypes.UPDATE_TWO_FACTOR_AUTH_STATUS:
      return {
        ...state,
        twoFactorAuthStatus: action.payload,
      };

    case BitPayIdActionTypes.UPDATE_TWO_FACTOR_PAIRING_STATUS:
      return {
        ...state,
        twoFactorPairingStatus: 'success',
      };

    case BitPayIdActionTypes.SUCCESS_EMAIL_PAIRING:
      return {
        ...state,
        emailPairingStatus: 'success',
      };

    case BitPayIdActionTypes.FAILED_EMAIL_PAIRING:
      return {
        ...state,
        emailPairingStatus: 'failed',
      };

    case BitPayIdActionTypes.UPDATE_EMAIL_PAIRING_STATUS:
      return {
        ...state,
        emailPairingStatus: action.payload,
      };

    case BitPayIdActionTypes.SUCCESS_PAIRING_BITPAY_ID:
      return {
        ...state,
        pairingBitPayIdStatus: 'success',
        apiToken: {
          ...state.apiToken,
          [action.payload.network]: action.payload.token,
        },
      };

    case BitPayIdActionTypes.FAILED_PAIRING_BITPAY_ID:
      return {
        ...state,
        pairingBitPayIdStatus: 'failed',
      };

    case BitPayIdActionTypes.UPDATE_PAIRING_BITPAY_ID_STATUS:
      return {
        ...state,
        pairingBitPayIdStatus: action.payload,
      };

    case BitPayIdActionTypes.RESET_AUTH_STACK:
    case BitPayIdActionTypes.COMPLETED_PAIRING:
      return {
        ...state,
        loginStatus: null,
        twoFactorAuthStatus: null,
        twoFactorPairingStatus: null,
        emailPairingStatus: null,
        pairingBitPayIdStatus: null,
      };

    case BitPayIdActionTypes.SUCCESS_FETCH_BASIC_INFO:
      return {
        ...state,
        fetchBasicInfoStatus: 'success',
        user: {
          ...state.user,
          [action.payload.network]: action.payload.user,
        },
      };

    case BitPayIdActionTypes.FAILED_FETCH_BASIC_INFO:
      return {
        ...state,
        fetchBasicInfoStatus: 'failed',
      };

    case BitPayIdActionTypes.UPDATE_FETCH_BASIC_INFO_STATUS:
      return {
        ...state,
        fetchBasicInfoStatus: action.payload,
      };

    case BitPayIdActionTypes.BITPAY_ID_DISCONNECTED:
      return {
        ...state,
        apiToken: {
          ...state.apiToken,
          [action.payload.network]: null,
        },
        user: {
          ...state.user,
          [action.payload.network]: null,
        },
        doshToken: {
          ...state.doshToken,
          [action.payload.network]: null,
        }
      };

    default:
      return state;
  }
};

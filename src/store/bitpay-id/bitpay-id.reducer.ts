import {BitPayIdActionTypes, BitPayIdActionType} from './bitpay-id.types';
import {Session, User} from './bitpay-id.models';
import {Network} from '../../constants';

export const bitPayIdReduxPersistBlackList: (keyof BitPayIdState)[] = [
  'loginStatus',
  'pairingBitPayIdStatus',
];

export type LoginStatus =
  | 'success'
  | 'failed'
  | 'twoFactorPending'
  | 'emailAuthenticationPending'
  | null;
export type PairingBitPayIdStatus = 'success' | 'failed' | null;

export interface BitPayIdState {
  session: Session;
  apiToken: {
    [key in Network]: string;
  };
  user: {
    [key in Network]: User | null;
  };
  loginStatus: LoginStatus;
  pairingBitPayIdStatus: PairingBitPayIdStatus;
}

const initialState: BitPayIdState = {
  session: {
    csrfToken: '',
    isAuthenticated: false,
  },
  apiToken: {
    [Network.mainnet]: '',
    [Network.testnet]: '',
  },
  user: {
    [Network.mainnet]: null,
    [Network.testnet]: null,
  },
  loginStatus: null,
  pairingBitPayIdStatus: null,
};

export const bitPayIdReducer = (
  state: BitPayIdState = initialState,
  action: BitPayIdActionType,
): BitPayIdState => {
  switch (action.type) {
    case BitPayIdActionTypes.SUCCESS_FETCH_SESSION:
      return {
        ...state,
        session: action.payload.session,
      };

    case BitPayIdActionTypes.SUCCESS_LOGIN:
      return {
        ...state,
        loginStatus: 'success',
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

    case BitPayIdActionTypes.SUCCESS_PAIRING_BITPAY_ID:
      return {
        ...state,
        pairingBitPayIdStatus: 'success',
        apiToken: {
          ...state.apiToken,
          [action.payload.network]: action.payload.token,
        },
        user: {
          ...state.user,
          [action.payload.network]: action.payload.user,
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
      };

    default:
      return state;
  }
};

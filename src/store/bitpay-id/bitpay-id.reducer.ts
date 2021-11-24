import {BitPayIdActionTypes, BitPayIdActionType} from './bitpay-id.types';
import {Session, User} from './bitpay-id.models';
import {Network} from '../../constants';

export const bitPayIdReduxPersistBlackList = [];

export interface BitPayIdState {
  session: Session;
  apiToken: {
    [key in Network]: string | null;
  };
  user: {
    [key in Network]: User | null;
  };
  loginStatus: 'success' | 'failed' | null;
}

const initialState: BitPayIdState = {
  session: {
    csrfToken: '',
    isAuthenticated: false,
  },
  apiToken: {
    [Network.mainnet]: null,
    [Network.testnet]: null,
  },
  user: {
    [Network.mainnet]: null,
    [Network.testnet]: null,
  },
  loginStatus: null,
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
        user: {
          ...state.user,
          [action.payload.network]: action.payload.user,
        },
      };

    case BitPayIdActionTypes.FAILED_LOGIN:
      return {
        ...state,
        loginStatus: 'failed',
      };

    case BitPayIdActionTypes.RESET_LOGIN:
      return {
        ...state,
        loginStatus: null,
      };

    default:
      return state;
  }
};

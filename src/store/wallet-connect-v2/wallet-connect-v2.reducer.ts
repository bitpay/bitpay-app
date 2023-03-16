import {WCV2RequestType, WCV2SessionType} from './wallet-connect-v2.models';
import {
  WalletConnectV2ActionType,
  WalletConnectV2ActionTypes,
} from './wallet-connect-v2.types';

export const walletConnectV2ReduxPersistBlackList: (keyof WalletConnectV2State)[] =
  [];

export interface WalletConnectV2State {
  sessions: WCV2SessionType[];
  requests: WCV2RequestType[];
}

const initialState: WalletConnectV2State = {
  sessions: [],
  requests: [],
};

export const walletConnectV2Reducer = (
  state: WalletConnectV2State = initialState,
  action: WalletConnectV2ActionType,
): WalletConnectV2State => {
  switch (action.type) {
    case WalletConnectV2ActionTypes.SESSION_PROPOSAL:
      return {
        ...state,
      };
    case WalletConnectV2ActionTypes.SESSION_REJECTION:
      return {
        ...state,
      };
    case WalletConnectV2ActionTypes.SESSION_APPROVAL:
      return {
        ...state,
        sessions: [...state.sessions, action.payload.session],
      };
    case WalletConnectV2ActionTypes.SESSION_REQUEST:
      return {
        ...state,
        requests: [...state.requests, action.payload.request],
      };
    case WalletConnectV2ActionTypes.UPDATE_REQUESTS:
      return {
        ...state,
        requests: action.payload.requests,
      };
    case WalletConnectV2ActionTypes.UPDATE_SESSIONS:
      return {
        ...state,
        sessions: action.payload.sessions,
      };
    default:
      return state;
  }
};

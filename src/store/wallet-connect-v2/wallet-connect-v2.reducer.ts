import {WCV2RequestType, WCV2SessionType} from './wallet-connect-v2.models';
import {
  WalletConnectV2ActionType,
  WalletConnectV2ActionTypes,
} from './wallet-connect-v2.types';
import {Web3WalletTypes} from '@walletconnect/web3wallet';

export const walletConnectV2ReduxPersistBlackList: (keyof WalletConnectV2State)[] =
  ['proposal'];

export interface WalletConnectV2State {
  sessions: WCV2SessionType[];
  requests: WCV2RequestType[];
  proposal?: Web3WalletTypes.EventArguments['session_proposal'];
  contractAbi: {[key: string]: string};
}

const initialState: WalletConnectV2State = {
  sessions: [],
  requests: [],
  proposal: undefined,
  contractAbi: {},
};

export const walletConnectReducer = (
  state: WalletConnectV2State = initialState,
): WalletConnectV2State => {
  return state;
};

export const walletConnectV2Reducer = (
  state: WalletConnectV2State = initialState,
  action: WalletConnectV2ActionType,
): WalletConnectV2State => {
  switch (action.type) {
    case WalletConnectV2ActionTypes.SESSION_PROPOSAL:
      return {
        ...state,
        proposal: action.payload.proposal,
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
      const requestExists = state.requests.some(
        r => r.id === action.payload.request.id,
      );
      return {
        ...state,
        requests: requestExists
          ? state.requests.map(r =>
              r.id === action.payload.request.id ? action.payload.request : r,
            )
          : [...state.requests, action.payload.request],
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

    case WalletConnectV2ActionTypes.CONTRACT_ABI:
      return {
        ...state,
        contractAbi: {
          ...state.contractAbi,
          [action.payload.contractAddress]: action.payload.contractAbi,
        },
      };

    default:
      return state;
  }
};

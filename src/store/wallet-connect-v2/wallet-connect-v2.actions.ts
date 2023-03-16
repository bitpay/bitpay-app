import {SignClientTypes} from '@walletconnect/types';
import {WCV2SessionType} from './wallet-connect-v2.models';
import {
  WalletConnectV2ActionType,
  WalletConnectV2ActionTypes,
} from './wallet-connect-v2.types';

export const sessionProposal = (): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.SESSION_PROPOSAL,
});

export const approveSessionProposal = (
  session: WCV2SessionType,
): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.SESSION_APPROVAL,
  payload: {session},
});

export const rejectSessionProposal = (): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.SESSION_REJECTION,
});

export const sesionRequest = (
  request: SignClientTypes.EventArguments['session_request'],
): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.SESSION_REQUEST,
  payload: {request},
});

export const updateRequests = (
  requests: SignClientTypes.EventArguments['session_request'][],
): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.UPDATE_REQUESTS,
  payload: {requests},
});

export const updateSessions = (
  sessions: WCV2SessionType[],
): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.UPDATE_SESSIONS,
  payload: {sessions},
});

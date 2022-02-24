import {
  WalletConnectActionType,
  WalletConnectActionTypes,
} from './wallet-connect.types';

export const initRequest = (): WalletConnectActionType => ({
  type: WalletConnectActionTypes.INIT_REQUEST,
});

export const successInitRequest = (
  connectors: any,
): WalletConnectActionType => ({
  type: WalletConnectActionTypes.INIT_SUCCESS,
  payload: {connectors},
});

export const failedInitRquest = (): WalletConnectActionType => ({
  type: WalletConnectActionTypes.INIT_FAILURE,
});

export const killSession = (peerId: string): WalletConnectActionType => ({
  type: WalletConnectActionTypes.KILL_SESSION,
  payload: {peerId},
});

export const sessionDisconnected = (
  connectors: any,
  sessions: any,
  requests: any,
): WalletConnectActionType => ({
  type: WalletConnectActionTypes.SESSION_DISCONNECTED,
  payload: {connectors, sessions, requests},
});

export const handleSessionUserApproval = (
  approved: boolean,
  peerId: string,
  response: {accounts: string[] | undefined; chainId: number},
  customData: {keyId: string; walletId: string},
): WalletConnectActionType => ({
  type: WalletConnectActionTypes.HANDLE_SESSION_USER_APPROVAL,
  payload: {approved, peerId, response, customData},
});

export const sessionRequest = (pending: any): WalletConnectActionType => ({
  type: WalletConnectActionTypes.SESSION_REQUEST,
  payload: {pending},
});

export const approveSessionRequest = (
  connectors: any,
  pending: any,
  sessions: any,
): WalletConnectActionType => ({
  type: WalletConnectActionTypes.SESSION_APPROVAL,
  payload: {connectors, pending, sessions},
});

export const rejectSessionRequest = (
  pending: any,
): WalletConnectActionType => ({
  type: WalletConnectActionTypes.SESSION_REJECTION,
  payload: {pending},
});

export const callRequest = (requests: any): WalletConnectActionType => ({
  type: WalletConnectActionTypes.CALL_REQUEST,
  payload: {requests},
});

export const approveCallRequest = (requests: any): WalletConnectActionType => ({
  type: WalletConnectActionTypes.CALL_APPROVAL,
  payload: {requests},
});

export const rejectCallRequest = (requests: any): WalletConnectActionType => ({
  type: WalletConnectActionTypes.CALL_REJECTION,
  payload: {requests},
});

export const handleRequestUserApproval = (
  approved: boolean,
  peerId: string,
  response: any,
): WalletConnectActionType => ({
  type: WalletConnectActionTypes.HANDLE_REQUEST_USER_APPROVAL,
  payload: {approved, peerId, response},
});

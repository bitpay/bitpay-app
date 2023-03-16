import WalletConnect from '@walletconnect/client';
import {
  IWCConnector,
  IWCCustomData,
  IWCRequest,
  IWCSession,
} from './wallet-connect.models';

export enum WalletConnectActionTypes {
  INIT_REQUEST = 'WALLET_CONNECT/INIT_REQUEST',
  INIT_SUCCESS = 'WALLET_CONNECT/INIT_SUCCESS',
  INIT_FAILURE = 'WALLET_CONNECT/INIT_FAILURE',
  SESSION_REQUEST = 'WALLET_CONNECT/SESSION_REQUEST',
  SESSION_APPROVAL = 'WALLET_CONNECT/SESSION_APPROVAL',
  SESSION_REJECTION = 'WALLET_CONNECT/SESSION_REJECTION',
  SESSION_DISCONNECTED = 'WALLET_CONNECT/SESSION_DISCONNECTED',
  KILL_SESSION = 'WALLET_CONNECT/KILL_SESSION',
  HANDLE_SESSION_USER_APPROVAL = 'WALLET_CONNECT/HANDLE_SESSION_USER_APPROVAL',
  CALL_REQUEST = 'WALLET_CONNECT/CALL_REQUEST',
  CALL_APPROVAL = 'WALLET_CONNECT/CALL_APPROVAL',
  CALL_REJECTION = 'WALLET_CONNECT/CALL_REJECTION',
  HANDLE_REQUEST_USER_APPROVAL = 'WALLET_CONNECT/HANDLE_REQUEST_USER_APPROVAL',
  UPDATE_STORE = 'WALLET_CONNECT/UPDATE_STORE',
  UPDATE_SESSION = 'WALLET_CONNECT/UPDATE_SESSION',
}

interface InitRequest {
  type: typeof WalletConnectActionTypes.INIT_REQUEST;
}

interface SuccessInitRequest {
  type: typeof WalletConnectActionTypes.INIT_SUCCESS;
  payload: {
    connectors: IWCConnector[];
  };
}

interface FailedInitRquest {
  type: typeof WalletConnectActionTypes.INIT_FAILURE;
}

interface SessionDisconnected {
  type: typeof WalletConnectActionTypes.SESSION_DISCONNECTED;
  payload: {
    connectors: IWCConnector[];
    sessions: IWCSession[];
    requests: IWCRequest[];
  };
}

interface KillSession {
  type: typeof WalletConnectActionTypes.KILL_SESSION;
  payload: {peerId: string};
}

interface HandleSessionUserApproval {
  type: typeof WalletConnectActionTypes.HANDLE_SESSION_USER_APPROVAL;
  payload: {
    approved: boolean;
    peerId: string;
    response: {accounts: string[] | undefined; chainId: number};
    customData: IWCCustomData;
  };
}

interface SessionRequest {
  type: typeof WalletConnectActionTypes.SESSION_REQUEST;
  payload: {
    pending: WalletConnect[];
  };
}

interface ApproveSessionRequest {
  type: typeof WalletConnectActionTypes.SESSION_APPROVAL;
  payload: {
    connectors: IWCConnector[];
    pending: WalletConnect[];
    sessions: IWCSession[];
  };
}

interface RejectSessionRequest {
  type: typeof WalletConnectActionTypes.SESSION_REJECTION;
  payload: {
    pending: WalletConnect[];
  };
}
interface CallRequest {
  type: typeof WalletConnectActionTypes.CALL_REQUEST;
  payload: {requests: IWCRequest[]};
}

interface ApproveCallRequest {
  type: typeof WalletConnectActionTypes.CALL_APPROVAL;
  payload: {requests: IWCRequest[]};
}

interface RejectCallRequest {
  type: typeof WalletConnectActionTypes.CALL_REJECTION;
  payload: {requests: IWCRequest[]};
}
interface HandleRequestUserApproval {
  type: typeof WalletConnectActionTypes.HANDLE_REQUEST_USER_APPROVAL;
  payload: {
    approved: boolean;
    peerId: string;
    response: {id: number; result: any};
  };
}

interface UpdateStore {
  type: typeof WalletConnectActionTypes.UPDATE_STORE;
  payload: {
    sessions: IWCSession[];
    requests: IWCRequest[];
  };
}
interface UpdateSession {
  type: typeof WalletConnectActionTypes.UPDATE_SESSION;
  payload: {
    connectors: IWCConnector[];
    sessions: IWCSession[];
  };
}

export type WalletConnectActionType =
  | InitRequest
  | SuccessInitRequest
  | FailedInitRquest
  | SessionRequest
  | HandleSessionUserApproval
  | ApproveSessionRequest
  | RejectSessionRequest
  | CallRequest
  | HandleRequestUserApproval
  | ApproveCallRequest
  | RejectCallRequest
  | KillSession
  | SessionDisconnected
  | UpdateStore
  | UpdateSession;

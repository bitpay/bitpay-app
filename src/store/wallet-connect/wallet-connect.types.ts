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
}

interface InitRequest {
  type: typeof WalletConnectActionTypes.INIT_REQUEST;
}

interface SuccessInitRequest {
  type: typeof WalletConnectActionTypes.INIT_SUCCESS;
  payload: {
    connectors: any;
  };
}

interface FailedInitRquest {
  type: typeof WalletConnectActionTypes.INIT_FAILURE;
}

interface SessionDisconnected {
  type: typeof WalletConnectActionTypes.SESSION_DISCONNECTED;
  payload: {connectors: any; sessions: any; requests: any};
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
    customData: {keyId: string; walletId: string};
  };
}

interface SessionRequest {
  type: typeof WalletConnectActionTypes.SESSION_REQUEST;
  payload: {
    pending: any;
  };
}

interface ApproveSessionRequest {
  type: typeof WalletConnectActionTypes.SESSION_APPROVAL;
  payload: {
    connectors: any;
    pending: any;
    sessions: any;
  };
}

interface RejectSessionRequest {
  type: typeof WalletConnectActionTypes.SESSION_REJECTION;
  payload: {
    pending: any;
  };
}
interface CallRequest {
  type: typeof WalletConnectActionTypes.CALL_REQUEST;
  payload: {requests: any};
}

interface ApproveCallRequest {
  type: typeof WalletConnectActionTypes.CALL_APPROVAL;
  payload: {requests: any};
}

interface RejectCallRequest {
  type: typeof WalletConnectActionTypes.CALL_REJECTION;
  payload: {requests: any};
}
interface HandleRequestUserApproval {
  type: typeof WalletConnectActionTypes.HANDLE_REQUEST_USER_APPROVAL;
  payload: {
    approved: boolean;
    peerId: string;
    response: {id: number; result: any};
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
  | SessionDisconnected;

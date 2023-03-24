import {WCV2RequestType, WCV2SessionType} from './wallet-connect-v2.models';

export enum WalletConnectV2ActionTypes {
  SESSION_PROPOSAL = 'WALLET_CONNECT_V2/SESSION_PROPOSAL',
  SESSION_APPROVAL = 'WALLET_CONNECT_V2/SESSION_APPROVAL',
  SESSION_REJECTION = 'WALLET_CONNECT_V2/SESSION_REJECTION',
  SESSION_REQUEST = 'WALLET_CONNECT_V2/SESSION_REQUEST',
  UPDATE_REQUESTS = 'WALLET_CONNECT_V2/UPDATE_REQUESTS',
  UPDATE_SESSIONS = 'WALLET_CONNECT_V2/UPDATE_SESSIONS',
}

interface SessionProposal {
  type: typeof WalletConnectV2ActionTypes.SESSION_PROPOSAL;
}

interface ApproveSessionProposal {
  type: typeof WalletConnectV2ActionTypes.SESSION_APPROVAL;
  payload: {
    session: WCV2SessionType;
  };
}

interface RejectSessionProposal {
  type: typeof WalletConnectV2ActionTypes.SESSION_REJECTION;
}

interface SessionRequest {
  type: typeof WalletConnectV2ActionTypes.SESSION_REQUEST;
  payload: {
    request: WCV2RequestType;
  };
}

interface UpdateRequests {
  type: typeof WalletConnectV2ActionTypes.UPDATE_REQUESTS;
  payload: {
    requests: WCV2RequestType[];
  };
}

interface UpdateSessions {
  type: typeof WalletConnectV2ActionTypes.UPDATE_SESSIONS;
  payload: {
    sessions: WCV2SessionType[];
  };
}

export type WalletConnectV2ActionType =
  | SessionProposal
  | ApproveSessionProposal
  | RejectSessionProposal
  | SessionRequest
  | UpdateRequests
  | UpdateSessions;

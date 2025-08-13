import {WCV2RequestType, WCV2SessionType} from './wallet-connect-v2.models';
import {WalletKitTypes} from '@reown/walletkit';

export enum WalletConnectV2ActionTypes {
  SESSION_PROPOSAL = 'WALLET_CONNECT_V2/SESSION_PROPOSAL',
  SESSION_APPROVAL = 'WALLET_CONNECT_V2/SESSION_APPROVAL',
  SESSION_REJECTION = 'WALLET_CONNECT_V2/SESSION_REJECTION',
  SESSION_REQUEST = 'WALLET_CONNECT_V2/SESSION_REQUEST',
  UPDATE_REQUESTS = 'WALLET_CONNECT_V2/UPDATE_REQUESTS',
  UPDATE_SESSIONS = 'WALLET_CONNECT_V2/UPDATE_SESSIONS',
  CONTRACT_ABI = 'WALLET_CONNECT_V2/CONTRACT_ABI',
}

interface SessionProposal {
  type: typeof WalletConnectV2ActionTypes.SESSION_PROPOSAL;
  payload: {
    proposal?:
      | WalletKitTypes.EventArguments['session_proposal']
      | WalletKitTypes.EventArguments['session_authenticate'];
  };
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

interface ContractAbi {
  type: typeof WalletConnectV2ActionTypes.CONTRACT_ABI;
  payload: {
    contractAbi: string;
    contractAddress: string;
  };
}

export type WalletConnectV2ActionType =
  | SessionProposal
  | ApproveSessionProposal
  | RejectSessionProposal
  | SessionRequest
  | UpdateRequests
  | UpdateSessions
  | ContractAbi;

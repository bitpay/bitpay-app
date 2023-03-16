import WalletConnect from '@walletconnect/client';
import {
  IWalletConnectSession,
  IJsonRpcRequest,
} from '@walletconnect/legacy-types';

export interface IWCRequest {
  peerId: string;
  payload: IJsonRpcRequest;
  createdOn?: number;
  chain?: string;
}

export interface IWCCustomData {
  keyId: string;
  walletId: string;
}

export interface IWCConnector {
  connector: WalletConnect;
  customData: IWCCustomData;
}

export interface IWCSession {
  session: IWalletConnectSession;
  customData: IWCCustomData;
}

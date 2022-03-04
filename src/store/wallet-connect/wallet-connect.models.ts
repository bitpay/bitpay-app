import WalletConnect from '@walletconnect/client';
import {IWalletConnectSession} from '@walletconnect/types';
import {IJsonRpcRequest} from '@walletconnect/types';

export interface IWCRequest {
  peerId: string;
  payload: IJsonRpcRequest;
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

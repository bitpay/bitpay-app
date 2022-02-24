import WalletConnect from '@walletconnect/client';
import {IWalletConnectSession} from '@walletconnect/types';

export interface wcConnector {
  connector: WalletConnect;
  customData: {keyId: string; walletId: string};
}

export interface IWalletConnectSessionDict {
  session: IWalletConnectSession;
  customData: {
    keyId: string;
    walletId: string;
  };
}

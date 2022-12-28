import {SessionTypes, SignClientTypes} from '@walletconnect/types';
import {Wallet} from '../wallet/wallet.models';

export type WCV2Key = {
  keyName: string | undefined;
  keyId: string;
  checked: boolean;
  showWallets: boolean;
  wallets: WCV2Wallet[];
};

export type WCV2Wallet = {
  wallet: Wallet;
  checked?: boolean;
};

export type WCV2RequestWalletsType = {
  address: string;
  blockchain: string;
  display_name: string;
};

export type WCV2RequestType =
  SignClientTypes.EventArguments['session_request'] & {createdOn?: number};

export type WCV2SessionType = SessionTypes.Struct & {pairingTopic: string};

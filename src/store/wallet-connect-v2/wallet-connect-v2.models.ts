import {ProposalTypes, SessionTypes} from '@walletconnect/types';
import {Wallet} from '../wallet/wallet.models';
import {Web3WalletTypes} from '@walletconnect/web3wallet';

export type WCV2Key = {
  keyName: string | undefined;
  keyId: string;
  wallets: WCV2Wallet[][];
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
  Web3WalletTypes.EventArguments['session_request'] & {
    createdOn?: number;
    chain?: string;
  };

export type WCV2SessionType = SessionTypes.Struct & {
  pairingTopic: string;
  proposalParams: ProposalTypes.Struct;
  accounts: string[];
  chains: string[];
};

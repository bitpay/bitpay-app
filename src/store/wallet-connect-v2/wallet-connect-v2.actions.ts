import {WCV2SessionType} from './wallet-connect-v2.models';
import {
  WalletConnectV2ActionType,
  WalletConnectV2ActionTypes,
} from './wallet-connect-v2.types';
import {Web3WalletTypes} from '@walletconnect/web3wallet';

export const sessionProposal = (
  proposal?: Web3WalletTypes.EventArguments['session_proposal'],
): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.SESSION_PROPOSAL,
  payload: {proposal},
});

export const approveSessionProposal = (
  session: WCV2SessionType,
): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.SESSION_APPROVAL,
  payload: {session},
});

export const rejectSessionProposal = (): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.SESSION_REJECTION,
});

export const sessionRequest = (
  request: Web3WalletTypes.EventArguments['session_request'] & {
    createdOn?: number;
    swapAmount?: string;
    swapFormatAmount?: string;
    swapFiatAmount?: string;
    swapFromChain?: string;
    swapFromCurrencyAbbreviation?: string;
    receiveAmount?: string;
    senderAddress?: string;
    senderContractAddress?: string;
    recipientAddress?: string;
    senderTokenPrice?: number;
  },
): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.SESSION_REQUEST,
  payload: {request},
});

export const updateRequests = (
  requests: Web3WalletTypes.EventArguments['session_request'][],
): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.UPDATE_REQUESTS,
  payload: {requests},
});

export const updateSessions = (
  sessions: WCV2SessionType[],
): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.UPDATE_SESSIONS,
  payload: {sessions},
});

export const updateContractAbi = (
  contractAbi: string,
  contractAddress: string,
): WalletConnectV2ActionType => ({
  type: WalletConnectV2ActionTypes.CONTRACT_ABI,
  payload: {contractAbi, contractAddress},
});

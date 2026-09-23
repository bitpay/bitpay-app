import {
  EIP155_SIGNING_METHODS,
  SOLANA_SIGNING_METHODS,
} from '../../../constants/WalletConnectV2';
import {EVM_BLOCKCHAIN_ID} from '../../../constants/config';
import {
  getAddressFrom,
  getSignParamsData,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {WCV2RequestType} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';

export type RequestSummary = {
  address?: string;
  isMethodSupported: boolean;
  kind: 'sign' | 'switchChain' | 'unsupportedMethod';
  message?: any;
};

export type MessageView =
  | {kind: 'raw'; value: string}
  | {kind: 'text'; value: string}
  | {kind: 'typedData'; value: {[key: string]: any}};

const findEvmChain = (params: any): string | undefined => {
  const chainId = parseInt(params?.[0]?.chainId, 16);

  return Object.keys(EVM_BLOCKCHAIN_ID).find(
    key => EVM_BLOCKCHAIN_ID[key] === chainId,
  );
};

export const getRequestSummary = (request: WCV2RequestType): RequestSummary => {
  const {method, params} = request.params.request;

  switch (method) {
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
    case EIP155_SIGNING_METHODS.ETH_SIGN:
      return {
        address: getAddressFrom(request),
        isMethodSupported: true,
        kind: 'sign',
        message: getSignParamsData(params),
      };
    case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
      return {
        address: params[1],
        isMethodSupported: true,
        kind: 'sign',
        message: params[0],
      };
    case 'wallet_switchEthereumChain':
    case 'wallet_addEthereumChain':
      return {
        isMethodSupported: !!findEvmChain(params),
        kind: 'switchChain',
      };
    case SOLANA_SIGNING_METHODS.SIGN_MESSAGE:
      return {
        address: params?.pubkey,
        isMethodSupported: true,
        kind: 'sign',
        message: params?.message,
      };
    case SOLANA_SIGNING_METHODS.SIGN_TRANSACTION:
    case SOLANA_SIGNING_METHODS.SIGN_AND_SEND_TRANSACTION:
      return {
        address: params?.instructions?.[0]?.keys?.find(
          (instruction: {isSigner: boolean}) => instruction.isSigner,
        )?.pubkey,
        isMethodSupported: true,
        kind: 'sign',
        message: params?.transaction,
      };
    default:
      return {isMethodSupported: false, kind: 'unsupportedMethod'};
  }
};

export const getMessageView = (message: any): MessageView => {
  let parsed = message;

  if (typeof message === 'string') {
    try {
      parsed = JSON.parse(message);
    } catch {
      return {kind: 'raw', value: message};
    }
  }

  if (parsed?.message) {
    const {domain, primaryType, message: typedMessage} = parsed;

    return {
      kind: 'typedData',
      value: {
        ...(domain ? {domain} : {}),
        ...(primaryType ? {primaryType} : {}),
        message: typedMessage,
      },
    };
  }

  return {
    kind: 'text',
    value: typeof message === 'string' ? message : JSON.stringify(message),
  };
};

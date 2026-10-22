import {
  EIP155_SIGNING_METHODS,
  SOLANA_SIGNING_METHODS,
} from '../../../constants/WalletConnectV2';
import {EVM_BLOCKCHAIN_ID} from '../../../constants/config';
import {
  getAddressFrom,
  getSignedMessage,
  getTypedDataPayload,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {WCV2RequestType} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';

export type RequestSummary = {
  address?: string;
  isMethodSupported: boolean;
  kind: 'sign' | 'switchChain' | 'undecodable' | 'unsupportedMethod';
  message?: any;
};

const UNDECODABLE: RequestSummary = {
  isMethodSupported: false,
  kind: 'undecodable',
};

const decode = <T>(read: () => T): T | undefined => {
  try {
    return read();
  } catch {
    return undefined;
  }
};

export type MessageView =
  | {kind: 'fields'; value: {[key: string]: any}}
  | {kind: 'raw'; value: string};

const TYPED_DATA_METHODS: string[] = [
  EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA,
  EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3,
  EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4,
];

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
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4: {
      const payload = decode(() => getTypedDataPayload(request));

      return payload
        ? {
            address: getAddressFrom(request),
            isMethodSupported: true,
            kind: 'sign',
            message: payload,
          }
        : UNDECODABLE;
    }
    case EIP155_SIGNING_METHODS.ETH_SIGN:
    case EIP155_SIGNING_METHODS.PERSONAL_SIGN: {
      const signed = decode(() => getSignedMessage(request));

      return signed === undefined
        ? UNDECODABLE
        : {
            address:
              method === EIP155_SIGNING_METHODS.ETH_SIGN
                ? params[0]
                : params[1],
            isMethodSupported: true,
            kind: 'sign',
            message: signed,
          };
    }
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
        address: getAddressFrom(request),
        isMethodSupported: true,
        kind: 'sign',
        message: params?.transaction,
      };
    default:
      return {isMethodSupported: false, kind: 'unsupportedMethod'};
  }
};

export const getMessageView = (message: any, method: string): MessageView =>
  // typed data arrives already normalized to the payload that gets hashed; for every
  // other method the signed artifact is the string itself, so it is shown verbatim
  TYPED_DATA_METHODS.includes(method) && message && typeof message === 'object'
    ? {kind: 'fields', value: message}
    : {kind: 'raw', value: String(message ?? '')};

import {Network} from '.';
export const WALLETCONNECT_V2_METADATA = {
  name: 'BitPay Wallet',
  description: 'BitPay Wallet',
  url: '#',
  icons: ['https://bitpay.com/resources/content/images/2019/10/bitpay.png'],
};

export const EIP155_MAINNET_CHAINS: {[key in string]: any} = {
  'eip155:1': {
    chainId: 1,
    name: 'Ethereum',
    chainName: 'eth',
    rpc: 'https://cloudflare-eth.com/',
    network: Network.mainnet,
  },
  'eip155:137': {
    chainId: 137,
    name: 'Polygon',
    chainName: 'matic',
    rpc: 'https://polygon-rpc.com/',
    network: Network.mainnet,
  },
};

export const EIP155_TEST_CHAINS = {
  'eip155:5': {
    chainId: 5,
    name: 'Ethereum Goerli',
    chainName: 'eth',
    rpc: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  },
  'eip155:80001': {
    chainId: 80001,
    name: 'Polygon Mumbai',
    chainName: 'matic',
    rpc: 'https://matic-mumbai.chainstacklabs.com',
    network: Network.testnet,
  },
};

export const EIP155_SIGNING_METHODS = {
  PERSONAL_SIGN: 'personal_sign',
  ETH_SIGN: 'eth_sign',
  ETH_SIGN_TRANSACTION: 'eth_signTransaction',
  ETH_SIGN_TYPED_DATA: 'eth_signTypedData',
  ETH_SIGN_TYPED_DATA_V3: 'eth_signTypedData_v3',
  ETH_SIGN_TYPED_DATA_V4: 'eth_signTypedData_v4',
  ETH_SEND_RAW_TRANSACTION: 'eth_sendRawTransaction',
  ETH_SEND_TRANSACTION: 'eth_sendTransaction',
};

export const WALLET_CONNECT_SUPPORTED_CHAINS: {
  [key in string]: {chain: string; network: string};
} = {
  'eip155:1': {chain: 'eth', network: Network.mainnet},
  'eip155:137': {chain: 'matic', network: Network.mainnet},
  'eip155:5': {chain: 'eth', network: Network.testnet},
  'eip155:80001': {chain: 'matic', network: Network.testnet},
};
export type TEIP155Chain = keyof typeof EIP155_CHAINS;

export const EIP155_CHAINS: {[key in string]: any} = {
  ...EIP155_MAINNET_CHAINS,
  ...EIP155_TEST_CHAINS,
};

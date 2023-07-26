import {Network} from '.';
import {CurrencyOpts} from './currencies';
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
    chain: 'eth',
    currencyAbbreviation: 'eth',
    rpc: 'https://cloudflare-eth.com/',
    network: Network.mainnet,
  },
  'eip155:137': {
    chainId: 137,
    name: 'Polygon',
    chain: 'matic',
    currencyAbbreviation: 'matic',
    rpc: 'https://polygon-rpc.com/',
    network: Network.mainnet,
  },
  'eip155:10': {
    chainId: 10,
    name: 'Optimism',
    chain: 'op',
    currencyAbbreviation: 'op',
    rpc: 'https://mainnet.optimism.io',
    network: Network.mainnet,
  },
};

export const EIP155_TEST_CHAINS = {
  'eip155:5': {
    chainId: 5,
    name: 'Ethereum Goerli',
    chain: 'eth',
    currencyAbbreviation: 'eth',
    rpc: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  },
  'eip155:80001': {
    chainId: 80001,
    name: 'Polygon Mumbai',
    chain: 'matic',
    currencyAbbreviation: 'matic',
    rpc: 'https://matic-mumbai.chainstacklabs.com/',
    network: Network.testnet,
  },
  'eip155:420': {
    chainId: 420,
    name: 'Optimism Goerli',
    chain: 'op',
    currencyAbbreviation: 'op',
    rpc: 'https://goerli.optimism.io',
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
  [key in string]: {chain: string; network: Network};
} = {
  'eip155:1': {chain: 'eth', network: Network.mainnet},
  'eip155:137': {chain: 'matic', network: Network.mainnet},
  'eip155:10': {chain: 'op', network: Network.mainnet},
  'eip155:5': {chain: 'eth', network: Network.testnet},
  'eip155:80001': {chain: 'matic', network: Network.testnet},
  'eip155:420': {chain: 'op', network: Network.testnet},
};
export type TEIP155Chain = keyof typeof EIP155_CHAINS;

export const EIP155_CHAINS: {[key in string]: any} = {
  ...EIP155_MAINNET_CHAINS,
  ...EIP155_TEST_CHAINS,
};

export const WC_EVM_BLOCKCHAIN_EXPLORERS: {[key in string]: any} = {
  op: {
    [Network.mainnet]: 'optimistic.etherscan.io/',
    [Network.testnet]: 'goerli-optimism.etherscan.io/',
  },
};

export const WC_PROTOCOL_NAME: {[key in string]: any} = {
  op: {
    [Network.mainnet]: 'OP Mainnet',
    [Network.testnet]: 'OP Goerli',
  },
};

export const WalletConnectSupportedEvmCoins: {[key in string]: CurrencyOpts} = {
  op: {
    name: 'Optimism',
    chain: 'op',
    coin: 'op',
    unitInfo: {
      unitName: 'OP',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'op',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP155',
      protocolPrefix: {livenet: 'op', testnet: 'op'},
      ratesApi: '',
      blockExplorerUrls: WC_EVM_BLOCKCHAIN_EXPLORERS.op.livenet,
      blockExplorerUrlsTestnet: WC_EVM_BLOCKCHAIN_EXPLORERS.op.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
    theme: {
      coinColor: '#ff0621',
      backgroundColor: '#ff0621',
      gradientBackgroundColor: '#ff0621',
    },
  },
};

export const WC_EVM_SUPPORTED_COINS = Object.keys(
  WalletConnectSupportedEvmCoins,
);

// @ts-ignore
import {REGTEST_BASE_BITPAY_URL} from '@env';
import {version} from '../../package.json'; // TODO: better way to get version
import {Network} from '.';

export const STATIC_CONTENT_CARDS_ENABLED = true;
export const APP_ANALYTICS_ENABLED = !__DEV__;

// GENERAL
export const APP_NAME = 'bitpay';
export const APP_NAME_UPPERCASE = 'BitPay';
export const APP_NETWORK = Network.mainnet;
export const APP_VERSION = version;
export const BASE_BITPAY_URLS = {
  [Network.mainnet]: 'https://bitpay.com',
  [Network.testnet]: 'https://test.bitpay.com',
  [Network.regtest]: REGTEST_BASE_BITPAY_URL || '',
};
// BITCORE
export const BASE_BITCORE_URL = {
  btc: 'https://api.bitcore.io/api',
  ltc: 'https://api.bitcore.io/api',
  bch: 'https://api.bitcore.io/api',
  doge: 'https://api.bitcore.io/api',
  eth: 'https://api-eth.bitcore.io/api',
  matic: 'https://api-matic.bitcore.io/api',
  xrp: 'https://api-xrp.bitcore.io/api',
  arb: 'https://api-eth.bitcore.io/api',
  base: 'https://api-eth.bitcore.io/api',
  op: 'https://api-eth.bitcore.io/api',
  sol: 'https://api-sol.bitcore.io/api',
};

export const APP_DEEPLINK_PREFIX = 'bitpay://';
export const APP_UNIVERSAL_LINK_DOMAINS = [
  'link.bitpay.com',
  'link.test.bitpay.com',
  'link.staging.bitpay.com',
];
export const APP_CRYPTO_PREFIX = [
  'bitcoin',
  'bitcoincash',
  'ethereum',
  'matic',
  'arb',
  'base',
  'op',
  'sol',
  'dogecoin',
  'litecoin',
];

// BWC
export const BASE_BWS_URL = 'https://bws.bitpay.com/bws/api';
export const BWC_TIMEOUT = 100000;

// Storybook
export const APP_LOAD_STORY_BOOK = false;

// Download URL's
export const DOWNLOAD_BITPAY_URL = 'https://bitpay.com/wallet';

// Auth
export const TWO_FACTOR_EMAIL_POLL_INTERVAL = 1000 * 3;
export const TWO_FACTOR_EMAIL_POLL_TIMEOUT = 1000 * 60 * 5;

export const EVM_BLOCKCHAIN_ID: {[key in string]: number} = {
  eth: 1,
  matic: 137,
  arb: 42161,
  base: 8453,
  op: 10,
};

export const SVM_BLOCKCHAIN_ID: {[key in string]: number} = {
  sol: 501,
};

export const BLOCKCHAIN_EXPLORERS: {[key in string]: any} = {
  eth: {
    [Network.mainnet]: 'etherscan.io/',
    [Network.testnet]: 'sepolia.etherscan.io/',
  },
  matic: {
    [Network.mainnet]: 'polygonscan.com/',
    [Network.testnet]: 'amoy.polygonscan.com/',
  },
  arb: {
    [Network.mainnet]: 'arbiscan.io/',
    [Network.testnet]: 'sepolia.arbiscan.io/',
  },
  base: {
    [Network.mainnet]: 'basescan.org/',
    [Network.testnet]: 'sepolia.basescan.org/',
  },
  op: {
    [Network.mainnet]: 'optimistic.etherscan.io/',
    [Network.testnet]: 'sepolia-optimism.etherscan.io/',
  },
  sol: {
    [Network.mainnet]: 'solscan.io/',
    [Network.testnet]: 'solscan.io/', // For testnet we have to add ?cluster=testnet => https://solscan.io/?cluster=testnet
  },
};

export const METHOD_ENVS = {
  [Network.mainnet]: 'production',
  [Network.testnet]: 'dev',
  [Network.regtest]: 'dev',
};

export const PROTOCOL_NAME: {[key in string]: any} = {
  eth: {
    [Network.mainnet]: 'Ethereum Mainnet',
    [Network.testnet]: 'Sepolia',
  },
  sol: {
    [Network.mainnet]: 'Solana',
    [Network.testnet]: 'Devnet',
  },
  matic: {
    [Network.mainnet]: 'Polygon',
    [Network.testnet]: 'Amoy',
  },
  arb: {
    [Network.mainnet]: 'Arbitrum',
    [Network.testnet]: 'Sepolia',
  },
  base: {
    [Network.mainnet]: 'Base',
    [Network.testnet]: 'Sepolia',
  },
  op: {
    [Network.mainnet]: 'Optimism',
    [Network.testnet]: 'Sepolia',
  },
  btc: {
    [Network.testnet]: 'Testnet4',
  },
  bch: {
    [Network.testnet]: 'Testnet4',
  },
  doge: {
    [Network.testnet]: 'Testnet3',
  },
  ltc: {
    [Network.testnet]: 'Testnet4',
  },
  default: {
    [Network.mainnet]: 'Mainnet',
    [Network.testnet]: 'Testnet',
    [Network.regtest]: 'Regtest',
  },
};

// hardware wallet config

/**
 * How long to wait to connect to a discovered device.
 */
export const OPEN_TIMEOUT = 3000;

/**
 * How long to wait to find a device.
 */
export const LISTEN_TIMEOUT = 10000;

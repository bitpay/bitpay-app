// @ts-ignore
import {version} from '../../package.json'; // TODO: better way to get version
import {Network} from '.';

export const STATIC_CONTENT_CARDS_ENABLED = true;
export const APP_ANALYTICS_ENABLED = !__DEV__;
export const METHOD_ENV = __DEV__ ? 'dev' : 'production';

// GENERAL
export const APP_NAME = 'bitpay';
export const APP_NAME_UPPERCASE = 'BitPay';
export const APP_NETWORK = Network.mainnet;
export const APP_VERSION = version;
export const BASE_BITPAY_URLS = {
  [Network.mainnet]: 'https://bitpay.com',
  [Network.testnet]: 'https://test.bitpay.com',
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

export const EVM_BLOCKCHAIN_NETWORK = {
  eth: 'ethereum',
  matic: 'polygon-pos',
};

export const EVM_BLOCKCHAIN_ID: {[key in string]: number} = {
  eth: 1,
  matic: 137,
};

export const EVM_BLOCKCHAIN_EXPLORERS: {[key in string]: any} = {
  eth: {
    [Network.mainnet]: 'etherscan.io/',
    [Network.testnet]: 'goerli.etherscan.io/',
  },
  matic: {
    [Network.mainnet]: 'polygonscan.com/',
    [Network.testnet]: 'mumbai.polygonscan.com/',
  },
};

export const PROTOCOL_NAME: {[key in string]: any} = {
  eth: {
    [Network.mainnet]: 'Ethereum Mainnet',
    [Network.testnet]: 'Goerli',
  },
  matic: {
    [Network.mainnet]: 'Polygon',
    [Network.testnet]: 'Mumbai',
  },
  default: {
    [Network.mainnet]: 'Mainnet',
    [Network.testnet]: 'Testnet',
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

import {Network} from '.';

export const DEVTOOLS_ENABLED = false;
export const STATIC_CONTENT_CARDS_ENABLED = true;

// GENERAL
export const APP_NAME = 'bitpay';
export const APP_NETWORK = Network.mainnet;
export const BASE_BITPAY_URLS = {
  [Network.mainnet]: 'https://bitpay.com',
  [Network.testnet]: 'https://test.bitpay.com',
};
export const APP_DEEPLINK_PREFIX = 'bitpay://';

// BWC
export const BASE_BWS_URL = 'https://bws.bitpay.com/bws/api';
export const BWC_TIMEOUT = 100000;

// Storybook
export const APP_LOAD_STORY_BOOK = false;

// Download URL's
export const DOWNLOAD_BITPAY_URL = 'https://bitpay.com/wallet';

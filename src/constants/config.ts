import {Network} from '.';

// GENERAL
export const BASE_BITPAY_URLS = {
  [Network.mainnet]: 'https://bitpay.com',
  [Network.testnet]: 'https://test.bitpay.com',
};
export const DEEPLINK_PREFIX = 'bitpay';

// BWC
export const BASE_BWS_URL = 'https://bws.bitpay.com/bws/api';
export const BWC_TIMEOUT = 100000;

// Storybook
export const APP_LOAD_STORY_BOOK = false;

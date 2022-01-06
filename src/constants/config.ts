import {VirtualDesignCurrency} from '../store/card/card.types';
import {Network} from '.';

// GENERAL
export const APP_NETWORK = Network.testnet;
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

// Card
export const SUPPORTED_DESIGN_CURRENCIES: {
  [k in VirtualDesignCurrency]: {
    currency: k;
    enabled: boolean;
    reason?: string;
  };
} = {
  'bitpay-b': {
    currency: 'bitpay-b',
    enabled: true,
  },
  BTC: {
    currency: 'BTC',
    enabled: true,
  },
  BCH: {
    currency: 'BCH',
    enabled: true,
  },
  ETH: {
    currency: 'ETH',
    enabled: true,
  },
  GUSD: {
    currency: 'GUSD',
    enabled: true,
  },
  PAX: {
    currency: 'PAX',
    enabled: true,
  },
  BUSD: {
    currency: 'BUSD',
    enabled: true,
  },
  USDC: {
    currency: 'USDC',
    enabled: true,
  },
  XRP: {
    currency: 'XRP',
    enabled: false,
    reason: 'usaRestricted',
  },
  DOGE: {
    currency: 'DOGE',
    enabled: true,
  },
  DAI: {
    currency: 'DAI',
    enabled: true,
  },
  WBTC: {
    currency: 'WBTC',
    enabled: true,
  },
};

import {BitpaySupportedCoins} from './currencies';

export const BALANCE_CACHE_DURATION = 5 * 60; // 5 minutes
export const RATES_CACHE_DURATION = 5 * 60; // 5 minutes
export const SOFT_CONFIRMATION_LIMIT: number = 12;
export const DEFAULT_RBF_SEQ_NUMBER = 0xffffffff;
export const SAFE_CONFIRMATIONS: number = 6;
export const HISTORIC_RATES_CACHE_DURATION = 5 * 60; // 5min
export const HIGH_FEE_LIMIT: {[key in string]: number} = {
  btc: 100, // sat/byte
  eth: 200, // Gwei
};

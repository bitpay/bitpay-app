import {VirtualDesignCurrency} from '../store/card/card.types';

type SupportedDesignCurrenciesConfig = {
  [k in VirtualDesignCurrency]: {
    currency: k;
    enabled: boolean;
    reason?: string;
  };
};

export const SUPPORTED_DESIGN_CURRENCIES: SupportedDesignCurrenciesConfig = {
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

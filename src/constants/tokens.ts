import {Token} from '../store/wallet/wallet.models';

export type TokenOptsType = {
  [key in string]: Token;
};

export const TokensListAPIUrl =
  'https://bitpay.api.enterprise.1inch.exchange/v3.0/1/tokens';

export const BitpaySupportedEthereumTokenOpts: TokenOptsType = {
  usdc: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  usdp: {
    name: 'Paxos Dollar',
    symbol: 'USDP',
    decimals: 18,
    address: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
  },
  pax: {
    // backward compatibility
    name: 'Paxos Standard',
    symbol: 'PAX',
    decimals: 18,
    address: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
  },
  gusd: {
    name: 'Gemini Dollar',
    symbol: 'GUSD',
    decimals: 2,
    address: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
  },
  busd: {
    name: 'Binance USD Coin',
    symbol: 'BUSD',
    decimals: 18,
    address: '0x4fabb145d64652a948d72533023f6e7a623c7c53',
  },
  dai: {
    name: 'Dai',
    symbol: 'DAI',
    decimals: 18,
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
  wbtc: {
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 9,
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  },
  shib: {
    name: 'SHIBA INU',
    symbol: 'SHIB',
    decimals: 18,
    address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
  },
  ape: {
    name: 'ApeCoin',
    symbol: 'APE',
    decimals: 18,
    address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
  },
  euroc: {
    name: 'Euro Coin',
    symbol: 'EUROC',
    decimals: 18,
    address: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
  },
};

export const BitpaySupportedEthereumTokenOptsByAddress: TokenOptsType = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  '0x8e870d67f660d95d5be530380d0ec0bd388289e1': {
    name: 'Paxos Dollar',
    symbol: 'USDP',
    decimals: 18,
    address: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
  },
  '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd': {
    name: 'Gemini Dollar',
    symbol: 'GUSD',
    decimals: 2,
    address: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
  },
  '0x4fabb145d64652a948d72533023f6e7a623c7c53': {
    name: 'Binance USD Coin',
    symbol: 'BUSD',
    decimals: 18,
    address: '0x4fabb145d64652a948d72533023f6e7a623c7c53',
  },
  '0x6b175474e89094c44da98b954eedeac495271d0f': {
    name: 'Dai',
    symbol: 'DAI',
    decimals: 18,
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': {
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 9,
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  },
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': {
    name: 'SHIBA INU',
    symbol: 'SHIB',
    decimals: 18,
    address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
  },
  '0x4d224452801ACEd8B2F0aebE155379bb5D594381': {
    name: 'ApeCoin',
    symbol: 'APE',
    decimals: 18,
    address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
  },
  '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c': {
    name: 'Euro Coin',
    symbol: 'EUROC',
    decimals: 18,
    address: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
  },
};

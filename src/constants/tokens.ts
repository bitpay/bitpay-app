import {Token} from '../store/wallet/wallet.models';

export type TokenOptsType = {
  [key in string]: Token;
};

export const TokensListAPIUrl =
  'https://bitpay.api.enterprise.1inch.exchange/v3.0/1/tokens';

export const BitpaySupportedEthereumTokenOptsByAddress: TokenOptsType = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48_e': {
    name: 'USD Coin',
    symbol: 'usdc',
    decimals: 6,
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  '0x8e870d67f660d95d5be530380d0ec0bd388289e1_e': {
    name: 'Paxos Dollar',
    symbol: 'usdp',
    decimals: 18,
    address: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
  },
  '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd_e': {
    name: 'Gemini Dollar',
    symbol: 'gusd',
    decimals: 2,
    address: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
  },
  '0x4fabb145d64652a948d72533023f6e7a623c7c53_e': {
    name: 'Binance USD',
    symbol: 'busd',
    decimals: 18,
    address: '0x4fabb145d64652a948d72533023f6e7a623c7c53',
  },
  '0x6b175474e89094c44da98b954eedeac495271d0f_e': {
    name: 'DAI',
    symbol: 'dai',
    decimals: 18,
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599_e': {
    name: 'Wrapped Bitcoin',
    symbol: 'wbtc',
    decimals: 8,
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  },
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce_e': {
    name: 'Shiba Inu',
    symbol: 'shib',
    decimals: 18,
    address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
  },
  '0x4d224452801aced8b2f0aebe155379bb5d594381_e': {
    name: 'ApeCoin',
    symbol: 'ape',
    decimals: 18,
    address: '0x4d224452801aced8b2f0aebe155379bb5d594381',
  },
  '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c_e': {
    name: 'Euro Coin',
    symbol: 'euroc',
    decimals: 6,
    address: '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c',
  },
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0_e': {
    name: 'Matic Token',
    symbol: 'matic',
    decimals: 18,
    address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
  },
  '0x6c3ea9036406852006290770bedfcaba0e23a0e8_e': {
    name: 'PayPal USD',
    symbol: 'pyusd',
    decimals: 6,
    address: '0x6c3ea9036406852006290770bedfcaba0e23a0e8',
  },
};

export const BitpaySupportedMaticTokenOptsByAddress: TokenOptsType = {
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359_m': {
    name: 'USDC',
    symbol: 'usdc',
    decimals: 6,
    address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  },
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174_m': {
    name: 'USDC.e',
    symbol: 'usdc.e',
    decimals: 6,
    address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  },
  '0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7_m': {
    name: 'Binance USD',
    symbol: 'busd',
    decimals: 18,
    address: '0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7',
  },
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063_m': {
    name: 'DAI',
    symbol: 'dai',
    decimals: 18,
    address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
  },
  '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6_m': {
    name: 'Wrapped Bitcoin',
    symbol: 'wbtc',
    decimals: 8,
    address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
  },
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619_m': {
    name: 'Wrapped Ether',
    symbol: 'weth',
    decimals: 18,
    address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
  },
  '0x6f8a06447ff6fcf75d803135a7de15ce88c1d4ec_m': {
    name: 'Shiba Inu',
    symbol: 'shib',
    decimals: 18,
    address: '0x6f8a06447ff6fcf75d803135a7de15ce88c1d4ec',
  },
  '0xb7b31a6bc18e48888545ce79e83e06003be70930_m': {
    name: 'ApeCoin',
    symbol: 'ape',
    decimals: 18,
    address: '0xb7b31a6bc18e48888545ce79e83e06003be70930',
  },
};

export const BitpaySupportedArbTokenOptsByAddress: TokenOptsType = {
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831_arb': {
    name: 'USDC',
    symbol: 'usdc',
    decimals: 6,
    address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  },
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f_arb': {
    name: 'Wrapped Bitcoin',
    symbol: 'wbtc',
    decimals: 8,
    address: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
  },
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9_arb': {
    name: 'USDT',
    symbol: 'usdt',
    decimals: 6,
    address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  },
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1_arb': {
    name: 'Wrapped Ether',
    symbol: 'weth',
    decimals: 18,
    address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  },
};

export const BitpaySupportedBaseTokenOptsByAddress: TokenOptsType = {
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913_base': {
    name: 'USDC',
    symbol: 'usdc',
    decimals: 6,
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  },
  '0x4200000000000000000000000000000000000006_base': {
    name: 'Wrapped Ether',
    symbol: 'weth',
    decimals: 18,
    address: '0x4200000000000000000000000000000000000006',
  },
};

export const BitpaySupportedOpTokenOptsByAddress: TokenOptsType = {
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85_op': {
    name: 'USDC',
    symbol: 'usdc',
    decimals: 6,
    address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
  },
  '0x68f180fcce6836688e9084f035309e29bf0a2095_op': {
    name: 'Wrapped Bitcoin',
    symbol: 'wbtc',
    decimals: 8,
    address: '0x68f180fcce6836688e9084f035309e29bf0a2095',
  },
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58_op': {
    name: 'USDT',
    symbol: 'usdt',
    decimals: 6,
    address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
  },
  '0x4200000000000000000000000000000000000006_op': {
    name: 'Wrapped Ether',
    symbol: 'weth',
    decimals: 18,
    address: '0x4200000000000000000000000000000000000006',
  },
};

export const BitpaySupportedTokenOptsByAddress: TokenOptsType = {
  ...BitpaySupportedEthereumTokenOptsByAddress,
  ...BitpaySupportedMaticTokenOptsByAddress,
  ...BitpaySupportedBaseTokenOptsByAddress,
  ...BitpaySupportedOpTokenOptsByAddress,
  ...BitpaySupportedArbTokenOptsByAddress,
};

import {EVM_BLOCKCHAIN_EXPLORERS} from './config';

export type SupportedCoins = 'btc' | 'bch' | 'ltc' | 'doge' | 'eth' | 'matic';
export type SupportedEthereumTokens =
  | '0x4fabb145d64652a948d72533023f6e7a623c7c53_e' // 'busd_e'
  | '0x8e870d67f660d95d5be530380d0ec0bd388289e1_e' // 'usdp_e'
  | '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48_e' // 'usdc_e'
  | '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd_e' // 'gusd_e'
  | '0x6b175474e89094c44da98b954eedeac495271d0f_e' // 'dai_e'
  | '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599_e' // 'wbtc_e'
  | '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce_e' // 'shib_e'
  | '0x4d224452801aced8b2f0aebe155379bb5d594381_e' // 'ape_e'
  | '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c' // 'euroc_e'
  | '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0_e' // 'matic_e';
  | '0x6c3ea9036406852006290770bedfcaba0e23a0e8_e'; // 'pyusd_e';

export type SupportedMaticTokens =
  | '0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7_m' // 'busd_m'
  | '0x2791bca1f2de4661ed88a30c99a7a9449aa84174_m' // 'usdc_m'
  | '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063_m' // 'dai_m'
  | '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6_m' // 'wbtc_m'
  | '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619_m' // 'weth_m'
  | '0x6f8a06447ff6fcf75d803135a7de15ce88c1d4ec_m' // 'shib_m'
  | '0xb7b31a6bc18e48888545ce79e83e06003be70930_m'; // 'ape_m'

export type EVM_CHAINS = 'eth' | 'matic';
export type UTXO_CHAINS = 'btc' | 'bch' | 'doge' | 'ltc';

export interface CurrencyOpts {
  // Bitcore-node
  name: string;
  chain: string;
  coin: string;
  logoURI?: string;
  unitInfo?: {
    // Config/Precision
    unitName: string;
    unitToSatoshi: number;
    unitDecimals: number;
    unitCode: string;
  };
  properties: {
    // Properties
    hasMultiSig: boolean;
    hasMultiSend: boolean;
    isUtxo: boolean;
    isERCToken: boolean;
    isStableCoin: boolean;
    singleAddress: boolean;
    isCustom?: boolean;
  };
  paymentInfo: {
    paymentCode: string;
    protocolPrefix: {livenet: string; testnet: string};
    // Urls
    ratesApi: string;
    blockExplorerUrls: string;
    blockExplorerUrlsTestnet: string;
  };
  feeInfo: {
    // Fee Units
    feeUnit: string;
    feeUnitAmount: number;
    blockTime: number;
    maxMerchantFee: string;
  };
  theme?: {
    coinColor: string;
    backgroundColor: string;
    gradientBackgroundColor: string;
  };
  tokens?: {[key in string]: CurrencyOpts};
  address?: string;
}

export const BitpaySupportedEthereumTokens: {[key in string]: CurrencyOpts} = {
  '0x4fabb145d64652a948d72533023f6e7a623c7c53_e': {
    name: 'Binance USD',
    chain: 'eth',
    coin: 'busd',
    address: '0x4fabb145d64652a948d72533023f6e7a623c7c53',
    unitInfo: {
      unitName: 'BUSD',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'busd',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/busd',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x8e870d67f660d95d5be530380d0ec0bd388289e1_e': {
    name: 'Paxos Dollar',
    chain: 'eth',
    coin: 'usdp',
    address: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
    unitInfo: {
      unitName: 'USDP',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'usdp',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/usdp',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48_e': {
    name: 'USD Coin',
    chain: 'eth',
    coin: 'usdc',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    unitInfo: {
      unitName: 'USDC',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'usdc',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/usdc',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd_e': {
    name: 'Gemini Dollar',
    chain: 'eth',
    coin: 'gusd',
    address: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
    unitInfo: {
      unitName: 'GUSD',
      unitToSatoshi: 1e2,
      unitDecimals: 2,
      unitCode: 'gusd',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/gusd',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x6b175474e89094c44da98b954eedeac495271d0f_e': {
    name: 'DAI',
    chain: 'eth',
    coin: 'dai',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    unitInfo: {
      unitName: 'DAI',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'dai',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/gusd',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599_e': {
    name: 'Wrapped Bitcoin',
    chain: 'eth',
    coin: 'wbtc',
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    unitInfo: {
      unitName: 'WBTC',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'wbtc',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/btc',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce_e': {
    name: 'Shiba Inu',
    chain: 'eth',
    coin: 'shib',
    address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
    unitInfo: {
      unitName: 'SHIB',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'shib',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: false,
      singleAddress: true,
      isCustom: false,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/shib',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1000000000,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x4d224452801aced8b2f0aebe155379bb5d594381_e': {
    name: 'ApeCoin',
    chain: 'eth',
    coin: 'ape',
    address: '0x4d224452801aced8b2f0aebe155379bb5d594381',
    unitInfo: {
      unitName: 'APE',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'ape',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: false,
      singleAddress: true,
      isCustom: false,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/ape',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1000000000,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c_e': {
    name: 'Euro Coin',
    chain: 'eth',
    coin: 'euroc',
    address: '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c',
    unitInfo: {
      unitName: 'EUROC',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'euroc',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: false,
      singleAddress: true,
      isCustom: false,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/euroc',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1000000000,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0_e': {
    name: 'Matic Token',
    chain: 'eth',
    coin: 'matic',
    address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
    unitInfo: {
      unitName: 'MATIC',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'matic',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: false,
      singleAddress: true,
      isCustom: false,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/matic_e',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1000000000,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x6c3ea9036406852006290770bedfcaba0e23a0e8_e': {
    name: 'PayPal USD',
    chain: 'eth',
    coin: 'pyusd',
    address: '0x6c3ea9036406852006290770bedfcaba0e23a0e8',
    unitInfo: {
      unitName: 'PYUSD',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'pyusd',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/pyusd_e',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
};

export const BitpaySupportedMaticTokens: {[key in string]: CurrencyOpts} = {
  '0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7_m': {
    name: 'Binance USD',
    chain: 'matic',
    coin: 'busd',
    address: '0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7',
    unitInfo: {
      unitName: 'BUSD',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'busd',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'matic', testnet: 'matic'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/busd_m',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174_m': {
    name: 'USDC.e',
    chain: 'matic',
    coin: 'usdc.e',
    address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    unitInfo: {
      unitName: 'USDC.e',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'usdc.e',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'matic', testnet: 'matic'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/usdc_m',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359_m': {
    name: 'USDC',
    chain: 'matic',
    coin: 'usdc',
    address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    unitInfo: {
      unitName: 'USDC',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'usdc',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'matic', testnet: 'matic'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/usdc_m',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063_m': {
    name: 'DAI',
    chain: 'matic',
    coin: 'dai',
    address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
    unitInfo: {
      unitName: 'DAI',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'dai',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'matic', testnet: 'matic'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/dai_m',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6_m': {
    name: 'Wrapped Bitcoin',
    chain: 'matic',
    coin: 'wbtc',
    address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    unitInfo: {
      unitName: 'WBTC',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'wbtc',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'matic', testnet: 'matic'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/wbtc_m',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619_m': {
    name: 'Wrapped Ether',
    chain: 'matic',
    coin: 'weth',
    address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    unitInfo: {
      unitName: 'WETH',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'weth',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'matic', testnet: 'matic'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/weth_m',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x6f8a06447ff6fcf75d803135a7de15ce88c1d4ec_m': {
    name: 'Shiba Inu',
    chain: 'matic',
    coin: 'shib',
    address: '0x6f8a06447ff6fcf75d803135a7de15ce88c1d4ec',
    unitInfo: {
      unitName: 'SHIB',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'shib',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: false,
      singleAddress: true,
      isCustom: false,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'matic', testnet: 'matic'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/shib_m',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1000000000,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0xb7b31a6bc18e48888545ce79e83e06003be70930_m': {
    name: 'ApeCoin',
    chain: 'matic',
    coin: 'ape',
    address: '0xb7b31a6bc18e48888545ce79e83e06003be70930',
    unitInfo: {
      unitName: 'APE',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'ape',
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: false,
      singleAddress: true,
      isCustom: false,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'matic', testnet: 'matic'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/ape_m',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1000000000,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
};

export const BitpaySupportedUtxoCoins: {[key in string]: CurrencyOpts} = {
  btc: {
    name: 'Bitcoin',
    chain: 'btc',
    coin: 'btc',
    unitInfo: {
      unitName: 'BTC',
      unitToSatoshi: 100000000,
      unitDecimals: 8,
      unitCode: 'btc',
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false,
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: {livenet: 'bitcoin', testnet: 'bitcoin'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/btc',
      blockExplorerUrls: 'bitpay.com/insight/#/BTC/mainnet/',
      blockExplorerUrlsTestnet: 'bitpay.com/insight/#/BTC/testnet/',
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'urgent',
    },
    theme: {
      coinColor: '#f7931a',
      backgroundColor: '#f7921a',
      gradientBackgroundColor: '#f7921a',
    },
  },
  bch: {
    name: 'Bitcoin Cash',
    chain: 'bch',
    coin: 'bch',
    unitInfo: {
      unitName: 'BCH',
      unitToSatoshi: 100000000,
      unitDecimals: 8,
      unitCode: 'bch',
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false,
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: {livenet: 'bitcoincash', testnet: 'bchtest'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/bch',
      blockExplorerUrls: 'bitpay.com/insight/#/BCH/mainnet/',
      blockExplorerUrlsTestnet: 'bitpay.com/insight/#/BCH/testnet/',
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'normal',
    },
    theme: {
      coinColor: '#2fcf6e',
      backgroundColor: '#2fcf6e',
      gradientBackgroundColor: '#2fcf6e',
    },
  },
  doge: {
    name: 'Dogecoin',
    chain: 'doge',
    coin: 'doge',
    unitInfo: {
      unitName: 'DOGE',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'doge',
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false,
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: {livenet: 'dogecoin', testnet: 'dogecoin'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/doge',
      blockExplorerUrls: 'blockchair.com/',
      blockExplorerUrlsTestnet: 'sochain.com/',
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1e8,
      blockTime: 10,
      maxMerchantFee: 'normal',
    },
    theme: {
      coinColor: '#d8c172',
      backgroundColor: '#d8c172',
      gradientBackgroundColor: '#d8c172',
    },
  },
  ltc: {
    name: 'Litecoin',
    chain: 'ltc',
    coin: 'ltc',
    unitInfo: {
      unitName: 'LTC',
      unitToSatoshi: 100000000,
      unitDecimals: 8,
      unitCode: 'ltc',
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false,
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: {livenet: 'litecoin', testnet: 'litecoin'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/ltc',
      blockExplorerUrls: 'bitpay.com/insight/#/LTC/mainnet/',
      blockExplorerUrlsTestnet: 'bitpay.com/insight/#/LTC/testnet/',
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 2.5,
      maxMerchantFee: 'normal',
    },
    theme: {
      coinColor: '#A6A9AA',
      backgroundColor: '#A6A9AA',
      gradientBackgroundColor: '#A6A9AA',
    },
  },
};

export const OtherBitpaySupportedCoins: {[key in string]: CurrencyOpts} = {
  xrp: {
    name: 'XRP',
    chain: 'xrp',
    coin: 'xrp',
    unitInfo: {
      unitName: 'XRP',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'xrp',
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
      paymentCode: 'BIP73',
      protocolPrefix: {livenet: 'ripple', testnet: 'ripple'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/xrp',
      blockExplorerUrls: 'xrpscan.com/',
      blockExplorerUrlsTestnet: 'test.bithomp.com/explorer/',
    },
    feeInfo: {
      feeUnit: 'drops',
      feeUnitAmount: 1e6,
      blockTime: 0.05,
      maxMerchantFee: 'normal',
    },
    theme: {
      coinColor: '#000000',
      backgroundColor: '#565d6d',
      gradientBackgroundColor: '#565d6d',
    },
  },
};
export const BitpaySupportedEvmCoins: {[key in string]: CurrencyOpts} = {
  eth: {
    name: 'Ethereum',
    chain: 'eth',
    coin: 'eth',
    unitInfo: {
      unitName: 'ETH',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'eth',
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681',
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/eth',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.eth.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
    theme: {
      coinColor: '#6b71d6',
      backgroundColor: '#6b71d6',
      gradientBackgroundColor: '#6b71d6',
    },
  },
  matic: {
    name: 'Polygon',
    chain: 'matic',
    coin: 'matic',
    unitInfo: {
      unitName: 'Matic',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'matic',
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681',
      protocolPrefix: {livenet: 'matic', testnet: 'matic'},
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/matic',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
    theme: {
      coinColor: '#8247e5',
      backgroundColor: '#8247e5',
      gradientBackgroundColor: '#8247e5',
    },
  },
};

export const BitpaySupportedTokens: {[key in string]: CurrencyOpts} = {
  ...BitpaySupportedEthereumTokens,
  ...BitpaySupportedMaticTokens,
};

export const BitpaySupportedCoins: {[key in string]: CurrencyOpts} = {
  ...BitpaySupportedUtxoCoins,
  ...BitpaySupportedEvmCoins,
  ...OtherBitpaySupportedCoins,
};

export const SUPPORTED_EVM_COINS = Object.keys(BitpaySupportedEvmCoins);
export const SUPPORTED_ETHEREUM_TOKENS = Object.values(
  BitpaySupportedEthereumTokens,
).map(token => `${token.coin}_e`);
export const SUPPORTED_MATIC_TOKENS = Object.values(
  BitpaySupportedMaticTokens,
).map(token => `${token.coin}_m`);
export const SUPPORTED_UTXO_COINS = Object.keys(BitpaySupportedUtxoCoins);

export const SUPPORTED_TOKENS = [
  ...SUPPORTED_ETHEREUM_TOKENS,
  ...SUPPORTED_MATIC_TOKENS,
];

export const SUPPORTED_COINS = Object.keys(BitpaySupportedCoins);
export const SUPPORTED_CURRENCIES = [...SUPPORTED_COINS, ...SUPPORTED_TOKENS];

export const EVM_SUPPORTED_TOKENS_LENGTH = {
  eth: SUPPORTED_ETHEREUM_TOKENS.length,
  matic: SUPPORTED_MATIC_TOKENS.length,
};

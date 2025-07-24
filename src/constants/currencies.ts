import {ReactElement} from 'react';
import {CurrencyListIcons} from './SupportedCurrencyOptions';
import {BLOCKCHAIN_EXPLORERS, BASE_BWS_URL} from './config';

export type SupportedChains =
  | 'btc'
  | 'bch'
  | 'ltc'
  | 'doge'
  | 'eth'
  | 'matic'
  | 'op'
  | 'base'
  | 'arb'
  | 'sol';
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

export type SupportedArbTokens =
  | '0xaf88d065e77c8cc2239327c5edb3a432268e5831_arb' // 'usdc_arb'
  | '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f_arb' // 'wbtc_arb'
  | '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9_arb' // 'usdt_arb'
  | '0x82af49447d8a07e3bd95bd0d56f35241523fbab1_arb'; // 'weth_arb'

export type SupportedBaseTokens =
  | '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913_base' // 'usdc_base'
  | '0x4200000000000000000000000000000000000006_base'; // 'weth_base'

export type SupportedOpTokens =
  | '0x0b2c639c533813f4aa9d7837caf62653d097ff85_op' // 'usdc_op'
  | '0x68f180fcce6836688e9084f035309e29bf0a2095_op' // 'wbtc_op'
  | '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58_op' // 'usdt_op'
  | '0x4200000000000000000000000000000000000006_op'; // 'weth_op'

export type SupportedSolTokens = // Solana is case sensitive

    | 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v_sol' // 'usdc_sol'
    | 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB_sol'; // 'usdt_sol'

export type EVM_CHAINS = 'eth' | 'matic';
export type UTXO_CHAINS = 'btc' | 'bch' | 'doge' | 'ltc';
export type SVM_CHAINS = 'sol';
export interface CurrencyOpts {
  // Bitcore-node
  name: string;
  chain: string;
  coin: string;
  feeCurrency: string;
  img?: string | ((props?: any) => ReactElement);
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
    protocolPrefix: {
      livenet: string;
      testnet: string;
      testnet4?: string;
      regtest: string;
    };
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
    feeCurrency: 'eth',
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
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/busd`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    feeCurrency: 'eth',
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
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/usdp`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    feeCurrency: 'eth',
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
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/usdc`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    feeCurrency: 'eth',
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
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/gusd`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    feeCurrency: 'eth',
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
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/gusd`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    feeCurrency: 'eth',
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
      isStableCoin: false,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/btc`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    feeCurrency: 'eth',
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
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/shib`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    feeCurrency: 'eth',
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
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/ape`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    feeCurrency: 'eth',
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
      isStableCoin: true,
      singleAddress: true,
      isCustom: false,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/euroc`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    feeCurrency: 'eth',
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
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/matic_e`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    feeCurrency: 'eth',
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
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/pyusd_e`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    feeCurrency: 'matic',
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
      protocolPrefix: {livenet: 'matic', testnet: 'matic', regtest: 'matic'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/busd_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.matic.testnet,
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
    feeCurrency: 'matic',
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
      protocolPrefix: {livenet: 'matic', testnet: 'matic', regtest: 'matic'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/usdc_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.matic.testnet,
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
    feeCurrency: 'matic',
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
      protocolPrefix: {livenet: 'matic', testnet: 'matic', regtest: 'matic'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/usdc_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.matic.testnet,
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
    feeCurrency: 'matic',
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
      protocolPrefix: {livenet: 'matic', testnet: 'matic', regtest: 'matic'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/dai_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.matic.testnet,
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
    feeCurrency: 'matic',
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
      isStableCoin: false,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'matic', testnet: 'matic', regtest: 'matic'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/wbtc_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.matic.testnet,
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
    feeCurrency: 'matic',
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
      isStableCoin: false,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'matic', testnet: 'matic', regtest: 'matic'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/weth_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.matic.testnet,
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
    feeCurrency: 'matic',
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
      protocolPrefix: {livenet: 'matic', testnet: 'matic', regtest: 'matic'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/shib_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.matic.testnet,
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
    feeCurrency: 'matic',
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
      protocolPrefix: {livenet: 'matic', testnet: 'matic', regtest: 'matic'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/ape_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1000000000,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
};

export const BitpaySupportedSolTokens: {[key in string]: CurrencyOpts} = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v_sol: {
    name: 'USDC',
    chain: 'sol',
    coin: 'usdc',
    feeCurrency: 'sol',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
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
      protocolPrefix: {livenet: 'solana', testnet: 'solana', regtest: 'solana'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/usdc_sol`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB_sol: {
    // Solana is case sensitive
    name: 'USDT',
    chain: 'sol',
    coin: 'usdt',
    feeCurrency: 'sol',
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    unitInfo: {
      unitName: 'USDT',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'usdt',
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
      protocolPrefix: {livenet: 'solana', testnet: 'solana', regtest: 'solana'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/usdt_sol`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.matic.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
};

export const BitpaySupportedArbTokens: {[key in string]: CurrencyOpts} = {
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831_arb': {
    name: 'USD Coin',
    chain: 'arb',
    coin: 'usdc',
    feeCurrency: 'eth',
    address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
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
      protocolPrefix: {
        livenet: 'arbitrum',
        testnet: 'arbitrum',
        regtest: 'arbitrum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/usdc_arb`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.arb.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.arb.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f_arb': {
    name: 'Wrapped Bitcoin',
    chain: 'arb',
    coin: 'wbtc',
    feeCurrency: 'eth',
    address: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
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
      isStableCoin: false,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {
        livenet: 'arbitrum',
        testnet: 'arbitrum',
        regtest: 'arbitrum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/wbtc_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.arb.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.arb.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9_arb': {
    name: 'Tether USD',
    chain: 'arb',
    coin: 'usdt',
    feeCurrency: 'eth',
    address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    unitInfo: {
      unitName: 'USDT',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'usdt',
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
      protocolPrefix: {
        livenet: 'arbitrum',
        testnet: 'arbitrum',
        regtest: 'arbitrum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/usdt_arb`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.arb.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.arb.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1_arb': {
    name: 'Wrapped Ether',
    chain: 'arb',
    coin: 'weth',
    feeCurrency: 'eth',
    address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
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
      isStableCoin: false,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {
        livenet: 'arbitrum',
        testnet: 'arbitrum',
        regtest: 'arbitrum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/weth_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.arb.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.arb.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
};

export const BitpaySupportedBaseTokens: {[key in string]: CurrencyOpts} = {
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913_base': {
    name: 'USD Coin',
    chain: 'base',
    coin: 'usdc',
    feeCurrency: 'eth',
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
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
      protocolPrefix: {livenet: 'base', testnet: 'base', regtest: 'base'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/usdc_base`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.base.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.base.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x4200000000000000000000000000000000000006_base': {
    name: 'Wrapped Ether',
    chain: 'base',
    coin: 'weth',
    feeCurrency: 'eth',
    address: '0x4200000000000000000000000000000000000006',
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
      isStableCoin: false,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: 'base', testnet: 'base', regtest: 'base'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/weth_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.base.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.base.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
};

export const BitpaySupportedOpTokens: {[key in string]: CurrencyOpts} = {
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85_op': {
    name: 'USD Coin',
    chain: 'op',
    coin: 'usdc',
    feeCurrency: 'eth',
    address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
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
      protocolPrefix: {
        livenet: 'optimism',
        testnet: 'optimism',
        regtest: 'optimism',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/usdc_op`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.op.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.op.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x68f180fcce6836688e9084f035309e29bf0a2095_op': {
    name: 'Wrapped Bitcoin',
    chain: 'op',
    coin: 'wbtc',
    feeCurrency: 'eth',
    address: '0x68f180fcce6836688e9084f035309e29bf0a2095',
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
      isStableCoin: false,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {
        livenet: 'optimism',
        testnet: 'optimism',
        regtest: 'optimism',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/wbtc_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.op.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.op.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58_op': {
    name: 'Tether USD',
    chain: 'op',
    coin: 'usdt',
    feeCurrency: 'eth',
    address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    unitInfo: {
      unitName: 'USDT',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'usdt',
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
      protocolPrefix: {
        livenet: 'optimism',
        testnet: 'optimism',
        regtest: 'optimism',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/usdt_op`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.op.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.op.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  },
  '0x4200000000000000000000000000000000000006_op': {
    name: 'Wrapped Ether',
    chain: 'op',
    coin: 'weth',
    feeCurrency: 'eth',
    address: '0x4200000000000000000000000000000000000006',
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
      isStableCoin: false,
      singleAddress: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {
        livenet: 'optimism',
        testnet: 'optimism',
        regtest: 'optimism',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/weth_m`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.op.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.op.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
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
    feeCurrency: 'btc',
    img: CurrencyListIcons.btc,
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
      protocolPrefix: {
        livenet: 'bitcoin',
        testnet: 'bitcoin',
        regtest: 'bitcoin',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/btc`,
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
    feeCurrency: 'bch',
    img: CurrencyListIcons.bch,
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
      protocolPrefix: {
        livenet: 'bitcoincash',
        testnet: 'bchtest',
        testnet4: 'bchtest',
        regtest: 'bchreg',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/bch`,
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
    feeCurrency: 'doge',
    img: CurrencyListIcons.doge,
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
      protocolPrefix: {
        livenet: 'dogecoin',
        testnet: 'dogecoin',
        regtest: 'dogecoin',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/doge`,
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
    feeCurrency: 'ltc',
    img: CurrencyListIcons.ltc,
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
      protocolPrefix: {
        livenet: 'litecoin',
        testnet: 'litecoin',
        regtest: 'litecoin',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/ltc`,
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
    feeCurrency: 'xrp',
    img: CurrencyListIcons.xrp,
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
      protocolPrefix: {livenet: 'ripple', testnet: 'ripple', regtest: 'ripple'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/xrp`,
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
    feeCurrency: 'eth',
    img: CurrencyListIcons.eth,
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
      protocolPrefix: {
        livenet: 'ethereum',
        testnet: 'ethereum',
        regtest: 'ethereum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/eth`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.eth.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.eth.testnet,
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
    coin: 'pol',
    feeCurrency: 'pol',
    img: CurrencyListIcons.matic,
    unitInfo: {
      unitName: 'Polygon',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'pol',
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
      protocolPrefix: {livenet: 'matic', testnet: 'matic', regtest: 'matic'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/matic`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.matic.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.matic.testnet,
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
  arb: {
    name: 'Arbitrum',
    chain: 'arb',
    coin: 'eth',
    feeCurrency: 'eth',
    img: CurrencyListIcons.arb,
    unitInfo: {
      unitName: 'Arbitrum',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'arb',
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
      protocolPrefix: {
        livenet: 'arbitrum',
        testnet: 'arbitrum',
        regtest: 'arbitrum',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/arb`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.arb.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.arb.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
    theme: {
      coinColor: '#12AAFF',
      backgroundColor: '#12AAFF',
      gradientBackgroundColor: '#12AAFF',
    },
  },
  base: {
    name: 'Base',
    chain: 'base',
    coin: 'eth',
    feeCurrency: 'eth',
    img: CurrencyListIcons.base,
    unitInfo: {
      unitName: 'Base',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'base',
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
      protocolPrefix: {livenet: 'base', testnet: 'base', regtest: 'base'},
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/base`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.base.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.base.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
    theme: {
      coinColor: '#1B4ADD',
      backgroundColor: '#1B4ADD',
      gradientBackgroundColor: '#1B4ADD',
    },
  },
  op: {
    name: 'Optimism',
    chain: 'op',
    coin: 'eth',
    feeCurrency: 'eth',
    img: CurrencyListIcons.op,
    unitInfo: {
      unitName: 'Optimism',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'op',
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
      protocolPrefix: {
        livenet: 'optimism',
        testnet: 'optimism',
        regtest: 'optimism',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/op`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.op.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.op.testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
    theme: {
      coinColor: '#FF0420',
      backgroundColor: '#FF0420',
      gradientBackgroundColor: '#FF0420',
    },
  },
};

export const BitpaySupportedSvmCoins: {[key in string]: CurrencyOpts} = {
  sol: {
    name: 'Solana',
    chain: 'sol',
    coin: 'sol',
    feeCurrency: 'sol',
    img: CurrencyListIcons.sol,
    unitInfo: {
      unitName: 'SOL',
      unitToSatoshi: 1e9,
      unitDecimals: 9,
      unitCode: 'sol',
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
      protocolPrefix: {
        livenet: 'solana',
        testnet: 'solana',
        regtest: 'solana',
      },
      ratesApi: `${BASE_BWS_URL}/v3/fiatrates/sol`,
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS.sol.livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS.sol.testnet,
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
};

export const BitpaySupportedTokens: {[key in string]: CurrencyOpts} = {
  ...BitpaySupportedEthereumTokens,
  ...BitpaySupportedSolTokens,
  ...BitpaySupportedMaticTokens,
  ...BitpaySupportedArbTokens,
  ...BitpaySupportedBaseTokens,
  ...BitpaySupportedOpTokens,
};

export const BitpaySupportedCoins: {[key in string]: CurrencyOpts} = {
  ...BitpaySupportedUtxoCoins,
  ...BitpaySupportedEvmCoins,
  ...BitpaySupportedSvmCoins,
  ...OtherBitpaySupportedCoins,
};

export const SUPPORTED_VM_TOKENS = [
  ...Object.keys(BitpaySupportedEvmCoins),
  ...Object.keys(BitpaySupportedSvmCoins),
];
export const SUPPORTED_EVM_COINS = Object.keys(BitpaySupportedEvmCoins);
export const SUPPORTED_SVM_COINS = Object.keys(BitpaySupportedSvmCoins);
export const SUPPORTED_ETHEREUM_TOKENS = Object.values(
  BitpaySupportedEthereumTokens,
).map(token => `${token.coin}_e`);
export const SUPPORTED_MATIC_TOKENS = Object.values(
  BitpaySupportedMaticTokens,
).map(token => `${token.coin}_m`);
export const SUPPORTED_SOL_TOKENS = Object.values(BitpaySupportedSolTokens).map(
  token => `${token.coin}_sol`,
);
export const SUPPORTED_ARB_TOKENS = Object.values(BitpaySupportedArbTokens).map(
  token => `${token.coin}_arb`,
);
export const SUPPORTED_BASE_TOKENS = Object.values(
  BitpaySupportedBaseTokens,
).map(token => `${token.coin}_base`);
export const SUPPORTED_OP_TOKENS = Object.values(BitpaySupportedOpTokens).map(
  token => `${token.coin}_op`,
);
export const SUPPORTED_UTXO_COINS = Object.keys(BitpaySupportedUtxoCoins);

export const SUPPORTED_TOKENS = [
  ...SUPPORTED_ETHEREUM_TOKENS,
  ...SUPPORTED_SOL_TOKENS,
  ...SUPPORTED_MATIC_TOKENS,
  ...SUPPORTED_ARB_TOKENS,
  ...SUPPORTED_BASE_TOKENS,
  ...SUPPORTED_OP_TOKENS,
];

export const SUPPORTED_COINS = Object.keys(BitpaySupportedCoins);
export const SUPPORTED_CURRENCIES = [...SUPPORTED_COINS, ...SUPPORTED_TOKENS];
export const SUPPORTED_CURRENCIES_CHAINS = Array.from(
  new Set(Object.values(BitpaySupportedCoins).map(({chain}) => chain)),
);
export const EVM_SUPPORTED_TOKENS_LENGTH = {
  eth: SUPPORTED_ETHEREUM_TOKENS.length,
  matic: SUPPORTED_MATIC_TOKENS.length,
  arb: SUPPORTED_ARB_TOKENS.length,
  base: SUPPORTED_BASE_TOKENS.length,
  op: SUPPORTED_OP_TOKENS.length,
};
export const SVM_SUPPORTED_TOKENS_LENGTH = {
  sol: SUPPORTED_SOL_TOKENS.length,
};
export const getBaseKeyCreationCoinsAndTokens = () => {
  const selectedCurrencies: Array<{
    chain: string;
    currencyAbbreviation: string;
    isToken: boolean;
    tokenAddress?: string;
  }> = [];
  Object.values(BitpaySupportedCoins).forEach(
    ({chain, coin: currencyAbbreviation}) => {
      selectedCurrencies.push({
        chain,
        currencyAbbreviation,
        isToken: false,
      });
    },
  );
  // TODO ?? probably we should add bitpay supported tokens to base creation coins
  // Object.values(BitpaySupportedTokens).forEach(({chain, coin: currencyAbbreviation, address: tokenAddress}) => {
  //   selectedCurrencies.push({
  //     chain,
  //     currencyAbbreviation,
  //     isToken: true,
  //     tokenAddress,
  //   });
  // });
  return selectedCurrencies;
};

export const getBaseEVMAccountCreationCoinsAndTokens = () => {
  const selectedCurrencies: Array<{
    chain: string;
    currencyAbbreviation: string;
    isToken: boolean;
    tokenAddress?: string;
  }> = [];
  Object.values(BitpaySupportedEvmCoins).forEach(
    ({chain, coin: currencyAbbreviation}) => {
      selectedCurrencies.push({
        chain,
        currencyAbbreviation,
        isToken: false,
      });
    },
  );
  // TODO ?? probably we should add bitpay supported tokens to base creation coins
  // Object.values(BitpaySupportedTokens).forEach(({chain, coin: currencyAbbreviation, address: tokenAddress}) => {
  //   selectedCurrencies.push({
  //     chain,
  //     currencyAbbreviation,
  //     isToken: true,
  //     tokenAddress,
  //   });
  // });
  return selectedCurrencies;
};

export const getBaseSVMAccountCreationCoinsAndTokens = () => {
  const selectedCurrencies: Array<{
    chain: string;
    currencyAbbreviation: string;
    isToken: boolean;
    tokenAddress?: string;
  }> = [];
  Object.values(BitpaySupportedSvmCoins).forEach(
    ({chain, coin: currencyAbbreviation}) => {
      selectedCurrencies.push({
        chain,
        currencyAbbreviation,
        isToken: false,
      });
    },
  );
  // TODO ?? probably we should add bitpay supported tokens to base creation coins
  // Object.values(BitpaySupportedTokens).forEach(({chain, coin: currencyAbbreviation, address: tokenAddress}) => {
  //   selectedCurrencies.push({
  //     chain,
  //     currencyAbbreviation,
  //     isToken: true,
  //     tokenAddress,
  //   });
  // });
  return selectedCurrencies;
};

export const getBaseVMAccountCreationCoinsAndTokens = () => {
  const selectedCurrencies: Array<{
    chain: string;
    currencyAbbreviation: string;
    isToken: boolean;
    tokenAddress?: string;
  }> = [];
  [
    ...Object.values(BitpaySupportedEvmCoins),
    ...Object.values(BitpaySupportedSvmCoins),
  ].forEach(({chain, coin: currencyAbbreviation}) => {
    selectedCurrencies.push({
      chain,
      currencyAbbreviation,
      isToken: false,
    });
  });
  // TODO ?? probably we should add bitpay supported tokens to base creation coins
  // Object.values(BitpaySupportedTokens).forEach(({chain, coin: currencyAbbreviation, address: tokenAddress}) => {
  //   selectedCurrencies.push({
  //     chain,
  //     currencyAbbreviation,
  //     isToken: true,
  //     tokenAddress,
  //   });
  // });
  return selectedCurrencies;
};

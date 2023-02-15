import {EVM_BLOCKCHAIN_EXPLORERS} from './config';

export type SupportedCoins = 'btc' | 'bch' | 'ltc' | 'doge' | 'eth' | 'matic';
export type SupportedEthereumTokens =
  | 'usdc_e'
  | 'gusd_e'
  | 'usdp_e'
  | 'pax_e' // backward compatibility
  | 'busd_e'
  | 'dai_e'
  | 'wbtc_e'
  | 'shib_e'
  | 'ape_e'
  | 'euroc_e'
  | 'matic_e';
export type SupportedMaticTokens =
  | 'usdc_m'
  | 'busd_m'
  | 'dai_m'
  | 'wbtc_m'
  | 'shib_m'
  | 'ape_m'
  | 'euroc_m';
export type SupportedCurrencies =
  | SupportedCoins
  | SupportedEthereumTokens
  | SupportedMaticTokens;
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
}

export const BitpaySupportedEthereumTokens: {[key in string]: CurrencyOpts} = {
  busd_e: {
    name: 'Binance USD',
    chain: 'eth',
    coin: 'busd',
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
  usdp_e: {
    name: 'Paxos Dollar',
    chain: 'eth',
    coin: 'usdp',
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
  pax_e: {
    // backward compatibility
    name: 'Paxos Standard',
    chain: 'eth',
    coin: 'pax',
    unitInfo: {
      unitName: 'PAX',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'pax',
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
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/pax',
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
  usdc_e: {
    name: 'USD Coin',
    chain: 'eth',
    coin: 'usdc',
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
  gusd_e: {
    name: 'Gemini Dollar',
    chain: 'eth',
    coin: 'gusd',
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
  dai_e: {
    name: 'DAI',
    chain: 'eth',
    coin: 'dai',
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
  wbtc_e: {
    name: 'Wrapped Bitcoin',
    chain: 'eth',
    coin: 'wbtc',
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
  shib_e: {
    name: 'Shiba Inu',
    chain: 'eth',
    coin: 'shib',
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
  ape_e: {
    name: 'ApeCoin',
    chain: 'eth',
    coin: 'ape',
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
  euroc_e: {
    name: 'Euro Coin',
    chain: 'eth',
    coin: 'euroc',
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
  matic_e: {
    name: 'Matic Token',
    chain: 'eth',
    coin: 'matic',
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
};

export const BitpaySupportedMaticTokens: {[key in string]: CurrencyOpts} = {
  busd_m: {
    name: 'Binance USD',
    chain: 'matic',
    coin: 'busd',
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
  usdc_m: {
    name: 'USD Coin',
    chain: 'matic',
    coin: 'usdc',
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
  dai_m: {
    name: 'DAI',
    chain: 'matic',
    coin: 'dai',
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
      ratesApi: 'https://bws.bitpay.com/bws/api/v3/fiatrates/gusd_m',
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
  wbtc_m: {
    name: 'Wrapped Bitcoin',
    chain: 'matic',
    coin: 'wbtc',
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
  shib_m: {
    name: 'Shiba Inu',
    chain: 'matic',
    coin: 'shib',
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
  ape_m: {
    name: 'ApeCoin',
    chain: 'matic',
    coin: 'ape',
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

export const BitpaySupportedCurrencies: {[key in string]: CurrencyOpts} = {
  ...BitpaySupportedCoins,
  ...BitpaySupportedTokens,
};

export const SUPPORTED_UTXO_COINS = Object.keys(BitpaySupportedUtxoCoins);
export const SUPPORTED_EVM_COINS = Object.keys(BitpaySupportedEvmCoins);
export const SUPPORTED_ETHEREUM_TOKENS = Object.keys(
  BitpaySupportedEthereumTokens,
);

export const SUPPORTED_MATIC_TOKENS = Object.keys(BitpaySupportedMaticTokens);
export const SUPPORTED_TOKENS = [
  ...SUPPORTED_ETHEREUM_TOKENS,
  ...SUPPORTED_MATIC_TOKENS,
];

export const SUPPORTED_COINS = Object.keys(BitpaySupportedCoins);
export const SUPPORTED_CURRENCIES = Object.keys(BitpaySupportedCurrencies);
export const EVM_SUPPORTED_TOKENS_LENGTH = {
  eth: SUPPORTED_ETHEREUM_TOKENS.length,
  matic: SUPPORTED_MATIC_TOKENS.length,
};

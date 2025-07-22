import {t} from 'i18next';
import {
  ChangellyCurrency,
  ChangellyCurrencyBlockchain,
  ChangellyFixRateDataType,
  ChangellyFixTransactionDataType,
  ChangellyPairParamsDataType,
} from '../../../../store/swap-crypto/models/changelly.models';
import {Wallet} from '../../../../store/wallet/wallet.models';

export const changellySupportedUtxoChains = [
  // UTXO
  'bitcoin',
  'bitcoin_cash',
  'doge',
  'litecoin',
];

export const changellySupportedEvmChains = [
  // EVM
  'ethereum',
  'arbitrum',
  'base', // BASE in Changelly
  'optimism',
  'polygon',
];

export const changellySupportedSvmChains = [
  // SVM
  'solana',
];

export const changellySupportedOtherChains = [
  // Ohters
  'ripple',
];

export const changellySupportedCoins = [
  'btc',
  'bch',
  'eth',
  'eth_arb', // etharb in Changelly
  'eth_base', // ethbase in Changelly
  'eth_op', // ethop in Changelly
  'doge',
  'ltc',
  'matic', // maticpolygon in Changelly | POL // backward compatibility
  'pol',
  'sol',
  'xrp',
];

export const changellySupportedEthErc20Tokens = [
  '1inch',
  'aave',
  'abt',
  'aevo',
  'agi',
  'aioz',
  'aios',
  'alice',
  'alt',
  'amp',
  'ankr',
  'ape',
  'api3',
  'arkm',
  'ast',
  'axs',
  'band',
  'bat',
  'blz',
  'blur',
  'boba',
  'bone',
  'combo',
  'comp',
  'coti',
  'cow',
  'crv',
  'cvx',
  'cvc',
  'dai',
  'dao',
  'dent',
  'dia',
  'dodo',
  'eigen',
  'elon',
  'ena',
  'ens',
  'ethfi',
  'eurq',
  'eurr',
  'eurs',
  'fun',
  'gala',
  'glm',
  'gno',
  'grt',
  'gt',
  'hot',
  'id',
  'ilv',
  'imx',
  'jasmy',
  'knc',
  'la',
  'ldo',
  'link',
  'looks',
  'lpt',
  'lqty',
  'lrc',
  'mana',
  'metis',
  'mkr',
  'mnt',
  'newt',
  'nexo',
  'node',
  'nmr',
  'ogn',
  'okb',
  'omg',
  'omni',
  'ondo',
  'paxg',
  'pepe',
  'pendle',
  'perp',
  'pond',
  'powr',
  'pyusd',
  'qnt',
  'radar',
  'rari',
  'red',
  'req',
  'resolv',
  'rez',
  'rlc',
  'rlusd',
  'rpl',
  'rsr',
  'rss3',
  'sand',
  'sahara',
  'shib',
  'sis',
  'skate',
  'slp',
  'snt',
  'snx',
  'spk',
  'steth',
  'stg',
  'storj',
  'sushi',
  'swftc',
  'syn',
  'syrup',
  'tel',
  'tower',
  'trb',
  'tru',
  'tusd',
  'uma',
  'uni',
  'usdc',
  'usde',
  'usdp',
  'usdq',
  'usdr',
  'usdt', // usdt20 in Changelly
  'vra',
  'wbtc',
  'wldeth',
  'woo',
  'xaut',
  'yfi',
  'ygg',
  'zent',
  'zro',
  'zrx',
];

export const changellySupportedMaticErc20Tokens = [
  'dai', // daipolygon in Changelly
  'far',
  'usdc', // usdcmatic in Changelly
  'usdt', // usdtpolygon in Changelly
];

export const changellySupportedArbitrumTokens = [
  'aeur',
  'aidoge',
  'aptr',
  'arb',
  'dpx',
  'gmx', // gmxarb in Changelly
  'magic',
  'rdnt',
  'spa',
  'sqd',
  'usdc', // usdcarb in Changelly
  'usdt', // usdtarb in Changelly
  'uxlink',
  'vela',
  'vrtx',
  'xai',
  'zroarb',
];

export const changellySupportedBaseTokens = [
  'aero',
  'aixbt',
  'awe',
  'b3',
  'base',
  'brett',
  'carv',
  'degen',
  'home',
  'kaito',
  'sxt',
  'toshi',
  'usdc', // usdcbase in Changelly
  'virtual',
  'zora',
  'zrobase',
];

export const changellySupportedOptimismTokens = [
  'op',
  'usdc', // usdcop in Changelly
  'usdt', // usdtop in Changelly
  'wct',
  'wld',
];

export const changellySupportedSolanaTokens = [
  'act',
  'ai16z',
  'beer',
  'bome',
  'bonk',
  'buzz',
  'chillguy',
  'daddy',
  'dood',
  'fartcoin',
  'fida',
  'goat',
  'gmt',
  'grass',
  'griffain',
  'hnt',
  'huma',
  'io',
  'jto',
  'jup',
  'kmno',
  'layer',
  'me',
  'melania',
  'mew',
  'mobile',
  'mnt',
  'moodeng',
  'myro',
  'neiro',
  'nyan',
  'orca',
  'pengu',
  'pump',
  'pnut',
  'ponke',
  'popcat',
  'prcl',
  'pundu',
  'pyth',
  'ray',
  'render',
  'saros',
  'slerf',
  'swarms',
  'tnsr',
  'trump',
  'usdt', // usdtsol in Changelly
  'usdc', // usdcsol in Changelly
  'vine',
  'w',
  'wen',
  'wif',
  'zbcn',
  'zeus',
];

const supportedTokensByChain: {[key: string]: string[]} = {
  eth: changellySupportedEthErc20Tokens,
  matic: changellySupportedMaticErc20Tokens,
  arb: changellySupportedArbitrumTokens,
  base: changellySupportedBaseTokens,
  op: changellySupportedOptimismTokens,
  sol: changellySupportedSolanaTokens,
};

const blockchainMapping: {[key: string]: string} = {
  bitcoin: 'btc',
  bitcoin_cash: 'bch',
  ethereum: 'eth',
  doge: 'doge',
  litecoin: 'ltc',
  polygon: 'matic',
  arbitrum: 'arb',
  base: 'base',
  optimism: 'op',
  ripple: 'xrp',
  solana: 'sol',
};

export const generateMessageId = (walletId?: string) => {
  const now = Date.now();
  if (walletId) {
    return `${walletId}-${now}`;
  }
  const randomInt = Math.floor(1e8 * Math.random());
  return `${randomInt}-${now}`;
};

export const getChangellySupportedChains = (
  chainType?: 'utxo' | 'evm' | 'svm' | 'other',
) => {
  switch (chainType) {
    case 'utxo':
      return changellySupportedUtxoChains;
    case 'evm':
      return changellySupportedEvmChains;
    case 'svm':
      return changellySupportedSvmChains;
    case 'other':
      return changellySupportedOtherChains;
    default:
      return [
        ...changellySupportedUtxoChains,
        ...changellySupportedEvmChains,
        ...changellySupportedSvmChains,
        ...changellySupportedOtherChains,
      ];
  }
};

export const getChangellyCurrenciesFixedProps = (
  changellyCurrenciesData: ChangellyCurrency[],
): ChangellyCurrency[] => {
  const currencyMapping: {
    [key: string]: {
      name: string;
      fullName?: string;
      blockchain?: string;
      contractAddress?: string;
    };
  } = {
    usdc: {
      name: 'usdc',
      fullName: 'USD Coin',
      blockchain: 'ethereum',
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
    usdt20: {
      name: 'usdt',
      fullName: 'Tether USD',
      blockchain: 'ethereum',
      contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    daipolygon: {name: 'dai', blockchain: 'polygon'},
    maticpolygon: {name: 'matic', blockchain: 'polygon'},
    usdcmatic: {
      name: 'usdc',
      fullName: 'USD Coin',
      blockchain: 'polygon',
      contractAddress: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    },
    usdtpolygon: {
      name: 'usdt',
      fullName: 'Tether USD',
      blockchain: 'polygon',
      contractAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    },
    etharb: {name: 'eth', fullName: 'Ethereum', blockchain: 'arbitrum'},
    gmxarb: {
      name: 'gmx',
      blockchain: 'arbitrum',
      contractAddress: '0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a',
    },
    usdcarb: {
      name: 'usdc',
      fullName: 'USD Coin',
      blockchain: 'arbitrum',
      contractAddress: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    },
    usdtarb: {
      name: 'usdt',
      fullName: 'Tether USD',
      blockchain: 'arbitrum',
      contractAddress: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    },
    ethbase: {name: 'eth', fullName: 'Ethereum', blockchain: 'base'},
    usdcbase: {
      name: 'usdc',
      fullName: 'USD Coin',
      blockchain: 'base',
      contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    },
    ethop: {name: 'eth', fullName: 'Ethereum', blockchain: 'optimism'},
    usdcop: {
      name: 'usdc',
      fullName: 'USD Coin',
      blockchain: 'optimism',
      contractAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    },
    usdtop: {
      name: 'usdt',
      fullName: 'Tether USD',
      blockchain: 'optimism',
      contractAddress: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    },
    usdcsol: {
      name: 'usdc',
      fullName: 'USD Coin',
      blockchain: 'solana',
      contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
    usdtsol: {
      name: 'usdt',
      fullName: 'Tether USD',
      blockchain: 'solana',
      contractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    },
    wldeth: {
      name: 'wld',
      blockchain: 'ethereum',
      contractAddress: '0x163f8c2467924be0ae7b5347228cabf260318753',
    },
  };

  changellyCurrenciesData.forEach((currency: ChangellyCurrency) => {
    const key = currency.name.toLowerCase();
    const mapping = currencyMapping[key];
    if (
      mapping &&
      (!mapping.blockchain ||
        mapping.blockchain.toLowerCase() ===
          currency.blockchain?.toLowerCase()) &&
      (!mapping.contractAddress ||
        mapping.contractAddress.toLowerCase() ===
          currency.contractAddress?.toLowerCase())
    ) {
      currency.name = mapping.name;
      if (mapping.fullName) {
        currency.fullName = mapping.fullName;
      }
    }
  });

  return changellyCurrenciesData;
};

export const getChangellyFixedCurrencyAbbreviation = (
  currency: string,
  chain: string,
): string => {
  const mapping: {[key: string]: {[key: string]: string}} = {
    usdt: {
      eth: 'usdt20',
      arb: 'usdtarb',
      op: 'usdtop',
      matic: 'usdtpolygon',
      sol: 'usdtsol',
    },
    matic: {
      matic: 'maticpolygon',
    },
    eth: {
      arb: 'etharb',
      base: 'ethbase',
      op: 'ethop',
    },
    usdc: {
      matic: 'usdcmatic',
      arb: 'usdcarb',
      base: 'usdcbase',
      op: 'usdcop',
      sol: 'usdcsol',
    },
    dai: {
      matic: 'daipolygon',
    },
    gmx: {
      arb: 'gmxarb',
    },
    wld: {
      eth: 'wldeth',
    },
  };

  return mapping[currency]?.[chain] || currency;
};

export const getChainFromChangellyBlockchain = (
  currencyAbbreviation: string,
  blockchain?: ChangellyCurrencyBlockchain,
): string => {
  if (!blockchain) {
    return currencyAbbreviation.toLowerCase();
  }

  const lowerBlockchain = blockchain.toLowerCase();
  return (
    blockchainMapping[lowerBlockchain] || currencyAbbreviation.toLowerCase()
  );
};

export const isCoinSupportedByChangelly = (
  coin: string,
  chain: string,
): boolean => {
  const lowerCoin = coin.toLowerCase();

  if (!chain) {
    return [
      ...changellySupportedCoins,
      ...Object.values(supportedTokensByChain).flat(),
    ].includes(lowerCoin);
  }

  const lowerChain = chain.toLowerCase();

  if (lowerCoin === lowerChain) {
    return changellySupportedCoins.includes(lowerCoin);
  }

  const tokens = supportedTokensByChain[lowerChain];

  return tokens
    ? tokens.includes(lowerCoin)
    : changellySupportedCoins.includes(lowerCoin);
};

export const changellyGetFixRateForAmount = async (
  wallet: Wallet,
  data: ChangellyFixRateDataType,
): Promise<any> => {
  try {
    const messageData = {
      id: generateMessageId(wallet.id),
      useV2: true,
      coinFrom: data.coinFrom,
      coinTo: data.coinTo,
      amountFrom: data.amountFrom,
    };

    const response = await wallet.changellyGetFixRateForAmount(messageData);

    if (response.id && response?.id !== messageData.id) {
      return Promise.reject(
        t('The response does not match the origin of the request'),
      );
    }
    return Promise.resolve(response);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const changellyGetPairsParams = async (
  wallet: Wallet,
  data: ChangellyPairParamsDataType,
): Promise<any> => {
  try {
    const messageData = {
      id: generateMessageId(wallet.id),
      useV2: true,
      coinFrom: data.coinFrom,
      coinTo: data.coinTo,
    };

    const response = await wallet.changellyGetPairsParams(messageData);

    if (response.id && response.id !== messageData.id) {
      return Promise.reject(
        t('The response does not match the origin of the request'),
      );
    }
    return Promise.resolve(response);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const changellyCreateFixTransaction = async (
  wallet: Wallet,
  data: ChangellyFixTransactionDataType,
): Promise<any> => {
  try {
    const messageData = {
      id: generateMessageId(wallet.id),
      useV2: true,
      coinFrom: data.coinFrom,
      coinTo: data.coinTo,
      addressTo: data.addressTo,
      amountFrom: data.amountFrom,
      fixedRateId: data.fixedRateId,
      refundAddress: data.refundAddress,
    };

    const response = await wallet.changellyCreateFixTransaction(messageData);

    if (response.id && response.id !== messageData.id) {
      return Promise.reject(
        t('The response does not match the origin of the request'),
      );
    }
    return Promise.resolve(response);
  } catch (err) {
    return Promise.reject(err);
  }
};

export interface Status {
  statusTitle?: string;
  statusDescription?: string;
}

export const changellyGetStatusDetails = (status: string): Status => {
  let statusDescription, statusTitle;
  switch (status) {
    case 'new':
      statusTitle = t('New');
      statusDescription = t('Transaction is waiting for an incoming payment.');
      break;
    case 'waiting':
      statusTitle = t('Waiting');
      statusDescription = t('Transaction is waiting for an incoming payment.');
      break;
    case 'confirming':
      statusTitle = t('Confirming');
      statusDescription = t(
        'Changelly has received payin and is waiting for certain amount of confirmations depending of incoming currency.',
      );
      break;
    case 'exchanging':
      statusTitle = t('Exchanging');
      statusDescription = t('Payment was confirmed and is being exchanged.');
      break;
    case 'sending':
      statusTitle = t('Sending');
      statusDescription = t('Coins are being sent to the recipient address.');
      break;
    case 'finished':
      statusTitle = t('Finished');
      statusDescription = t(
        'Coins were successfully sent to the recipient address.',
      );
      break;
    case 'failed':
      statusTitle = t('Failed');
      statusDescription = t(
        'Transaction has failed. In most cases, the amount was less than the minimum.',
      );
      break;
    case 'refunded':
      statusTitle = t('Failed');
      statusDescription = t(
        "Exchange failed and coins were refunded to user's wallet.",
      );
      break;
    case 'hold':
      statusTitle = t('Hold');
      statusDescription = t(
        'Due to AML/KYC procedure, exchange may be delayed.',
      );
      break;
    case 'expired':
      statusTitle = t('Expired');
      statusDescription = t(
        'Payin was not sent within the indicated timeframe.',
      );
      break;
    default:
      statusTitle = undefined;
      statusDescription = undefined;
      break;
  }
  return {
    statusTitle,
    statusDescription,
  };
};

export const changellyGetStatusColor = (status: string): string => {
  switch (status) {
    case 'finished':
    case 'refunded':
      return '#01d1a2';
    case 'failed':
    case 'expired':
      return '#df5264';
    case 'waiting':
    case 'confirming':
    case 'exchanging':
    case 'sending':
    case 'hold':
      return '#fdb455';
    default:
      return '#666677';
  }
};

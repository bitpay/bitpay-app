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

export const changellySupportedOtherChains = [
  // Ohters
  'ripple',
];

export const changellySupportedCoins = [
  'btc',
  'bch',
  'eth',
  'eth_arb', // etharb in Changelly
  'eth_op', // ethop in Changelly
  'doge',
  'ltc',
  'matic', // maticpolygon in Changelly
  'xrp',
];

export const changellySupportedEthErc20Tokens = [
  '1inch',
  'aave',
  'aevo',
  'agi',
  'agix',
  'aioz',
  'alcx',
  'alice',
  'alpha',
  'alt',
  'amp',
  'ankr',
  'ape',
  'api3',
  'arkm',
  'ast',
  'audio',
  'axs',
  'bal',
  'band',
  'bat',
  'bnt',
  'blur',
  'blz',
  'bone',
  'celr',
  'chz',
  'comp',
  'combo',
  'coval',
  'crv',
  'cvc',
  'cvx',
  'dai',
  'dao',
  'dia',
  'dodo',
  'dydx',
  'elon',
  'ens',
  'ena',
  'eth',
  'ethfi',
  'eurs',
  'eurt',
  'forth',
  'ftm',
  'fun',
  'fxs',
  'gala',
  'gno',
  'glm',
  'grt',
  'hot',
  'ht',
  'id',
  'ilv',
  'imx',
  'jasmy',
  'knc',
  'ldo',
  'link',
  'lina',
  'lpt',
  'looks',
  'lqty',
  'lrc',
  'mana',
  'matic', // erc20
  'metis',
  'mkr',
  'mtl',
  'nexo',
  'nmr',
  'noia',
  'ocean',
  'ogn',
  'omg',
  'omni',
  'ondo',
  'paxg',
  'pepe',
  'pendle',
  'perp',
  'pixel',
  'pond',
  'powr',
  'pyusd',
  'qnt',
  'rad',
  'radar',
  'rari',
  'reef',
  'ren',
  'req',
  'rez',
  'rlc',
  'rndr',
  'rpl',
  'rsr',
  'sand',
  'shib',
  'sis',
  'skl',
  'slp',
  'snt',
  'snx',
  'steth',
  'stg',
  'stmx',
  'storj',
  'sushi',
  'syn',
  'tower',
  'trb',
  'tru',
  'tusd',
  'uma',
  'uni',
  'usdc',
  'usdp',
  'usdt', // usdt20 in Changelly
  'vra',
  'wbtc',
  'wnxm',
  'woo',
  'xaut',
  'yfi',
  'ygg',
  'zrx',
];

export const changellySupportedMaticErc20Tokens = [
  'gns',
  'ipmb',
  'quick',
  'usdc', // usdcmatic in Changelly
];

export const changellySupportedArbitrumTokens = [
  'aeur',
  'aidoge',
  'arb',
  'dpx',
  'magic',
  'rdnt',
  'spa',
  'usdc', // usdcarb in Changelly
  'vela',
  'vrtx',
  'xai',
];

export const changellySupportedBaseTokens = [
  'aero',
  'base',
  'brett',
  'degen',
  'usdc', // usdcbase in Changelly
];

export const changellySupportedOptimismTokens = [
  'op',
  'usdc', // usdcop in Changelly
  'wld',
];

const supportedTokensByChain: {[key: string]: string[]} = {
  eth: changellySupportedEthErc20Tokens,
  matic: changellySupportedMaticErc20Tokens,
  arb: changellySupportedArbitrumTokens,
  base: changellySupportedBaseTokens,
  op: changellySupportedOptimismTokens,
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
  chainType?: 'utxo' | 'evm' | 'other',
) => {
  switch (chainType) {
    case 'utxo':
      return changellySupportedUtxoChains;
    case 'evm':
      return changellySupportedEvmChains;
    case 'other':
      return changellySupportedOtherChains;
    default:
      return [
        ...changellySupportedUtxoChains,
        ...changellySupportedEvmChains,
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
    maticpolygon: {name: 'matic', blockchain: 'polygon'},
    usdcmatic: {
      name: 'usdc',
      fullName: 'USD Coin',
      blockchain: 'polygon',
      contractAddress: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    },
    etharb: {name: 'eth', fullName: 'Ethereum', blockchain: 'arbitrum'},
    usdcarb: {
      name: 'usdc',
      fullName: 'USD Coin',
      blockchain: 'arbitrum',
      contractAddress: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    },
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
    usdt: {eth: 'usdt20'},
    matic: {matic: 'maticpolygon'},
    eth: {
      arb: 'etharb',
      op: 'ethop',
    },
    usdc: {
      matic: 'usdcmatic',
      arb: 'usdcarb',
      base: 'usdcbase',
      op: 'usdcop',
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

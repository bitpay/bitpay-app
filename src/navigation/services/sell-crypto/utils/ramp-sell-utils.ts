import {
  RampPayoutMethodName,
  RampSellOrderStatus,
} from '../../../../store/sell-crypto/models/ramp-sell.models';
import {t} from 'i18next';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';
import cloneDeep from 'lodash.clonedeep';
import {RampAssetInfo} from '../../../../store/buy-crypto/models/ramp.models';
import {WithdrawalMethodKey} from '../constants/SellCryptoConstants';

export const rampSellEnv = __DEV__ ? 'sandbox' : 'production';

export const rampSellSupportedFiatCurrencies = ['EUR', 'GBP', 'USD'];

export const rampSellSupportedCoins = [
  // UTXO coins will be temporarily disabled, as the sale of these coins through Ramp requires the address from which the funds will be sent. This does not match the flow we have for crypto sales in our app.
  // 'bch',
  // 'btc',
  'eth',
  'eth_arb',
  'eth_base',
  'eth_op',
  // 'ltc',
  // 'doge',
  'pol', // MATIC_POL in RampSell
  'sol', // SOLANA_SOL in RampSell
];

export const rampSellSupportedErc20Tokens: string[] = [
  '1inch',
  'arkm',
  'bat',
  'dai',
  'ens',
  'link',
  'mana',
  'rly',
  'sand',
  'ton',
  'usda',
  'usdc',
  'usdt',
  'xaut',
];
export const rampSellSupportedMaticTokens: string[] = [
  'bat',
  'dai',
  'mana',
  'ovr',
  'sand',
  'usdc',
  'usdc.e', // MATIC_USDCE in RampSell
  'usdt',
  'weth', // MATIC_ETH in RampSell
];
export const rampSellSupportedArbitrumTokens: string[] = [
  'usda',
  'usdc',
  'usdc.e', // ARBITRUM_USDCE in RampSell
  'usdt',
];
export const rampSellSupportedBaseTokens: string[] = [
  'usdc',
  'usdc.e', // BASE_USDCE in RampSell
];
export const rampSellSupportedOptimismTokens: string[] = [
  'dai',
  'usda',
  'usdc',
  'usdc.e', // OPTIMISM_USDCE in RampSell
  'usdt',
  'wld',
];
export const rampSellSupportedSolanaTokens: string[] = [];

export const getRampSellSupportedCurrencies = (): string[] => {
  const rampSellSupportedCurrencies = [
    ...rampSellSupportedCoins,
    ...rampSellSupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...rampSellSupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...rampSellSupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
    ...rampSellSupportedBaseTokens.flatMap(baseToken =>
      getCurrencyAbbreviation(baseToken, 'base'),
    ),
    ...rampSellSupportedOptimismTokens.flatMap(optimismToken =>
      getCurrencyAbbreviation(optimismToken, 'op'),
    ),
    ...rampSellSupportedSolanaTokens.flatMap(solanaToken =>
      getCurrencyAbbreviation(solanaToken, 'sol'),
    ),
  ];

  return rampSellSupportedCurrencies;
};

export const rampCoinMapping = (coin: string): string => {
  let _coin = cloneDeep(coin);

  if (_coin?.toLowerCase() === 'usdc.e') {
    _coin = 'usdce';
  }
  return _coin;
};

export const getCoinFromRampCoinFormat = (coin: string): string => {
  let _coin = cloneDeep(coin).toLowerCase();

  if (_coin?.toLowerCase() === 'usdce') {
    _coin = 'usdc.e';
  }
  return _coin;
};

export const getRampCoinFormat = (
  coin: string | undefined,
  chain: string | undefined,
): string => {
  coin = coin ? rampCoinMapping(externalServicesCoinMapping(coin)) : undefined;
  const _coin = coin ? cloneDeep(coin).toUpperCase() : undefined;
  const _chain = chain ? cloneDeep(chain).toUpperCase() : undefined;

  let formattedCoin: string = `${_chain}_${_coin}`;
  return formattedCoin;
};

export const getChainFromRampChainFormat = (
  chain: string | undefined,
): string | undefined => {
  if (!chain) {
    return undefined;
  }

  const chainMap: {[key: string]: string} = {
    arbitrum: 'arb',
    base: 'base',
    optimism: 'op',
    solana: 'sol',
  };

  return chainMap[chain.toLowerCase()] ?? chain;
};

export const getRampChainFormat = (chain: string): string | undefined => {
  const _chain = chain ? cloneDeep(chain).toLowerCase() : undefined;

  let formattedChain: string | undefined;
  switch (_chain) {
    case 'arb':
      formattedChain = 'arbitrum';
      break;
    case 'base':
      formattedChain = 'base';
      break;
    case 'op':
      formattedChain = 'optimism';
      break;
    case 'sol':
      formattedChain = 'solana';
      break;
    default:
      formattedChain = _chain;
      break;
  }
  return formattedChain;
};

export const getRampSellFixedCurrencyAbbreviation = (
  currency: string,
  chain: string,
): string => {
  const currencyAbbreviationMapping: {
    [key: string]: {[key: string]: string};
  } = {
    matic: {
      matic: 'matic',
      pol: 'matic',
    },
  };

  const _currency = currency.toLowerCase();
  const chainMapping = currencyAbbreviationMapping[chain];

  if (chainMapping && chainMapping[_currency]) {
    return chainMapping[_currency];
  }

  return _currency;
};

export const getRampSellCurrenciesFixedProps = (
  rampCurrenciesData: RampAssetInfo[],
): RampAssetInfo[] => {
  const currencyMapping: {
    [key: string]: {
      code: string;
      name: string;
      chain?: string;
      contractAddress?: string;
    };
  } = {
    'matic-matic': {
      code: 'pol',
      name: 'Polygon',
      chain: 'matic',
    },
    'pol-matic': {
      code: 'pol',
      name: 'Polygon',
      chain: 'matic',
    },
    'usdc-eth': {
      code: 'usdc',
      name: 'USD Coin',
      chain: 'eth',
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
    'usdc-arbitrum': {
      code: 'usdc',
      name: 'USD Coin',
      chain: 'arbitrum',
      contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    'usdc-base': {
      code: 'usdc',
      name: 'USD Coin',
      chain: 'base',
      contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    },
    'usdc-matic': {
      code: 'usdc',
      name: 'USD Coin',
      chain: 'matic',
      contractAddress: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    },
    'usdc-optimism': {
      code: 'usdc',
      name: 'USD Coin',
      chain: 'optimism',
      contractAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    },
    'usdt-eth': {
      code: 'usdt',
      name: 'Tether USD',
      chain: 'eth',
      contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    'usdt-arbitrum': {
      code: 'usdt',
      name: 'Tether USD',
      chain: 'arbitrum',
      contractAddress: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    },
    'usdt-matic': {
      code: 'usdt',
      name: 'Tether USD',
      chain: 'matic',
      contractAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    },
    'usdt-optimism': {
      code: 'usdt',
      name: 'Tether USD',
      chain: 'optimism',
      contractAddress: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    },
  };

  rampCurrenciesData.forEach((currency: RampAssetInfo) => {
    const key = `${currency.symbol?.toLowerCase()}-${currency.chain?.toLowerCase()}`;
    const mapping = currencyMapping[key];

    if (
      mapping &&
      mapping.chain?.toLowerCase() === currency.chain?.toLowerCase() &&
      (!mapping.contractAddress ||
        (currency.address &&
          mapping.contractAddress === currency.address.toLowerCase()))
    ) {
      currency.symbol = mapping.code;
      currency.name = mapping.name;
    }
  });

  return rampCurrenciesData;
};

export const getRampSellCoinFormat = (
  coin: string | undefined,
  chain: string | undefined,
): string => {
  coin = coin ? rampCoinMapping(externalServicesCoinMapping(coin)) : undefined;
  const _coin = coin ? cloneDeep(coin).toUpperCase() : undefined;
  const rampChainFormat = chain ? getRampChainFormat(chain) : undefined;
  const _chain = rampChainFormat
    ? cloneDeep(rampChainFormat).toUpperCase()
    : undefined;

  if (_coin === 'WETH' && _chain === 'MATIC') {
    return 'MATIC_ETH';
  }

  let formattedCoin: string = `${_chain}_${_coin}`;
  return formattedCoin;
};

export const getRampSellPayoutMethodFormat = (
  method: WithdrawalMethodKey,
): RampPayoutMethodName | undefined => {
  if (!method) {
    return undefined;
  }
  let formattedPaymentMethod: RampPayoutMethodName | undefined;
  switch (method) {
    case 'ach':
      formattedPaymentMethod = RampPayoutMethodName.AMERICAN_BANK_TRANSFER;
      break;
    case 'creditCard':
    case 'debitCard':
      formattedPaymentMethod = RampPayoutMethodName.CARD;
      break;
    case 'sepaBankTransfer':
      formattedPaymentMethod = RampPayoutMethodName.SEPA;
      break;
    default:
      formattedPaymentMethod = undefined;
      break;
  }
  return formattedPaymentMethod;
};

export const getPayoutMethodKeyFromRampType = (
  method: RampPayoutMethodName | undefined,
): WithdrawalMethodKey | undefined => {
  if (!method) {
    return undefined;
  }
  let formattedPaymentMethod: WithdrawalMethodKey | undefined;
  switch (method) {
    case RampPayoutMethodName.AMERICAN_BANK_TRANSFER:
      formattedPaymentMethod = 'ach';
      break;
    case RampPayoutMethodName.CARD:
      formattedPaymentMethod = 'debitCard';
      break;
    case RampPayoutMethodName.SEPA:
      formattedPaymentMethod = 'sepaBankTransfer';
      break;
    default:
      formattedPaymentMethod = undefined;
      break;
  }
  return formattedPaymentMethod;
};

export const getSellStatusFromRampStatus = (
  rampStatus: string,
): RampSellOrderStatus => {
  const status = cloneDeep(rampStatus)?.toLowerCase() || '';

  return status as RampSellOrderStatus;
};

export interface RampSellStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const rampSellGetStatusDetails = (
  status: RampSellOrderStatus,
): RampSellStatus => {
  let statusDescription, statusTitle;
  switch (status) {
    case 'createdOrder':
    case 'created':
      statusTitle = t('Sell Order started');
      statusDescription = t(
        'Sell order started. You must complete the selling process with our partner Ramp Network.',
      );
      break;
    case 'bitpayFromCheckout':
      statusTitle = t('Sell Order started');
      statusDescription =
        t(
          'Sell order started. You must complete the selling process with our partner Ramp Network.',
        ) +
        '\n' +
        t(
          'If you have successfully completed the entire crypto selling process, remember that receiving payment may take a few days.',
        );
      break;
    case 'bitpayTxSent':
      statusTitle = t('Crypto payment sent');
      statusDescription =
        t('Payment sent, waiting for Ramp to receive and process it.') +
        '\n' +
        t(
          'If you have successfully completed the entire crypto selling process, remember that receiving payment may take a few days.',
        );
      break;
    case 'released':
      statusTitle = t('Finished');
      statusDescription = t(
        "Fiat amount were successfully sent to the user's payout method. Remember that depending on your Payout method, it may take a few days to be reflected.",
      );
      break;
    case 'expired':
      statusTitle = t('Expired');
      statusDescription = t(
        'Order has expired. The time for sending crypto funds for the sale has been exceeded.',
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

export const rampSellGetStatusColor = (status: RampSellOrderStatus): string => {
  switch (status) {
    case 'released':
      return '#01d1a2';
    case 'expired':
      return '#df5264';
    case 'bitpayFromCheckout':
    case 'bitpayTxSent':
      return '#fdb455';
    default:
      return '#9b9bab';
  }
};

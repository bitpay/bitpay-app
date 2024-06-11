import {t} from 'i18next';
import cloneDeep from 'lodash.clonedeep';
import {
  RampQuoteRequestData,
  RampQuoteResultForPaymentMethod,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';

export const rampEnv = __DEV__ ? 'sandbox' : 'production';

export const getRampCheckoutUri = (): string => {
  return __DEV__
    ? 'https://ri-widget-staging.firebaseapp.com'
    : 'https://buy.ramp.network';
};

export const rampSupportedFiatCurrencies = [
  'BMD',
  'BAM',
  'BWP',
  'BRL',
  'BGN',
  'CHF',
  'COP',
  'CRC',
  'CZK',
  'DKK',
  'DOP',
  'EUR',
  'GBP',
  'GEL',
  'GTQ',
  'HNL',
  'HUF',
  'ISK',
  'INR',
  'ILS',
  'KZT',
  'KES',
  'KWD',
  'LAK',
  'LKR',
  'MKD',
  'MYR',
  'MXN',
  'MDL',
  'MZN',
  'NZD',
  'NGN',
  'PYG',
  'PEN',
  'PLN',
  'RON',
  'RSD',
  'SEK',
  'SGD',
  'THB',
  'TJS',
  'USD',
  'UYU',
  'ZAR',
];

export const rampSupportedCoins = [
  'btc',
  'bch',
  'eth',
  'eth_arb',
  'eth_base',
  'eth_op',
  'doge',
  'ltc',
  'matic',
  'xrp',
];

export const rampSupportedErc20Tokens = [
  'bat',
  'dai',
  'ens',
  'fevr',
  'link',
  'mana',
  'rly',
  'sand',
  'ton',
  'usda',
  'usdc',
  'usdt',
];

export const rampSupportedMaticTokens = [
  'bat',
  'dai',
  'eth',
  'mana',
  'ovr',
  'sand',
  'usdc',
  'usdce', // Bridged USD Coin (0x2791bca1f2de4661ed88a30c99a7a9449aa84174) USDC.e
  'usdt',
  'wmatic',
];

export const rampSupportedArbitrumTokens = [
  'usda',
  'usdc',
  'usdce', // Bridged USD Coin (0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8) USDC.e
  'usdt',
];

export const rampSupportedBaseTokens = [
  'usdc',
  'usdce', // Bridged USD Coin (0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA) USDC.e
];

export const rampSupportedOptimismTokens = [
  'dai',
  'usda',
  'usdc',
  'usdce', // Bridged USD Coin (0x7F5c764cBc14f9669B88837ca1490cCa17c31607) USDC.e
  'usdt',
  'wld',
];

export const getRampSupportedCurrencies = (): string[] => {
  const rampSupportedCurrencies = [
    ...rampSupportedCoins,
    ...rampSupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...rampSupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...rampSupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
    ...rampSupportedBaseTokens.flatMap(baseToken =>
      getCurrencyAbbreviation(baseToken, 'base'),
    ),
    ...rampSupportedOptimismTokens.flatMap(optimismToken =>
      getCurrencyAbbreviation(optimismToken, 'op'),
    ),
  ];

  return rampSupportedCurrencies;
};

export const getRampCoinFormat = (
  coin: string | undefined,
  chain: string | undefined,
): string => {
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
    case 'op':
      formattedChain = 'optimism';
      break;
    default:
      formattedChain = _chain;
      break;
  }
  return formattedChain;
};

export const getRampFiatAmountLimits = () => {
  return {
    min: 20,
    max: 5500,
  };
};

export const getRampDefaultOfferData = (
  data: RampQuoteRequestData,
): RampQuoteResultForPaymentMethod => {
  return data.CARD_PAYMENT;
};

export interface RampStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const rampGetStatusDetails = (status: string): RampStatus => {
  let statusDescription, statusTitle;
  switch (status) {
    case 'paymentRequestSent':
      statusTitle = t('Attempted payment request');
      statusDescription = t(
        'Payment request made. You must complete the purchase process with our partner Ramp.',
      );
      break;
    case 'pending':
      statusTitle = t('Payment request made');
      statusDescription = t(
        'Payment request made. If you have successfully completed the entire payment process, remember that receiving crypto may take a few hours.',
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

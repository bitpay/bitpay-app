import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';

export const wyreEnv = __DEV__ ? 'sandbox' : 'production';
export const wyreSupportedFiatCurrencies = ['AUD', 'CAD', 'EUR', 'GBP', 'USD'];

export const wyreSupportedCoins = ['btc', 'eth', 'matic'];

export const wyreSupportedErc20Tokens = [
  'aave',
  'bat',
  'busd',
  'comp',
  'crv',
  'dai',
  'gusd',
  'gyen',
  'link',
  'mkr',
  'pax', // backward compatibility
  'rai',
  'snx',
  'uma',
  'uni',
  'usdc',
  'usdp',
  'usds',
  'usdt',
  'wbtc',
  'weth',
  'yfi',
  'zusd',
];

export const wyreSupportedMaticTokens = [
  'usdc', // mUSDC
];

export const getWyreSupportedCurrencies = (): string[] => {
  const wyreSupportedCurrencies = wyreSupportedCoins
    .concat(
      wyreSupportedErc20Tokens.map(ethToken => {
        return getCurrencyAbbreviation(ethToken, 'eth');
      }),
    )
    .concat(
      wyreSupportedMaticTokens.map(maticToken => {
        return getCurrencyAbbreviation(maticToken, 'matic');
      }),
    );
  return wyreSupportedCurrencies;
};

export const getWyreCoinFormat = (coin: string, chain: string): string => {
  let formattedCoin: string = coin.toUpperCase();
  switch (chain) {
    case 'matic':
      if (coin.toLowerCase() === 'usdc') {
        formattedCoin = 'mUSDC';
      }
      break;
    default:
      formattedCoin = coin.toUpperCase();
  }
  return formattedCoin;
};

export const getWyreFiatAmountLimits = (country?: string) => {
  if (!country || country !== 'US') {
    return {
      min: 50,
      max: 1000,
    };
  } else {
    return {
      min: 50,
      max: 2500,
    };
  }
};

export const handleWyreStatus = (status: string): string => {
  switch (status) {
    case 'RUNNING_CHECKS':
      return 'paymentRequestSent';
    case 'PROCESSING':
      return 'paymentRequestSent';
    case 'FAILED':
      return 'failed';
    case 'COMPLETE':
      return 'success';
    default:
      return 'paymentRequestSent';
  }
};

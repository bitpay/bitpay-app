export const wyreEnv = __DEV__ ? 'sandbox' : 'production';
export const wyreSupportedFiatCurrencies = ['AUD', 'CAD', 'EUR', 'GBP', 'USD'];
export const wyreSupportedCoins = [
  'btc',
  'eth',
  'usdc',
  'gusd',
  'usdp',
  'pax', // backward compatibility
  'busd',
  'dai',
  'wbtc',
];

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

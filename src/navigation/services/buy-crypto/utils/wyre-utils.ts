export const wyreSupportedFiatCurrencies = ['AUD', 'CAD', 'EUR', 'GBP', 'USD'];
export const wyreSupportedCoins = [
  'btc',
  'eth',
  'usdc',
  'gusd',
  'pax',
  'busd',
  'dai',
  'wbtc',
];

export const wyreFiatAmountLimits = {
  min: 50,
  max: 2500,
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

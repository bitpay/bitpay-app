import {t} from 'i18next';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';

export const moonpayEnv = __DEV__ ? 'sandbox' : 'production';

export const moonpaySupportedFiatCurrencies = [
  'AUD',
  'BGN',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'COP',
  'CZK',
  'DKK',
  'DOP',
  'EGP',
  'EUR',
  'GBP',
  'HKD',
  'HRK',
  'IDR',
  'ILS',
  'JOD',
  'JPY',
  'KES',
  'KRW',
  'KWD',
  'LKR',
  'MAD',
  'MXN',
  'MYR',
  'NGN',
  'NOK',
  'NZD',
  'OMR',
  'PEN',
  'PKR',
  'PLN',
  'RON',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'TWD',
  'USD',
  'VND',
  'ZAR',
];

export const moonpaySupportedCoins = ['bch', 'btc', 'eth', 'ltc', 'xrp'];

export const moonpaySupportedErc20Tokens = [
  'bat',
  'chz',
  'dai',
  'mana',
  'tusd',
  'usdc',
  'usdt',
  'zrx',
];

export const moonpaySupportedMaticTokens = [];

export const getMoonpaySupportedCurrencies = (): string[] => {
  const moonpaySupportedCurrencies = moonpaySupportedCoins
    .concat(
      moonpaySupportedErc20Tokens.map(ethToken => {
        return getCurrencyAbbreviation(ethToken, 'eth');
      }),
    )
    .concat(
      moonpaySupportedMaticTokens.map(maticToken => {
        return getCurrencyAbbreviation(maticToken, 'matic');
      }),
    );
  return moonpaySupportedCurrencies;
};

export const getMoonpayFiatAmountLimits = () => {
  return {
    min: 30,
    max: 12000,
  };
};

export interface MoonpayStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const moonpayGetStatusDetails = (status: string): MoonpayStatus => {
  let statusDescription, statusTitle;
  switch (status) {
    case 'paymentRequestSent':
      statusTitle = t('Attempted payment request');
      statusDescription = t(
        'Payment request made. You must complete the purchase process with our partner Moonpay.',
      );
      break;
    case 'waitingPayment':
      statusTitle = t('Waiting Payment');
      statusDescription = t('Transaction is waiting for an incoming payment.');
      break;
    case 'pending':
      statusTitle = t('Pending');
      statusDescription = t(
        'Moonpay is purchasing your crypto. This takes between a few minutes and a few hours. Thanks for your patience.',
      );
      break;
    case 'waitingAuthorization':
      statusTitle = t('Waiting Authorization');
      statusDescription = t(
        'The order has been received and authorization is pending.',
      );
      break;
    case 'completed':
      statusTitle = t('Finished');
      statusDescription = t(
        'Coins were successfully sent to the recipient address.',
      );
      break;
    case 'failed':
      statusTitle = t('Failed');
      statusDescription = t(
        "Transaction has failed. In most cases, it's because you haven't properly verified your identity or payment method or you've reached your maximum daily/weekly purchase limit.",
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

export const moonpayGetStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return '#01d1a2';
    case 'failed':
      return '#df5264';
    case 'waitingPayment':
    case 'pending':
    case 'waitingAuthorization':
      return '#fdb455';
    default:
      return '#9b9bab';
  }
};

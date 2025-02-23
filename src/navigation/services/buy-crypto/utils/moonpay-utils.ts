import {t} from 'i18next';
import cloneDeep from 'lodash.clonedeep';
import {MoonpayPaymentType} from '../../../../store/buy-crypto/buy-crypto.models';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';
import {PaymentMethodKey} from '../constants/BuyCryptoConstants';

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

export const moonpaySupportedCoins = [
  'btc',
  'bch',
  'eth',
  'eth_arb', // eth_arbitrum in Moonpay
  'eth_base', // eth_base in Moonpay
  'eth_op', // eth_optimism in Moonpay
  'ltc',
  'doge',
  'matic', // pol_polygon in Moonpay // backward compatibility
  'pol', // pol_polygon in Moonpay
];

export const nonUSMoonpaySupportedCoins = ['xrp'];

export const moonpaySupportedErc20Tokens = [
  'bat',
  'dai',
  'gods',
  'imx',
  'link',
  'mana',
  'matic', // backward compatibility
  'pixel',
  'pol',
  'pyusd',
  'steth',
  'shib',
  'uni',
  'usdc',
  'usdt',
  'venom',
  'zrx',
];

export const nonUSMoonpaySupportedErc20Tokens = [
  'aave',
  'ape',
  'axs',
  'chz',
  'comp',
  'floki',
  'key',
  'looks',
  'mana',
  'mkr',
  'okb',
  'om',
  'omg',
  'pepe',
  'portal',
  'sand',
  'slp',
  'snx',
  'stmx',
  'tusd',
  'uni',
  'utk',
  'verse',
  'wbtc',
  'weth',
  'wld',
];

export const moonpaySupportedMaticTokens = [
  'sand', // sand_polygon in Moonpay
  'usdc', // usdc_polygon in Moonpay
  'usdt', // usdt_polygon in Moonpay
  'voxel', // voxel_polygon in Moonpay
  'weth', // eth_polygon in Moonpay
];

export const moonpaySupportedArbitrumTokens = [
  'magic', // magic_arbitrum in Moonpay
  'usdc', // usdc_arbitrum in Moonpay
];

export const moonpaySupportedBaseTokens = [
  'usdc', // usdc_base in Moonpay
];

export const moonpaySupportedOptimismTokens = [
  'usdc', // usdc_optimism in Moonpay
  'wld', // wld_optimism in Moonpay
];

export const getMoonpaySupportedCurrencies = (country?: string): string[] => {
  let moonpaySupportedCurrencies = [
    ...moonpaySupportedCoins,
    ...moonpaySupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...moonpaySupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...moonpaySupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
    ...moonpaySupportedBaseTokens.flatMap(baseToken =>
      getCurrencyAbbreviation(baseToken, 'base'),
    ),
    ...moonpaySupportedOptimismTokens.flatMap(optimismToken =>
      getCurrencyAbbreviation(optimismToken, 'op'),
    ),
  ];

  if (country !== 'US') {
    moonpaySupportedCurrencies = moonpaySupportedCurrencies.concat(
      nonUSMoonpaySupportedCoins,
    );
    moonpaySupportedCurrencies = moonpaySupportedCurrencies.concat(
      nonUSMoonpaySupportedErc20Tokens.map(ethToken => {
        return getCurrencyAbbreviation(ethToken, 'eth');
      }),
    );
  }

  return moonpaySupportedCurrencies;
};

export const getMoonpayFixedCurrencyAbbreviation = (
  currency: string,
  chain: string,
): string => {
  let coin = cloneDeep(currency).toLowerCase();
  coin = externalServicesCoinMapping(coin);

  switch (chain) {
    case 'matic':
      return coin + '_polygon';
    case 'arb':
      return coin + '_arbitrum';
    case 'base':
      return coin + '_base';
    case 'op':
      return coin + '_optimism';
    default:
      return coin;
  }
};

export const getMoonpayPaymentMethodFormat = (
  method: PaymentMethodKey,
): MoonpayPaymentType | undefined => {
  let moonpayPaymentMethod: MoonpayPaymentType | undefined;
  if (method) {
    switch (method) {
      case 'debitCard':
      case 'creditCard':
        moonpayPaymentMethod = 'credit_debit_card';
        break;
      case 'sepaBankTransfer':
        moonpayPaymentMethod = 'sepa_bank_transfer';
        break;
      case 'applePay':
        moonpayPaymentMethod = 'mobile_wallet';
        break;
      case 'paypal':
        moonpayPaymentMethod = 'paypal';
        break;
      case 'venmo':
        moonpayPaymentMethod = 'venmo';
        break;
      default:
        moonpayPaymentMethod = undefined;
        break;
    }
  }
  return moonpayPaymentMethod;
};

export const getMoonpayFiatAmountLimits = () => {
  return {
    min: 30,
    max: 30000,
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

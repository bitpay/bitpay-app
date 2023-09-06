import {t} from 'i18next';
import {
  TransakFiatCurrency,
  TransakPaymentOption,
  TransakPaymentType,
  TransakStatusKey,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {PaymentMethod, PaymentMethodKey} from '../constants/BuyCryptoConstants';

export const transakEnv = __DEV__ ? 'sandbox' : 'production';

export const transakSupportedFiatCurrencies = [
  'AOA',
  'ARS',
  'AUD',
  'BBD',
  'BGN',
  'BMD',
  'BND',
  'BRL',
  'BZD',
  'CAD',
  'CHF',
  'CLP',
  'CRC',
  'CZK',
  'DJF',
  'DKK',
  'DOP',
  'EGP',
  'EUR',
  'FKP',
  'FJD',
  'GBP',
  'GEL',
  'GIP',
  'GTQ',
  'HKD',
  'HNL',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'ISK',
  'JPY',
  'KES',
  'KGS',
  'KHR',
  'KMF',
  'KRW',
  'KZT',
  'LAK',
  'LBP',
  'LKR',
  'MAD',
  'MDL',
  'MGA',
  'MKD',
  'MNT',
  'MOP',
  'MUR',
  'MWK',
  'MXN',
  'MYR',
  'MZN',
  'NAD',
  'NGN',
  'NOK',
  'NPR',
  'NZD',
  'OMR',
  'PEN',
  'PGK',
  'PHP',
  'PKR',
  'PLN',
  'PYG',
  'QAR',
  'RON',
  'RSD',
  'RWF',
  'SAR',
  'SCR',
  'SEK',
  'SGD',
  'SHP',
  'SLL',
  'SOS',
  'SRD',
  'STN',
  'SVC',
  'SZL',
  'THB',
  'TRY',
  'TTD',
  'TWD',
  'TZS',
  'UAH',
  'UGX',
  'USD',
  'UYU',
  'UZS',
  'VES',
  'VND',
  'VUV',
  'WST',
  'XAF',
  'XCD',
  'XOF',
  'XPF',
  'YER',
  'ZAR',
  'ZMW',
];

export const transakSupportedCoins = [
  'btc',
  'bch',
  'eth',
  'matic',
  'ltc',
  'xrp',
];

export const transakSupportedErc20Tokens = [
  '1inch',
  'ads',
  'ageur',
  'amkt',
  'ape',
  'audio',
  'bat',
  'bolt',
  'clv',
  'comp',
  'dai',
  'dao',
  'dpi',
  'enj',
  'ern',
  'eurt',
  'glm',
  'gtc',
  'hex',
  'ibz',
  'looks',
  'mana',
  'mask',
  'mim',
  'minds',
  'mkr',
  'mnet',
  'pla',
  'plot',
  'quartz',
  'sand',
  'spi',
  'steth',
  'stxem',
  'sushi',
  'swap',
  'swapp',
  'tama',
  'tsx',
  'uni',
  'usdc',
  'usdt',
  'verse',
  'versecopy',
  'vra',
  'wbtc',
  'xdefi',
  'yld',
];

export const transakSupportedMaticTokens = [
  'aave',
  'adai',
  'ageur',
  'bat',
  'chain',
  'dai',
  'dfyn',
  'fear',
  'food',
  'fusdc',
  'gmee',
  'ibz',
  'igg',
  'klima',
  'mana',
  'msu',
  'must',
  'pla',
  'qi',
  'quick',
  'sfusdc',
  'stxusdt',
  'sfdai',
  'tower',
  'tsx',
  'usdc',
  'usdt',
  'weth',
];

export const getTransakSupportedCurrencies = (): string[] => {
  const transakSupportedCurrencies = transakSupportedCoins
    .concat(
      transakSupportedErc20Tokens.map(ethToken => {
        return getCurrencyAbbreviation(ethToken, 'eth');
      }),
    )
    .concat(
      transakSupportedMaticTokens.map(maticToken => {
        return getCurrencyAbbreviation(maticToken, 'matic');
      }),
    );
  return transakSupportedCurrencies;
};

export const getTransakSelectedPaymentMethodData = (
  transakFiatCurrencies: TransakFiatCurrency[],
  selectedFiatCurrency: string,
  selectedPaymentMethod: PaymentMethod,
): TransakPaymentOption | undefined => {
  const transakSelectedFiatCurrency = transakFiatCurrencies.find(
    transakFiatCurrency => {
      return (
        transakFiatCurrency.symbol.toUpperCase() ===
        selectedFiatCurrency.toUpperCase()
      );
    },
  );

  if (!transakSelectedFiatCurrency) {
    return undefined;
  }

  let transakSelectedPaymentMethodData: TransakPaymentOption | undefined;

  switch (selectedPaymentMethod.method) {
    // "ach" | "applePay" | "creditCard" | "debitCard" | "sepaBankTransfer" | "other"
    case 'applePay':
      transakSelectedPaymentMethodData =
        transakSelectedFiatCurrency.paymentOptions.find(
          (transakPaymentOption: TransakPaymentOption) => {
            if (['apple_pay'].includes(transakPaymentOption.id)) {
              return true;
            }
          },
        );
      break;
    case 'creditCard':
    case 'debitCard':
      transakSelectedPaymentMethodData =
        transakSelectedFiatCurrency.paymentOptions.find(
          (transakPaymentOption: TransakPaymentOption) => {
            if (['credit_debit_card'].includes(transakPaymentOption.id)) {
              return true;
            }
          },
        );
      break;
    case 'sepaBankTransfer':
      transakSelectedPaymentMethodData =
        transakSelectedFiatCurrency.paymentOptions.find(
          (transakPaymentOption: TransakPaymentOption) => {
            if (['sepa_bank_transfer'].includes(transakPaymentOption.id)) {
              return true;
            }
          },
        );
      break;
    case 'other':
      transakSelectedPaymentMethodData =
        transakSelectedFiatCurrency.paymentOptions[0];
      break;
    default:
      transakSelectedPaymentMethodData = undefined;
      break;
  }

  return transakSelectedPaymentMethodData;
};

export const getTransakCoinFormat = (coin: string): string => {
  let formattedCoin: string = `${coin.toUpperCase()}`;
  return formattedCoin;
};

export const getTransakChainFormat = (chain: string): string | undefined => {
  if (!chain) {
    return undefined;
  }
  let formattedChain: string | undefined;
  switch (chain.toLowerCase()) {
    case 'btc':
      formattedChain = 'mainnet';
      break;
    case 'bch':
      formattedChain = 'mainnet';
      break;
    case 'eth':
      formattedChain = 'ethereum';
      break;
    case 'ltc':
      formattedChain = 'mainnet';
      break;
    case 'matic':
      formattedChain = 'polygon';
      break;
    case 'xrp':
      formattedChain = 'mainnet';
      break;
    default:
      formattedChain = undefined;
      break;
  }
  return formattedChain;
};

export const getTransakPaymentMethodFormat = (
  method: PaymentMethodKey,
): TransakPaymentType | undefined => {
  if (!method) {
    return undefined;
  }
  let formattedPaymentMethod: TransakPaymentType | undefined;
  switch (method) {
    // "ach" | "applePay" | "creditCard" | "debitCard" | "sepaBankTransfer" | "other"
    case 'applePay':
      formattedPaymentMethod = 'apple_pay';
      break;
    case 'creditCard':
    case 'debitCard':
      formattedPaymentMethod = 'credit_debit_card';
      break;
    case 'sepaBankTransfer':
      formattedPaymentMethod = 'sepa_bank_transfer';
      break;
    default:
      formattedPaymentMethod = undefined;
      break;
  }
  return formattedPaymentMethod;
};

export const getTransakFiatAmountLimits = () => {
  return {
    min: 30,
    max: 3000,
  };
};

export interface TransakStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const transakGetStatusDetails = (
  status: TransakStatusKey,
): TransakStatus => {
  let statusDescription, statusTitle;

  switch (status) {
    case 'paymentRequestSent':
      statusTitle = t('Attempted payment request');
      statusDescription = t(
        'Payment request made. You must complete the purchase process with our partner Transak.',
      );
      break;
    case 'pending':
      statusTitle = t('Payment request made');
      statusDescription = t(
        'Payment request made. If you have successfully completed the entire payment process, remember that receiving crypto may take a few hours.',
      );
      break;
    case 'AWAITING_PAYMENT_FROM_USER':
      statusTitle = t('Payment request made');
      statusDescription = t(
        'Payment request made. You must complete the purchase process with our partner Transak.',
      );
      break;
    case 'PAYMENT_DONE_MARKED_BY_USER':
      statusTitle = t('Payment request made');
      statusDescription = t(
        'There is an open or ongoing order. If you have successfully completed the entire payment process, remember that receiving crypto may take a few hours.',
      );
      break;
    case 'PROCESSING':
      statusTitle = t('Processing payment');
      statusDescription = t(
        'The payment has been completed. Remember that receiving crypto may take a few hours.',
      );
      break;
    case 'PENDING_DELIVERY_FROM_TRANSAK':
      statusTitle = t('Pending delivery');
      statusDescription = t(
        'Payment received and being exchanged and tranferred via liquidity providers. Remember that receiving crypto may take a few hours.',
      );
      break;
    case 'ON_HOLD_PENDING_DELIVERY_FROM_TRANSAK':
      statusTitle = t('Pending delivery');
      statusDescription = t(
        'The order is on hold. Remember that receiving crypto may take a few hours.',
      );
      break;
    case 'COMPLETED':
      statusTitle = t('Payment completed');
      statusDescription = t(
        "The payment is complete and the crypto has been delivered to the user's wallet.",
      );
      break;
    case 'CANCELLED':
      statusTitle = t('Payment cancelled');
      statusDescription = t('The order was cancelled.');
      break;
    case 'FAILED':
      statusTitle = t('Order failed');
      statusDescription = t(
        'The transacation was declined, due to payment method issues.',
      );
      break;
    case 'REFUNDED':
      statusTitle = t('Payment refunded');
      statusDescription = t('The payment was refunded to the user.');
      break;
    case 'EXPIRED':
      statusTitle = t('Payment expired');
      statusDescription = t('Order expired before execution.');
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

import {
  MoonpayCurrency,
  MoonpayPayoutMethodType,
  MoonpaySellOrderStatus,
} from '../../../../store/sell-crypto/sell-crypto.models';
import {t} from 'i18next';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {PaymentMethodKey} from '../constants/SellCryptoConstants';
import cloneDeep from 'lodash.clonedeep';

export const moonpaySellEnv = __DEV__ ? 'sandbox' : 'production';

export const moonpaySellSupportedFiatCurrencies = [
  'AUD',
  'BGN',
  'BRL',
  'CHF',
  'CZK',
  'DKK',
  'DOP',
  'EGP',
  'EUR',
  'GBP',
  'IDR',
  'ILS',
  'KES',
  'KWD',
  'MXN',
  'NOK',
  'NZD',
  'OMR',
  'PEN',
  'PLN',
  'RON',
  'SEK',
  'THB',
  'TRY',
  'USD',
  'ZAR',
];

export const moonpaySellSupportedCoins = ['btc', 'bch', 'eth', 'ltc'];

export const nonUSMoonpaySellSupportedCoins = [];

export const moonpaySellSupportedErc20Tokens = ['axs', 'usdc', 'usdt'];

export const nonUSMoonpaySellSupportedErc20Tokens = [];

export const moonpaySellSupportedMaticTokens = [
  'eth', // eth_polygon in MoonpaySell
  'usdc', // usdc_polygon in MoonpaySell
];

export const getMoonpaySellSupportedCurrencies = (
  country?: string,
): string[] => {
  let moonpaySellSupportedCurrencies = moonpaySellSupportedCoins
    .concat(
      moonpaySellSupportedErc20Tokens.map(ethToken => {
        return getCurrencyAbbreviation(ethToken, 'eth');
      }),
    )
    .concat(
      moonpaySellSupportedMaticTokens.map(maticToken => {
        return getCurrencyAbbreviation(maticToken, 'matic');
      }),
    );

  if (country !== 'US') {
    moonpaySellSupportedCurrencies = moonpaySellSupportedCurrencies.concat(
      nonUSMoonpaySellSupportedCoins,
    );
    moonpaySellSupportedCurrencies = moonpaySellSupportedCurrencies.concat(
      nonUSMoonpaySellSupportedErc20Tokens.map(ethToken => {
        return getCurrencyAbbreviation(ethToken, 'eth');
      }),
    );
  }

  return moonpaySellSupportedCurrencies;
};

export const getMoonpaySellFixedCurrencyAbbreviation = (
  currency: string,
  chain: string,
): string => {
  const _currency = cloneDeep(currency).toLowerCase();
  if (chain === 'matic') {
    switch (_currency) {
      case 'matic':
        return 'matic_polygon';
      case 'eth':
        return 'eth_polygon';
      case 'usdc':
        return 'usdc_polygon';
      default:
        return _currency;
    }
  } else {
    return _currency;
  }
};

export const getChainFromMoonpayNetworkCode = (
  currencyAbbreviation: string,
  networkCode?: string | null,
): string => {
  switch (networkCode?.toLowerCase()) {
    case 'ethereum':
      return 'eth';
    case 'polygon':
      return 'matic';
    default:
      return currencyAbbreviation.toLowerCase();
  }
};

export const getMoonpaySellCurrenciesFixedProps = (
  moonpayCurrenciesData: MoonpayCurrency[],
): MoonpayCurrency[] => {
  moonpayCurrenciesData.forEach((currency: MoonpayCurrency) => {
    if (
      currency.code.toLowerCase() === 'eth_polygon' &&
      currency.metadata?.networkCode?.toLowerCase() === 'polygon' &&
      currency.metadata?.contractAddress ===
        '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'
    ) {
      currency.code = 'eth';
    } else if (
      currency.code.toLowerCase() === 'usdc_polygon' &&
      currency.metadata?.networkCode?.toLowerCase() === 'polygon' &&
      currency.metadata?.contractAddress ===
        '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359'
    ) {
      currency.code = 'usdc';
    }
  });
  return moonpayCurrenciesData;
};

export const getMoonpaySellPayoutMethodFormat = (
  method: PaymentMethodKey,
): MoonpayPayoutMethodType | undefined => {
  if (!method) {
    return undefined;
  }
  let formattedPaymentMethod: MoonpayPayoutMethodType | undefined;
  switch (method) {
    case 'ach':
      formattedPaymentMethod = 'ach_bank_transfer';
      break;
    case 'creditCard':
    case 'debitCard':
      formattedPaymentMethod = 'credit_debit_card';
      break;
    case 'sepaBankTransfer':
      formattedPaymentMethod = 'sepa_bank_transfer';
      break;
    case 'gbpBankTransfer':
      formattedPaymentMethod = 'gbp_bank_transfer';
      break;
    default:
      formattedPaymentMethod = undefined;
      break;
  }
  return formattedPaymentMethod;
};

export const getMoonpayFiatListByPayoutMethod = (
  method: PaymentMethodKey,
): string[] | undefined => {
  if (!method) {
    return undefined;
  }
  let fiatList: string[] | undefined;
  switch (method) {
    case 'ach':
      fiatList = ['USD'];
      break;
    case 'creditCard':
    case 'debitCard':
      const debitCardSupportedFiat = cloneDeep(
        moonpaySellSupportedFiatCurrencies,
      );
      ['EUR', 'GBP'].forEach(fiat => {
        let indice = debitCardSupportedFiat.indexOf(fiat);
        if (indice !== -1) {
          debitCardSupportedFiat.splice(indice, 1);
        }
      });
      fiatList = ['EUR'].concat(debitCardSupportedFiat);
      break;
    case 'sepaBankTransfer':
      fiatList = ['EUR'];
      break;
    case 'gbpBankTransfer':
      fiatList = ['GBP'];
      break;
    default:
      fiatList = ['EUR'];
      break;
  }
  return fiatList;
};

export interface MoonpaySellStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const moonpaySellGetStatusDetails = (
  status: MoonpaySellOrderStatus,
): MoonpaySellStatus => {
  let statusDescription, statusTitle;
  switch (status) {
    case 'createdOrder':
      statusTitle = t('Sell Order started');
      statusDescription = t(
        'Sell order started. You must complete the selling process with our partner Moonpay.',
      );
      break;
    case 'bitpayPending':
      statusTitle = t('Exchange waiting for crypto');
      statusDescription = t(
        'Moonpay is waiting for payment in crypto from your BitPay wallet.',
      );
      break;
    case 'bitpayTxSent':
      statusTitle = t('Crypto payment sent');
      statusDescription = t('Payment sent, waiting for Moonpay to receive it.');
      break;
    case 'waitingForDeposit':
      statusTitle = t('Waiting For Desposit');
      statusDescription = t(
        'Moonpay is waiting for an incoming crypto payment.',
      );
      break;
    case 'pending':
      statusTitle = t('Pending');
      statusDescription = t(
        'Moonpay received your payment and is processing the order. This may take a few minutes. Thanks for your patience.',
      );
      break;
    case 'completed':
      statusTitle = t('Finished');
      statusDescription = t(
        "Fiat amount were successfully sent to the user's payout method. Remember that depending on your Payout method, it may take a few days to be reflected.",
      );
      break;
    case 'failed':
      statusTitle = t('Failed');
      statusDescription = t(
        "Order has failed. In most cases, it's because you haven't properly verified your identity or payout method or you've reached your maximum daily/weekly sales limit.",
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

export const moonpaySellGetStatusColor = (
  status: MoonpaySellOrderStatus,
): string => {
  switch (status) {
    case 'completed':
      return '#01d1a2';
    case 'failed':
      return '#df5264';
    case 'waitingForDeposit':
    case 'pending':
    case 'bitpayPending':
    case 'bitpayTxSent':
      return '#fdb455';
    default:
      return '#9b9bab';
  }
};

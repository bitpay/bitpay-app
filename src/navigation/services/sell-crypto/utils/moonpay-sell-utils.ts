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

export const moonpaySellSupportedCoins = [
  'btc',
  'bch',
  'eth',
  'eth_arb', // eth_arbitrum in MoonpaySell
  'ltc',
  'doge',
  'matic', // pol_polygon in Moonpay // backward compatibility
  'pol', // pol_polygon in Moonpay
];

export const moonpaySellSupportedErc20Tokens = ['axs', 'usdc', 'usdt'];

export const moonpaySellSupportedMaticTokens = [
  'usdc', // usdc_polygon in MoonpaySell
  'weth', // eth_polygon in MoonpaySell
];

export const moonpaySellSupportedArbitrumTokens = [];

// Currently unsupported
// export const moonpaySellSupportedBaseTokens = [];
// export const moonpaySellSupportedOptimismTokens = [];

export const getMoonpaySellSupportedCurrencies = (
  country?: string,
): string[] => {
  const moonpaySellSupportedCurrencies = [
    ...moonpaySellSupportedCoins,
    ...moonpaySellSupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...moonpaySellSupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...moonpaySellSupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
  ];

  return moonpaySellSupportedCurrencies;
};

export const getMoonpaySellFixedCurrencyAbbreviation = (
  currency: string,
  chain: string,
): string => {
  const currencyAbbreviationMapping: {
    [key: string]: {[key: string]: string};
  } = {
    matic: {
      matic: 'pol_polygon',
      pol: 'pol_polygon',
      eth: 'eth_polygon',
      usdc: 'usdc_polygon',
    },
    arb: {
      eth: 'eth_arbitrum',
    },
  };

  const _currency = currency.toLowerCase();
  const chainMapping = currencyAbbreviationMapping[chain];

  if (chainMapping && chainMapping[_currency]) {
    return chainMapping[_currency];
  }

  return _currency;
};

export const getChainFromMoonpayNetworkCode = (
  currencyAbbreviation: string,
  networkCode?: string | null,
): string => {
  const networkCodeMapping: {[key: string]: string} = {
    ethereum: 'eth',
    arbitrum: 'arb',
    polygon: 'pol',
  };

  if (!networkCode) {
    return currencyAbbreviation.toLowerCase();
  }

  return (
    networkCodeMapping[networkCode.toLowerCase()] ??
    currencyAbbreviation.toLowerCase()
  );
};

export const getMoonpaySellCurrenciesFixedProps = (
  moonpayCurrenciesData: MoonpayCurrency[],
): MoonpayCurrency[] => {
  const currencyMapping: {
    [key: string]: {
      code: string;
      name: string;
      networkCode?: string;
      contractAddress?: string;
    };
  } = {
    eth_polygon: {
      code: 'weth',
      name: 'Wrapped Ether',
      networkCode: 'polygon',
      contractAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    },
    usdc_polygon: {
      code: 'usdc',
      name: 'USDC',
      networkCode: 'polygon',
      contractAddress: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    },
    usdc: {
      code: 'usdc',
      name: 'USD Coin',
      networkCode: 'ethereum',
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
    usdt: {
      code: 'usdt',
      name: 'Tether USD',
      networkCode: 'ethereum',
      contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    matic_polygon: {code: 'pol', name: 'Polygon', networkCode: 'polygon'},
    pol_polygon: {code: 'pol', name: 'Polygon', networkCode: 'polygon'},
    eth_arbitrum: {code: 'eth', name: 'Ethereum', networkCode: 'arbitrum'},
  };

  moonpayCurrenciesData.forEach((currency: MoonpayCurrency) => {
    const key = currency.code.toLowerCase();
    const mapping = currencyMapping[key];

    if (
      mapping &&
      mapping.networkCode?.toLowerCase() ===
        currency.metadata?.networkCode?.toLowerCase() &&
      (!mapping.contractAddress ||
        mapping.contractAddress === currency.metadata?.contractAddress)
    ) {
      currency.code = mapping.code;
      currency.name = mapping.name;
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

export const getPayoutMethodKeyFromMoonpayType = (
  method: MoonpayPayoutMethodType | undefined,
): PaymentMethodKey | undefined => {
  if (!method) {
    return undefined;
  }
  let formattedPaymentMethod: PaymentMethodKey | undefined;
  switch (method) {
    case 'ach_bank_transfer':
      formattedPaymentMethod = 'ach';
      break;
    case 'credit_debit_card':
      formattedPaymentMethod = 'debitCard';
      break;
    case 'sepa_bank_transfer':
      formattedPaymentMethod = 'sepaBankTransfer';
      break;
    case 'gbp_bank_transfer':
      formattedPaymentMethod = 'gbpBankTransfer';
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
    case 'bitpayCanceled':
      statusTitle = t('Canceled');
      statusDescription = t('Sell order canceled by user.');
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
    case 'bitpayCanceled':
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

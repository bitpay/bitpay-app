import {t} from 'i18next';
import {
  TransakFiatCurrency,
  TransakHeadlessPaymentMethod,
  TransakHeadlessQuoteData,
  TransakHeadlessUserAuthData,
  TransakPaymentOption,
  TransakPaymentType,
  TransakStatusKey,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {BuyCryptoConfig} from '../../../../store/external-services/external-services.types';
import {Key, Wallet} from '../../../../store/wallet/wallet.models';
import {EUCountries} from '../../../../store/location/location.constants';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';
import {PaymentMethod, PaymentMethodKey} from '../constants/BuyCryptoConstants';

const PASSTHROUGH_URI_DEV = 'https://cmgustavo.github.io/website/transak/';
const PASSTHROUGH_URI_PROD = 'https://bws.bitpay.com/static/transak/';

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
  'eth_arb',
  'eth_base',
  'eth_op',
  'matic', // backward compatibility
  'ltc',
  'pol',
  'sol',
  'xrp',
];

export const transakSupportedErc20Tokens = [
  'aave',
  'ads',
  'ageur',
  'amkt',
  'ape',
  'arkm',
  'audio',
  'aurora',
  'ava',
  'bolt',
  'chain',
  'chz',
  'clv',
  'ctsi',
  'dao',
  'defi',
  'dpi',
  'enj',
  'ern',
  'eth',
  'eurc',
  'eurt',
  'fdusd',
  'frax',
  'gtc',
  'gth',
  'ibz',
  'link',
  'looks',
  'mana',
  'mcade',
  'mim',
  'minds',
  'mnet',
  'mpro',
  'plot',
  'pyusd',
  'quartz',
  'shib',
  'spi',
  'steth',
  'stxem',
  'super',
  'swap',
  'swapp',
  'tama',
  'tower',
  'tsx',
  'uni',
  'usdc',
  'usdc_c',
  'usdr',
  'usdt',
  'versecopy',
  'vra',
  'wbtc',
  'yld',
  'zerc',
];

export const transakSupportedMaticTokens = [
  'aave',
  'adai',
  'ageur',
  'ava',
  'bat',
  'chain',
  'dai',
  'dfyn',
  'doga',
  'eura',
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
  'qi',
  'quick',
  'revv',
  'sfusdc',
  'sfdai',
  'stxusdt',
  'sushi',
  'tower',
  'tsx',
  'usdc',
  'usdc_c',
  'usdt',
  'usdt_tob',
  'wbtc',
  'weth',
  'zed',
];

export const transakSupportedArbitrumTokens = ['usdc'];

export const transakSupportedBaseTokens = ['tower', 'usdc'];

export const transakSupportedOptimismTokens = ['usdc'];

export const transakSupportedSolanaTokens = [
  'bonk',
  'usdc', // EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
  'usdt', // Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
];

export const getTransakSupportedCurrencies = (): string[] => {
  const transakSupportedCurrencies = [
    ...transakSupportedCoins,
    ...transakSupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...transakSupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...transakSupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
    ...transakSupportedBaseTokens.flatMap(baseToken =>
      getCurrencyAbbreviation(baseToken, 'base'),
    ),
    ...transakSupportedOptimismTokens.flatMap(optimismToken =>
      getCurrencyAbbreviation(optimismToken, 'op'),
    ),
    ...transakSupportedSolanaTokens.flatMap(solanaToken =>
      getCurrencyAbbreviation(solanaToken, 'sol'),
    ),
  ];

  return transakSupportedCurrencies;
};

export const getTransakSelectedPaymentMethodData = (
  transakFiatCurrencies: TransakFiatCurrency[],
  selectedFiatCurrency: string,
  selectedPaymentMethod: PaymentMethod | undefined,
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

  switch (selectedPaymentMethod?.method) {
    // "ach" | "applePay" | "creditCard" | "debitCard" | "sepaBankTransfer" | "other"
    case 'ach':
      transakSelectedPaymentMethodData =
        transakSelectedFiatCurrency.paymentOptions.find(
          (transakPaymentOption: TransakPaymentOption) => {
            if (['pm_ach_pull'].includes(transakPaymentOption.id)) {
              return true;
            }
          },
        );
      break;
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
    case 'googlePay':
      transakSelectedPaymentMethodData =
        transakSelectedFiatCurrency.paymentOptions.find(
          (transakPaymentOption: TransakPaymentOption) => {
            if (['google_pay'].includes(transakPaymentOption.id)) {
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

export const getPassthroughUri = (): string => {
  return __DEV__ ? PASSTHROUGH_URI_DEV : PASSTHROUGH_URI_PROD;
};

// Transak headless

export const transakHeadlessEnvironment: 'STAGING' | 'PRODUCTION' =
  transakEnv === 'production' ? 'PRODUCTION' : 'STAGING';

export const getTransakHeadlessPaymentMethod = (
  method: PaymentMethodKey | undefined,
): TransakHeadlessPaymentMethod | undefined => {
  switch (method) {
    case 'creditCard':
    case 'debitCard':
      return 'credit_debit_card';
    case 'applePay':
      return 'apple_pay';
    case 'googlePay':
      return 'google_pay';
    default:
      return undefined;
  }
};

// Whether the device can run the wallet sheets, as for MoonPay embedded: Apple
// Pay needs native wallet support; Google Pay is decided inside the WebView by
// the Payment Request API.
export interface TransakHeadlessSupport {
  applePaySupported?: boolean;
  googlePaySupported?: boolean;
}

// headlessBuyDisabled is a kill switch for every method, and each method can
// be turned off on its own, with the same keys as MoonPay embedded: headless
// is used unless the config turns it off.
export const isTransakHeadlessPaymentMethodEnabled = (
  method: PaymentMethodKey | undefined,
  buyCryptoConfig: BuyCryptoConfig | undefined,
  country: string | undefined,
  support: TransakHeadlessSupport = {},
): boolean => {
  const transakConfig = buyCryptoConfig?.transak?.config;
  if (transakConfig?.headlessBuyDisabled === true) {
    return false;
  }
  // UK customers must go through Transak's FCA journey, which only the widget
  // implements (headless orders fail with 4016).
  if (country === 'GB') {
    return false;
  }
  const paymentMethods = transakConfig?.paymentMethods;
  switch (getTransakHeadlessPaymentMethod(method)) {
    case 'credit_debit_card':
      return !paymentMethods?.cardEmbedded?.disabled;
    case 'apple_pay':
      return (
        !paymentMethods?.applePayEmbedded?.disabled &&
        !!support.applePaySupported
      );
    case 'google_pay':
      return (
        !paymentMethods?.googlePayEmbedded?.disabled &&
        !!support.googlePaySupported
      );
    default:
      return false;
  }
};

export const isTransakHeadlessKycEnabled = (
  buyCryptoConfig: BuyCryptoConfig | undefined,
): boolean => buyCryptoConfig?.transak?.config?.headlessKycDisabled !== true;

const TRANSAK_HEADLESS_PAYMENT_METHOD_KEYS: PaymentMethodKey[] = [
  'creditCard',
  'applePay',
  'googlePay',
];

export const isTransakHeadlessConnectionEnabled = (
  buyCryptoConfig: BuyCryptoConfig | undefined,
  country: string | undefined,
  support: TransakHeadlessSupport = {},
): boolean =>
  !buyCryptoConfig?.disabled &&
  !buyCryptoConfig?.transak?.disabled &&
  !buyCryptoConfig?.transak?.removed &&
  TRANSAK_HEADLESS_PAYMENT_METHOD_KEYS.some(method =>
    isTransakHeadlessPaymentMethodEnabled(
      method,
      buyCryptoConfig,
      country,
      support,
    ),
  );

export const getTransakHeadlessConnectionWallet = (keys: {
  [keyId: string]: Key;
}): Wallet | undefined => {
  for (const key of Object.values(keys)) {
    if (!key.backupComplete) {
      continue;
    }
    const wallet = key.wallets?.find(w => w.credentials && w.isComplete());
    if (wallet) {
      return wallet;
    }
  }
  return undefined;
};

// A session about to expire is treated as expired: Transak cannot refresh an
// expired session, and a purchase must not fail halfway because of it.
export const isTransakHeadlessUserAuthValid = (
  userAuth: TransakHeadlessUserAuthData | undefined,
): userAuth is TransakHeadlessUserAuthData =>
  !!userAuth?.accessToken && userAuth.expiresAt - Date.now() > 10 * 60 * 1000;

const EEA_NON_EU_COUNTRIES = ['IS', 'LI', 'NO'];

export const getTransakLegalUrls = (
  country: string | undefined,
): {termsUrl: string; privacyUrl: string} => {
  const countryCode = country?.toUpperCase();
  if (countryCode === 'US') {
    return {
      termsUrl: 'https://transak.com/terms-of-service-us',
      privacyUrl: 'https://transak.com/privacy-policy',
    };
  }
  if (
    countryCode &&
    (EUCountries.includes(countryCode) ||
      EEA_NON_EU_COUNTRIES.includes(countryCode))
  ) {
    return {
      termsUrl: 'https://transak.com/eu/terms-of-service-eu',
      privacyUrl: 'https://transak.com/eu/privacy-policy-eu',
    };
  }
  return {
    termsUrl: 'https://transak.com/terms-of-service',
    privacyUrl: 'https://transak.com/privacy-policy',
  };
};

const TRANSAK_HEADLESS_RESULT_PARAM = 'headlessResult';

// After 3DS Transak redirects to these. The in-app WebView intercepts them; if
// one is ever opened in a browser, the passthrough page still sends the
// customer back to the app with the partnerOrderId, as the widget flow does.
export const getTransakHeadlessRedirectUrls = (
  transakExternalId: string,
): {successUrl: string; failureUrl: string} => {
  const buildUrl = (result: 'success' | 'failure') =>
    `${getPassthroughUri()}?${new URLSearchParams({
      partnerOrderId: transakExternalId,
      [TRANSAK_HEADLESS_RESULT_PARAM]: result,
    }).toString()}`;
  return {successUrl: buildUrl('success'), failureUrl: buildUrl('failure')};
};

export const getTransakHeadlessRedirectResult = (
  url: string,
): 'success' | 'failure' | undefined => {
  if (
    !url.startsWith(getPassthroughUri()) &&
    !url.startsWith('bitpay://transak')
  ) {
    return undefined;
  }
  try {
    const result = new URL(url).searchParams.get(TRANSAK_HEADLESS_RESULT_PARAM);
    return result === 'success' || result === 'failure' ? result : undefined;
  } catch {
    return undefined;
  }
};

// Only statuses Transak sets once the payment went through: a missing or
// unknown status is never taken as paid.
const TRANSAK_HEADLESS_PAID_STATUSES: TransakStatusKey[] = [
  'PAYMENT_DONE_MARKED_BY_USER',
  'PROCESSING',
  'PENDING_DELIVERY_FROM_TRANSAK',
  'ON_HOLD_PENDING_DELIVERY_FROM_TRANSAK',
  'COMPLETED',
];

export const isTransakHeadlessPaidStatus = (
  status: TransakStatusKey | undefined,
): boolean =>
  status !== undefined && TRANSAK_HEADLESS_PAID_STATUSES.includes(status);

export const TRANSAK_HEADLESS_TERMS_IDS = [
  'TRANSAK_TERMS_OF_SERVICE',
  'COINME_USER_AGREEMENT',
  'US_TERMS_RETURNING',
  'ZEROHASH_USER_AGREEMENT',
  'MICA_EEA_BUY',
  'MICA_EEA_SELL',
  'GB_INVESTMENT_RISK_WARNING',
] as const;

export const getTransakHeadlessUnsupportedTermsIds = (
  termsIds: string[] | undefined,
): string[] =>
  (termsIds ?? []).filter(
    termsId =>
      !(TRANSAK_HEADLESS_TERMS_IDS as readonly string[]).includes(termsId),
  );

export const getTransakHeadlessConfirmButtonKind = (
  termsIds: string[] | undefined,
): 'agreeAndConfirm' | 'confirm' | undefined => {
  const ids = termsIds ?? [];
  if (
    ids.includes('TRANSAK_TERMS_OF_SERVICE') ||
    ids.includes('COINME_USER_AGREEMENT')
  ) {
    return 'agreeAndConfirm';
  }
  if (
    ids.includes('US_TERMS_RETURNING') ||
    ids.includes('ZEROHASH_USER_AGREEMENT')
  ) {
    return 'confirm';
  }
  return undefined;
};

export const isSameTransakHeadlessTermsIds = (
  a: string[] | undefined,
  b: string[] | undefined,
): boolean => (a ?? []).join(',') === (b ?? []).join(',');

// Whether an order can be placed with the fresh quote without showing it
// first: same disclaimers, charge and fee the customer confirmed. The crypto
// amount is an estimate that Transak refreshes every minute, so it is not
// compared.
export const isSameTransakHeadlessQuoteForCustomer = (
  shown: Pick<TransakHeadlessQuoteData, 'fiatAmount' | 'totalFee' | 'termsIds'>,
  fresh: Pick<TransakHeadlessQuoteData, 'fiatAmount' | 'totalFee' | 'termsIds'>,
): boolean =>
  isSameTransakHeadlessTermsIds(shown.termsIds, fresh.termsIds) &&
  Number(shown.fiatAmount) === Number(fresh.fiatAmount) &&
  Number(shown.totalFee) === Number(fresh.totalFee);

export const getTransakCoinFormat = (coin: string): string => {
  coin = externalServicesCoinMapping(coin);
  let formattedCoin: string = `${coin.toUpperCase()}`;
  return formattedCoin;
};

export const getTransakChainFormat = (chain: string): string | undefined => {
  if (!chain) {
    return undefined;
  }

  const chainMap: {[key: string]: string} = {
    btc: 'mainnet',
    bch: 'mainnet',
    ltc: 'mainnet',
    eth: 'ethereum',
    arb: 'arbitrum',
    base: 'base',
    matic: 'polygon',
    op: 'optimism',
    sol: 'solana',
    xrp: 'mainnet',
  };

  return chainMap[chain.toLowerCase()];
};

export const getTransakPaymentMethodFormat = (
  method: PaymentMethodKey | undefined,
): TransakPaymentType | undefined => {
  if (!method) {
    return undefined;
  }
  let formattedPaymentMethod: TransakPaymentType | undefined;
  switch (method) {
    // "ach" | "applePay" | "creditCard" | "debitCard" | "sepaBankTransfer" | "other"
    case 'ach':
      formattedPaymentMethod = 'pm_ach_pull';
      break;
    case 'applePay':
      formattedPaymentMethod = 'apple_pay';
      break;
    case 'googlePay':
      formattedPaymentMethod = 'google_pay';
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

export const getTransakFiatAmountLimits = (
  paymentMethod?: PaymentMethodKey,
) => {
  let limits: {min: number; max: number} = {min: 30, max: 3000};
  switch (paymentMethod) {
    case 'ach':
      limits = {
        min: 30,
        max: 5000,
      };
      break;
    default:
      limits = {
        min: 30,
        max: 3000,
      };
      break;
  }
  return limits;
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

import {Currencies} from '../../../../constants/currencies';

const PASSTHROUGH_URI_DEV = 'https://cmgustavo.github.io/website/simplex/';
const PASSTHROUGH_URI_PROD = 'https://bws.bitpay.com/static/simplex/';

const env = 'development'; // TODO: take the correct environment
const simplexEnv = env == 'development' ? 'sandbox' : 'production';

const appName = 'bitpayapp';

export const supportedFiatAltCurrencies = [
  'AED',
  'ARS',
  'AUD',
  'AZN',
  'BGN',
  'BRL',
  'CAD',
  'CHF',
  'CLP',
  'CNY',
  'COP',
  'CRC',
  'CZK',
  'DKK',
  'DOP',
  'EUR',
  'GBP',
  'GEL',
  'HKD',
  'HUF',
  'ILS',
  'INR',
  'JPY',
  'KRW',
  'KZT',
  'MAD',
  'MDL',
  'MXN',
  'MYR',
  'NAD',
  'NGN',
  'NOK',
  'NZD',
  'PEN',
  'PHP',
  'PLN',
  'QAR',
  'RON',
  'RUB',
  'SEK',
  'SGD',
  'TRY',
  'TWD',
  'UAH',
  'USD',
  'UYU',
  'UZS',
  'VND',
  'ZAR',
];
export const supportedCoins = [
  'btc',
  'bch',
  'eth',
  'pax',
  'busd',
  'doge',
  'dai',
  'usdc',
  'ltc',
  'shib',
  'xrp',
];

export const simplexFiatAmountLimits = {
  min: 50,
  max: 20000,
};

export const getCheckoutUrl = (): string => {
  return env == 'development'
    ? 'https://sandbox.test-simplexcc.com'
    : 'https://checkout.simplexcc.com';
};

export const getPassthroughUri = (): string => {
  return env == 'development' ? PASSTHROUGH_URI_DEV : PASSTHROUGH_URI_PROD;
};

const paymentRequest = (wallet: any, data: any): Promise<any> => {
  data.env = simplexEnv;
  return wallet.simplexPaymentRequest(data);
};

const getUserAgent = (): string => {
  // TODO: return the correct userAgent
  return 'application-name/1.6.4.176 CFNetwork/897.15 Darwin/17.5.0 (iPhone/6s iOS/11.3)';
};

const getAppVersion = (): string => {
  // TODO: return the correct app version
  return '12.10.4';
};

const checkSimplexCoin = (coin: string): string => {
  if (coin == 'PAX') {
    return 'USDP';
  }
  return coin;
};

export const simplexPaymentRequest = (
  wallet: any,
  address: string,
  quoteData: any,
  createdOn: number,
): Promise<any> => {
  const installDate = createdOn
    ? new Date(createdOn).toISOString()
    : new Date().toISOString();

  const userAgent = getUserAgent();
  const data = {
    account_details: {
      app_version_id: getAppVersion(),
      app_install_date: installDate,
      app_end_user_id: wallet.id,
      signup_login: {
        user_agent: userAgent, // Format: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:67.0) Gecko/20100101 Firefox/67.0'
        timestamp: new Date().toISOString(),
      },
    },
    transaction_details: {
      payment_details: {
        quote_id: quoteData.quoteId,
        fiat_total_amount: {
          currency: quoteData.currency,
          amount: quoteData.fiatTotalAmount,
        },
        requested_digital_amount: {
          currency: checkSimplexCoin(wallet.currencyAbbreviation.toUpperCase()),
          amount: quoteData.cryptoAmount,
        },
        destination_wallet: {
          currency: checkSimplexCoin(wallet.currencyAbbreviation.toUpperCase()),
          address,
          tag: '',
        },
        original_http_ref_url: 'https://' + getPassthroughUri(),
      },
    },
  };

  return paymentRequest(wallet, data);
};

export const getPaymentUrl = (
  wallet: any,
  quoteData: any,
  remoteData: any,
): string => {
  const dataSrc: any = {
    version: '1',
    partner: remoteData.app_provider_id,
    payment_flow_type: 'wallet',
    return_url_success:
      getPassthroughUri() +
      'end.html?success=true&paymentId=' +
      remoteData.payment_id +
      '&quoteId=' +
      quoteData.quoteId +
      '&userId=' +
      wallet.id +
      '&returnApp=' +
      appName,
    return_url_fail:
      getPassthroughUri() +
      'end.html?success=false&paymentId=' +
      remoteData.payment_id +
      '&quoteId=' +
      quoteData.quoteId +
      '&userId=' +
      wallet.id +
      '&returnApp=' +
      appName,
    quote_id: quoteData.quoteId,
    payment_id: remoteData.payment_id,
    user_id: wallet.id,
    'destination_wallet[address]': remoteData.address,
    'destination_wallet[currency]':
      Currencies[wallet.currencyAbbreviation.toLowerCase()].chain,
    'fiat_total_amount[amount]': quoteData.fiatTotalAmount,
    'fiat_total_amount[currency]': quoteData.currency,
    'digital_total_amount[amount]': quoteData.cryptoAmount,
    'digital_total_amount[currency]':
      Currencies[wallet.currencyAbbreviation.toLowerCase()].chain,
  };

  let str = '';
  for (let key in dataSrc) {
    if (str != '') {
      str += '&';
    }
    str += key + '=' + encodeURIComponent(dataSrc[key]);
  }

  const api_host = getCheckoutUrl();

  const url =
    getPassthroughUri() + '?api_host=' + api_host + '/payments/new/&' + str;

  return url;
};

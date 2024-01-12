// Coinbase API
import axios from 'axios';
import {Platform} from 'react-native';

import {
  CoinbaseAccountsProps,
  CoinbaseAccountProps,
  CoinbaseUserProps,
  CoinbaseTokenProps,
  CoinbaseExchangeRatesProps,
  CoinbaseErrorsProps,
  CoinbaseCreateAddressProps,
  CoinbaseTransactionsProps,
  CoinbaseTransactionProps,
} from './coinbase.types';

import {
  PAGE_LIMIT,
  COINBASE_INVOICE_URL,
  CREDENTIALS,
  API_VERSION,
  COINBASE_CONFIG_API,
  TRANSACTIONS_LIMIT,
} from './coinbase.constants';

// Redirect URI
const COINBASE_REDIRECT_URI =
  Platform.OS !== 'android'
    ? COINBASE_CONFIG_API.redirect_uri.mobile
    : 'https://bitpay.com/oauth/coinbase/redirect';

// OAuth
let oauthStateCode: string = ''; // Random

const getOauthStateCode = (): string => {
  return oauthStateCode;
};

const getTokenError = (): CoinbaseErrorsProps => {
  return {
    errors: [{id: 'MISSING_ACCESS_TOKEN', message: 'Access Token not found'}],
  };
};

const setRandomHex = () => {
  const characters = '0123456789abcdef';
  let str = '';
  for (let i = 0; i < 40; i++) {
    str += characters[Math.floor(Math.random() * 16)];
  }
  oauthStateCode = str;
};

const getOAuthUrl = (): string => {
  // Random string to protect against cross-site request forgery attacks
  setRandomHex(); // set State Code
  const state = getOauthStateCode();
  const host = CREDENTIALS.host;
  const client_id = CREDENTIALS.client_id;
  const scope =
    'wallet:accounts:read,' +
    'wallet:addresses:read,' +
    'wallet:addresses:create,' +
    'wallet:user:read,' +
    'wallet:user:email,' +
    'wallet:transactions:read,' +
    'wallet:transactions:send';
  const send_limit_amount = CREDENTIALS.send_limit_amount;

  return (
    host +
    '/oauth/authorize?response_type=code&client_id=' +
    client_id +
    '&redirect_uri=' +
    COINBASE_REDIRECT_URI +
    '&account=all&state=' +
    state +
    '&scope=' +
    scope +
    '&meta[send_limit_amount]=' +
    send_limit_amount +
    '&meta[send_limit_currency]=USD&meta[send_limit_period]=day'
  );
};

const getRefreshToken = async (
  token: CoinbaseTokenProps | null,
): Promise<CoinbaseTokenProps> => {
  if (!token) {
    const err = getTokenError();
    throw err;
  }
  const url = CREDENTIALS.host + '/oauth/token';
  const body = {
    grant_type: 'refresh_token',
    client_id: CREDENTIALS.client_id,
    client_secret: CREDENTIALS.client_secret,
    redirect_uri: COINBASE_REDIRECT_URI,
    refresh_token: token.refresh_token,
  };
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const {data} = await axios.post(url, body, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const getAccessToken = async (code: string): Promise<CoinbaseTokenProps> => {
  const url = CREDENTIALS.host + '/oauth/token';
  const body = {
    grant_type: 'authorization_code',
    code,
    client_id: CREDENTIALS.client_id,
    client_secret: CREDENTIALS.client_secret,
    redirect_uri: COINBASE_REDIRECT_URI,
  };
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  try {
    const {data} = await axios.post(url, body, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const revokeToken = async (
  token: CoinbaseTokenProps | null,
): Promise<boolean> => {
  if (!token) {
    const error = getTokenError();
    throw error;
  }
  const url = CREDENTIALS.host + '/oauth/revoke';
  const body = {
    token: token.access_token,
  };
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'CB-VERSION': API_VERSION,
    Authorization: 'Bearer ' + token.access_token,
  };
  try {
    const {data} = await axios.post(url, body, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const getAccounts = async (
  token: CoinbaseTokenProps | null,
): Promise<CoinbaseAccountsProps> => {
  if (!token) {
    const error = getTokenError();
    throw error;
  }
  const url =
    CREDENTIALS.api_url + '/v2' + '/accounts?order=asc&limit=' + PAGE_LIMIT;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'CB-VERSION': API_VERSION,
    Authorization: 'Bearer ' + token.access_token,
  };
  try {
    const {data} = await axios.get(url, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const getAccount = async (
  id: string,
  token: CoinbaseTokenProps,
): Promise<CoinbaseAccountProps> => {
  const url = CREDENTIALS.api_url + '/v2/accounts/' + id;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'CB-VERSION': API_VERSION,
    Authorization: 'Bearer ' + token.access_token,
  };
  try {
    const {data} = await axios.get(url, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const getCurrentUser = async (
  token: CoinbaseTokenProps | null,
): Promise<CoinbaseUserProps> => {
  if (!token) {
    const error = getTokenError();
    throw error;
  }
  const url = CREDENTIALS.api_url + '/v2/user';
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'CB-VERSION': API_VERSION,
    Authorization: 'Bearer ' + token.access_token,
  };
  try {
    const {data} = await axios.get(url, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const getTransactions = async (
  accountId: string,
  token: CoinbaseTokenProps | null,
  nextStartingAfter?: string | null | undefined,
): Promise<CoinbaseTransactionsProps> => {
  if (!token) {
    const error = getTokenError();
    throw error;
  }
  let url =
    CREDENTIALS.api_url +
    '/v2/accounts/' +
    accountId +
    '/transactions?order=desc&limit=' +
    TRANSACTIONS_LIMIT;
  if (nextStartingAfter) {
    url = url + '&starting_after=' + nextStartingAfter;
  }
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'CB-VERSION': API_VERSION,
    Authorization: 'Bearer ' + token.access_token,
  };
  try {
    const {data} = await axios.get(url, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const getNewAddress = async (
  accountId: string,
  token: CoinbaseTokenProps | null,
  label?: string,
): Promise<CoinbaseCreateAddressProps> => {
  if (!token) {
    const error = getTokenError();
    throw error;
  }
  const body = {
    name: label || 'BitPay',
  };
  const url = CREDENTIALS.api_url + '/v2/accounts/' + accountId + '/addresses';
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'CB-VERSION': API_VERSION,
    Authorization: 'Bearer ' + token.access_token,
  };
  try {
    const {data} = await axios.post(url, body, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const sendTransaction = async (
  accountId: string,
  tx: any,
  token: CoinbaseTokenProps | null,
  twoFactorCode?: string,
): Promise<CoinbaseTransactionProps> => {
  if (!token) {
    const error = getTokenError();
    throw error;
  }
  tx = {...tx, type: 'send'}; // Required for sending TX
  const url =
    CREDENTIALS.api_url + '/v2/accounts/' + accountId + '/transactions';
  let headers: any = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'CB-VERSION': API_VERSION,
    Authorization: 'Bearer ' + token.access_token,
  };
  if (twoFactorCode) {
    headers['CB-2FA-TOKEN'] = twoFactorCode; // 2FA if required
  }
  try {
    const {data} = await axios.post(url, tx, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const payInvoice = async (
  invoiceId: string,
  currency: string,
  token: CoinbaseTokenProps | null,
  twoFactorCode?: string,
): Promise<any> => {
  if (!token) {
    const error = getTokenError();
    throw error;
  }
  const url = COINBASE_INVOICE_URL + invoiceId;
  const body = {
    currency,
    token: token.access_token,
    twoFactorCode,
  };
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  try {
    const {data} = await axios.post(url, body, {headers});
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const getExchangeRates = async (
  currency: string = 'USD',
): Promise<CoinbaseExchangeRatesProps> => {
  const url =
    CREDENTIALS.api_url + '/v2/exchange-rates' + '?currency=' + currency;
  try {
    const {data} = await axios.get(url);
    return data;
  } catch (error: any) {
    throw error.response.data;
  }
};

const CoinbaseAPI = {
  revokeToken,
  getAccessToken,
  getRefreshToken,
  getAccount,
  getAccounts,
  getCurrentUser,
  getExchangeRates,
  getTransactions,
  getNewAddress,
  sendTransaction,
  payInvoice,
  getOAuthUrl,
  getOauthStateCode,
};

export default CoinbaseAPI;

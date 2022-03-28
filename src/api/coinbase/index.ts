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
} from './coinbase.types';

import {
  PAGE_LIMIT,
  COINBASE_INVOICE_URL,
  CREDENTIALS,
  API_VERSION,
  COINBASE_CONFIG_API,
} from './coinbase.constants';

// OAuth
let oauthStateCode: string = ''; // Random

const getOauthStateCode = (): string => {
  return oauthStateCode;
};

const getTokenError = (): CoinbaseErrorsProps => {
  return {errors: [{id: 'MISSING_TOKEN', message: 'Token not found'}]};
};

const setRandomHex = (): string => {
  const characters = '0123456789abcdef';
  let str = '';
  for (let i = 0; i < 40; i++) {
    str += characters[Math.floor(Math.random() * 16)];
  }
  oauthStateCode = str;
  return oauthStateCode;
};

const getOAuthUrl = (): string => {
  const redirect_uri =
    Platform.OS !== 'android'
      ? COINBASE_CONFIG_API.redirect_uri.mobile
      : 'https://bitpay.com/oauth/coinbase/redirect';

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
    redirect_uri +
    '&account=all&state=' +
    state +
    '&scope=' +
    scope +
    '&meta[send_limit_amount]=' +
    send_limit_amount +
    '&meta[send_limit_currency]=USD&meta[send_limit_period]=day'
  );
};

const getRefreshToken = (
  token: CoinbaseTokenProps | null,
): Promise<CoinbaseTokenProps> => {
  return new Promise((resolve, reject) => {
    if (!token) return reject(getTokenError());
    const url = CREDENTIALS.host + '/oauth/token';
    const data = {
      grant_type: 'refresh_token',
      client_id: CREDENTIALS.client_id,
      client_secret: CREDENTIALS.client_secret,
      redirect_uri: COINBASE_CONFIG_API.redirect_uri.mobile,
      refresh_token: token.refresh_token,
    };
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    console.debug('Coinbase: Getting Refresh Token...');
    axios
      .post(url, data, {headers})
      .then(response => {
        console.info('Coinbase: Refresh Token SUCCESS');
        return resolve(response.data);
      })
      .catch(error => {
        console.error('Coinbase: Refresh Token ERROR ' + error.response.status);
        return reject(error.response.data);
      });
  });
};

const getAccessToken = (code: string): Promise<CoinbaseTokenProps> => {
  const url = CREDENTIALS.host + '/oauth/token';
  const data = {
    grant_type: 'authorization_code',
    code,
    client_id: CREDENTIALS.client_id,
    client_secret: CREDENTIALS.client_secret,
    redirect_uri: COINBASE_CONFIG_API.redirect_uri.mobile,
  };
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  console.debug('Coinbase: Getting Token...');
  return new Promise((resolve, reject) => {
    axios
      .post(url, data, {headers})
      .then(response => {
        console.info('Coinbase: GET Access Token: SUCCESS');
        return resolve(response.data);
      })
      .catch(error => {
        console.error(
          'Coinbase: GET Access Token: ERROR ' + error.response.status,
        );
        return reject(error.response.data);
      });
  });
};

const revokeToken = (token: CoinbaseTokenProps | null): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (!token) return reject(getTokenError());
    const url = CREDENTIALS.host + '/oauth/revoke';
    const data = {
      token: token.access_token,
    };
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'CB-VERSION': API_VERSION,
      Authorization: 'Bearer ' + token.access_token,
    };

    console.debug('Coinbase: Revoke Token...');
    axios
      .post(url, data, {headers})
      .then(_ => {
        console.info('Coinbase: Revoke Token SUCCESS');
        return resolve(true);
      })
      .catch(error => {
        console.error('Coinbase: Revoke Token ERROR ' + error.response.status);
        return reject(error.response.data);
      });
  });
};

const getAccounts = (
  token: CoinbaseTokenProps | null,
): Promise<CoinbaseAccountsProps> => {
  if (!token) return Promise.reject(getTokenError());
  const url =
    CREDENTIALS.api_url + '/v2' + '/accounts?order=asc&limit=' + PAGE_LIMIT;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'CB-VERSION': API_VERSION,
    Authorization: 'Bearer ' + token.access_token,
  };
  console.debug('Coinbase: Getting Accounts...');
  return new Promise((resolve, reject) => {
    axios
      .get(url, {headers})
      .then(response => {
        console.info('Coinbase: Get Accounts SUCCESS');
        return resolve(response.data);
      })
      .catch(error => {
        console.error('Coinbase: Get Accounts ERROR ', error.response.status);
        return reject(error.response.data);
      });
  });
};

const getAccount = (
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
  console.debug('Coinbase: Getting Account...');
  return new Promise((resolve, reject) => {
    axios
      .get(url, {headers})
      .then(response => {
        console.info('Coinbase: Get Account SUCCESS');
        return resolve(response.data);
      })
      .catch(error => {
        console.error('Coinbase: Get Account ERROR ' + error.response.status);
        return reject(error.response.data);
      });
  });
};

const getCurrentUser = (
  token: CoinbaseTokenProps | null,
): Promise<CoinbaseUserProps> => {
  if (!token) return Promise.reject(getTokenError());
  const url = CREDENTIALS.api_url + '/v2/user';
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'CB-VERSION': API_VERSION,
    Authorization: 'Bearer ' + token.access_token,
  };
  console.debug('Coinbase: Getting Current User...');
  return new Promise((resolve, reject) => {
    axios
      .get(url, {headers})
      .then(response => {
        console.info('Coinbase: Get Current User SUCCESS');
        return resolve(response.data);
      })
      .catch(error => {
        console.error(
          'Coinbase: Get Current User ERROR ' + error.response.status,
        );
        return reject(error.response.data);
      });
  });
};

const getTransactions = (
  accountId: string,
  token: CoinbaseTokenProps | null,
): Promise<any> => {
  if (!token) return Promise.reject(getTokenError());
  const url =
    CREDENTIALS.api_url + '/v2/accounts/' + accountId + '/transactions';
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'CB-VERSION': API_VERSION,
    Authorization: 'Bearer ' + token.access_token,
  };
  console.debug('Coinbase: Getting Transactions...');
  return new Promise((resolve, reject) => {
    axios
      .get(url, {headers})
      .then(response => {
        console.info('Coinbase: Get Transactions SUCCESS');
        return resolve(response.data);
      })
      .catch(error => {
        console.error(
          'Coinbase: Get Transactions ERROR ' + error.response.status,
        );
        return reject(error.response.data);
      });
  });
};

const getNewAddress = (
  accountId: string,
  token: CoinbaseTokenProps | null,
  label?: string,
): Promise<CoinbaseCreateAddressProps> => {
  if (!token) return Promise.reject(getTokenError());
  const data = {
    name: label || 'BitPay',
  };
  const url = CREDENTIALS.api_url + '/v2/accounts/' + accountId + '/addresses';
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'CB-VERSION': API_VERSION,
    Authorization: 'Bearer ' + token.access_token,
  };
  console.debug('Coinbase: Creating Address...');
  return new Promise((resolve, reject) => {
    axios
      .post(url, data, {headers})
      .then(response => {
        console.info('Coinbase: Create Address SUCCESS');
        return resolve(response.data);
      })
      .catch(error => {
        console.error(
          'Coinbase: Create Address ERROR ' + error.response.status,
        );
        return reject(error.response.data);
      });
  });
};

const sendTransaction = (
  accountId: string,
  tx: any,
  token: CoinbaseTokenProps | null,
  twoFactorCode?: string,
): Promise<any> => {
  if (!token) return Promise.reject(getTokenError());
  tx['type'] = 'send'; // Required for sending TX
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

  console.debug('Coinbase: Sending Transaction...');
  return new Promise((resolve, reject) => {
    axios
      .post(url, tx, {headers})
      .then(response => {
        console.info('Coinbase: Send Transaction SUCCESS');
        return resolve(response.data);
      })
      .catch(error => {
        console.error(
          'Coinbase: Send Transaction ERROR ' + error.response.status,
        );
        return reject(error.response.data);
      });
  });
};

const payInvoice = (
  invoiceId: string,
  currency: string,
  token: CoinbaseTokenProps | null,
  twoFactorCode?: string,
): Promise<any> => {
  if (!token) return Promise.reject(getTokenError());
  const url = COINBASE_INVOICE_URL + invoiceId;
  const data = {
    currency,
    token: token.access_token,
    twoFactorCode,
  };
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  return new Promise((resolve, reject) => {
    axios
      .post(url, data, {headers})
      .then(response => {
        console.info('Coinbase: Pay invoice SUCCESS');
        return resolve(response.data);
      })
      .catch(error => {
        console.error('Coinbase: Pay Invoice ERROR ' + error.response.status);
        return reject(error.response.data);
      });
  });
};

const getExchangeRates = (
  currency: string = 'USD',
): Promise<CoinbaseExchangeRatesProps> => {
  const url =
    CREDENTIALS.api_url + '/v2/exchange-rates' + '?currency=' + currency;

  console.debug('Coinbase: Getting Exchange Rates...');
  return new Promise((resolve, reject) => {
    axios
      .get(url)
      .then(response => {
        console.info('Coinbase: Get Exchange Rates SUCCESS');
        return resolve(response.data);
      })
      .catch(error => {
        console.error(
          'Coinbase: Get Exchange Rates ERROR ' + error.response.status,
        );
        return reject(error.response.data);
      });
  });
};

const isRevokedTokenError = (error: CoinbaseErrorsProps): boolean => {
  for (let i = 0; i < error.errors.length; i++) {
    if (error.errors[i].id === 'revoked_token') {
      console.warn('Coinbase: Token was revoked');
      return true;
    }
  }
  return false;
};

const parseErrorToString = (error: CoinbaseErrorsProps): string => {
  let message = '';
  for (let i = 0; i < error.errors.length; i++) {
    message = message + error.errors[i].message + '. ';
  }
  return message;
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
  isRevokedTokenError,
  parseErrorToString,
};

export default CoinbaseAPI;

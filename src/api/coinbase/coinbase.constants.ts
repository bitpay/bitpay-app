import {ConfigApiProps, CredentialsProps} from './coinbase.types';

// TODO: essentials constants from config file
export const COINBASE_CONFIG_API: ConfigApiProps = {
  production: {
    host: 'https://www.coinbase.com',
    api: 'https://api.coinbase.com',
    client_id: '',
    client_secret: '',
    send_limit_amount: 1000,
  },
  sandbox: {
    host: 'https://www.coinbase.com',
    api: 'https://api.coinbase.com',
    client_id:
      'f4595bf79429ab2f113b5533d9ac9f140236d0f0a0d0006eebdaacd7e970f2ef',
    client_secret:
      'a524b3a3056f22d944c30d0e5d32b0cfd67f993510d493f200124cfc70ade3e5',
    send_limit_amount: 1,
  },
  redirect_uri: {
    mobile: 'bitpay://coinbase',
    desktop: 'urn:ietf:wg:oauth:2.0:oob',
  },
};
export const CREDENTIALS: CredentialsProps = {
  host: __DEV__
    ? COINBASE_CONFIG_API.sandbox.host
    : COINBASE_CONFIG_API.production.host,
  api_url: __DEV__
    ? COINBASE_CONFIG_API.sandbox.api
    : COINBASE_CONFIG_API.production.api,
  client_id: __DEV__
    ? COINBASE_CONFIG_API.sandbox.client_id
    : COINBASE_CONFIG_API.production.client_id,
  client_secret: __DEV__
    ? COINBASE_CONFIG_API.sandbox.client_secret
    : COINBASE_CONFIG_API.production.client_secret,
  send_limit_amount: __DEV__
    ? COINBASE_CONFIG_API.sandbox.send_limit_amount
    : COINBASE_CONFIG_API.production.send_limit_amount,
};
export const API_VERSION = '2017-10-31'; // TODO: there is a newest version: 2020-02-11
export const PAGE_LIMIT: number = 100;
export const COINBASE_INVOICE_URL: string =
  'https://bitpay.com/oauth/coinbase/pay/';

// TODO: remove?
export enum Coin {
  BTC = 'btc',
  BCH = 'bch',
  ETH = 'eth',
  XRP = 'xrp',
  USDC = 'usdc',
  GUSD = 'gusd',
  PAX = 'pax',
  BUSD = 'busd',
  DAI = 'dai',
  WBTC = 'wbtc',
  DOGE = 'doge',
  SHIB = 'shib',
}

import {
  CoinbaseEnvironment,
  CoinbaseSupportedNetwork,
  ConfigApiProps,
  CredentialsProps,
} from './coinbase.types';

import {COINBASE_CLIENT_ID, COINBASE_CLIENT_SECRET} from '@env';

// TODO: essentials constants from config file
export const COINBASE_CONFIG_API: ConfigApiProps = {
  host: 'https://www.coinbase.com',
  api: 'https://api.coinbase.com',
  client_id: COINBASE_CLIENT_ID,
  client_secret: COINBASE_CLIENT_SECRET,
  send_limit_amount: 1000,
  redirect_uri: {
    mobile: 'bitpay://coinbase',
    desktop: 'urn:ietf:wg:oauth:2.0:oob',
  },
};
export const CREDENTIALS: CredentialsProps = {
  host: COINBASE_CONFIG_API.host,
  api_url: COINBASE_CONFIG_API.api,
  client_id: COINBASE_CONFIG_API.client_id,
  client_secret: COINBASE_CONFIG_API.client_secret,
  send_limit_amount: COINBASE_CONFIG_API.send_limit_amount,
};
export const API_VERSION = '2017-10-31'; // TODO: there is a newest version: 2020-02-11
export const PAGE_LIMIT: number = 100;
export const TRANSACTIONS_LIMIT: number = 25;
export const COINBASE_INVOICE_URL: string =
  'https://bitpay.com/oauth/coinbase/pay/';

export const COINBASE_ENV: CoinbaseEnvironment = __DEV__
  ? CoinbaseEnvironment.sandbox
  : CoinbaseEnvironment.production;
export const COINBASE_HOST_NETWORK = {
  ethereum: CoinbaseSupportedNetwork.ethereum,
  polygon: CoinbaseSupportedNetwork.polygon,
};

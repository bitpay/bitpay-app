export interface CredentialsProps {
  host: string;
  api_url: string;
  client_id: string;
  client_secret: string;
  send_limit_amount: number;
}

// Coinbase data type

export interface CoinbaseAccountsProps {
  pagination: {
    ending_before?: string;
    starting_after?: string;
    limit: number;
    order: string;
    previous_uri?: string;
    next_uri?: string;
  };
  data: CoinbaseAccountProps[];
}

export interface CoinbaseAccountProps {
  id: string;
  name: string;
  primary: boolean;
  type: string;
  currency: {
    address_regex: string;
    asset_id: string;
    code: string;
    color: string;
    exponent: number;
    name: string;
    slug: string;
    sort_index: number;
    type: string;
  };
  balance: {
    amount: number;
    currency: string;
  };
  created_at: string;
  updated_at: string;
  resource: string;
  resource_path: string;
  ready: boolean;
  allow_deposits: boolean;
  allow_withdrawals: boolean;
}

export interface CoinbaseUserProps {
  data: {
    id: string;
    name: string;
    username: string;
    profile_location: string;
    profile_bio: string;
    profile_url: string;
    avatar_url: string;
    resource: string;
    resource_path: string;
    time_zone: string;
    native_currency: string;
    bitcoin_unit: string;
    country: {
      code: string;
      name: string;
      is_in_europe: string;
    };
    created_at: string;
    email: string;
  };
}

export interface CoinbaseTransactionsProps {
  pagination: {
    ending_before: string;
    starting_after: string;
    limit: number;
    order: string;
    previous_uri: string;
    next_uri: string;
  };
  data: CoinbaseTransactionProps[];
}

export interface CoinbaseTransactionProps {
  id: string;
  type: string;
  status: string;
  amount: {
    amount: string;
    currency: string;
  };
  native_amount: {
    amount: string;
    currency: string;
  };
  description: string;
  created_at: string;
  updated_at: string;
  resource: string;
  resource_path: string;
  network: {
    status: string;
    name: string;
  };
  to: {
    address: string;
    id: string;
    resource: string;
    resource_path: string;
  };
  from: {
    currency: string;
    resource: string;
  };
  details: {
    header: string;
    title: string;
    subtitle: string;
  };
}

export interface CoinbaseTokenProps {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface CoinbaseExchangeRatesProps {
  data: {
    currency: string;
    rates: {[key: string]: string};
  };
}

export interface CoinbaseCreateAddressProps {
  data: {
    id: string;
    address: string;
    name: string;
    created_at: string;
    updated_at: string;
    network: string;
    resource: string;
    resource_path: string;
  };
}

export interface CoinbaseErrorsProps {
  errors: Array<{
    id: string;
    message: string;
    url?: string;
  }>;
}

export interface CoinbaseTransactionsByAccountProps {
  [id: string]: CoinbaseTransactionsProps;
}

export interface InvoiceProps {
  id: string;
  amount: {
    amount: string;
    currency: string;
  };
}

export interface ConfigApiProps {
  production: {
    host: string;
    api: string;
    client_id: string;
    client_secret: string;
    send_limit_amount: number;
  };
  sandbox: {
    host: string;
    api: string;
    client_id: string;
    client_secret: string;
    send_limit_amount: number;
  };
  redirect_uri: {
    mobile: string;
    desktop: string;
  };
}

export enum CoinbaseErrorMessages {
  twoFactorInvalid = 'That code was invalid. Please try again.',
  twoFactorRequired = 'Two-step verification code required',
}

export enum CoinbaseEnvironment {
  sandbox = 'sandbox',
  production = 'production',
}

export enum CoinbaseSupportedNetwork {
  ethereum = 'eth',
  polygon = 'matic',
}

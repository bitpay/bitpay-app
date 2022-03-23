import {
  CoinbaseAccountProps,
  CoinbaseErrorsProps,
  CoinbaseTokenProps,
  CoinbaseUserProps,
  CoinbaseExchangeRatesProps,
  CoinbaseTransactionsByAccountProps,
} from '../../api/coinbase/coinbase.types';

export type ApiLoading = boolean;
export type RevokeTokenStatus = 'success' | 'failed' | null;
export type GetAccessTokenStatus = 'success' | 'failed' | null;
export type GetRefreshTokenStatus = 'success' | 'failed' | null;
export type GetUserStatus = 'success' | 'failed' | null;
export type GetAccountsStatus = 'success' | 'failed' | null;
export type GetExchangeRatesStatus = 'success' | 'failed' | null;
export type GetTransactionsStatus = 'success' | 'failed' | null;

export enum CoinbaseActionTypes {
  DISCONNECT_ACCOUNT_PENDING = 'Coinbase/DISCONNECT_ACCOUNT_PENDING',
  DISCONNECT_ACCOUNT_SUCCESS = 'Coinbase/DISCONNECT_ACCOUNT_SUCCESS',
  DISCONNECT_ACCOUNT_FAILED = 'Coinbase/DISCONNECT_ACCOUNT_FAILED',
  EXCHANGE_RATES_PENDING = 'Coinbase/EXCHANGE_RATES_PENDING',
  EXCHANGE_RATES_SUCCESS = 'Coinbase/EXCHANGE_RATES_SUCCESS',
  EXCHANGE_RATES_FAILED = 'Coinbase/EXCHANGE_RATES_FAILED',
  ACCESS_TOKEN_PENDING = 'Coinbase/ACCESS_TOKEN_PENDING',
  ACCESS_TOKEN_SUCCESS = 'Coinbase/ACCESS_TOKEN_SUCCESS',
  ACCESS_TOKEN_FAILED = 'Coinbase/ACCESS_TOKEN_FAILED',
  REFRESH_TOKEN_PENDING = 'Coinbase/REFRESH_TOKEN_PENDING',
  REFRESH_TOKEN_SUCCESS = 'Coinbase/REFRESH_TOKEN_SUCCESS',
  REFRESH_TOKEN_FAILED = 'Coinbase/REFRESH_TOKEN_FAILED',
  USER_PENDING = 'Coinbase/USER_PENDING',
  USER_SUCCESS = 'Coinbase/USER_SUCCESS',
  USER_FAILED = 'Coinbase/USER_FAILED',
  ACCOUNTS_PENDING = 'Coinbase/ACCOUNTS_PENDING',
  ACCOUNTS_SUCCESS = 'Coinbase/ACCOUNTS_SUCCESS',
  ACCOUNTS_FAILED = 'Coinbase/ACCOUNTS_FAILED',
  TRANSACTIONS_PENDING = 'Coinbase/TRANSACTIONS_PENDING',
  TRANSACTIONS_SUCCESS = 'Coinbase/TRANSACTIONS_SUCCESS',
  TRANSACTIONS_FAILED = 'Coinbase/TRANSACTIONS_FAILED',
}

// ------- Exchange Rate -------- //

interface ExchangeRatesPending {
  type: typeof CoinbaseActionTypes.EXCHANGE_RATES_PENDING;
}

interface ExchangeRatesSuccess {
  type: typeof CoinbaseActionTypes.EXCHANGE_RATES_SUCCESS;
  payload: CoinbaseExchangeRatesProps;
}

interface ExchangeRatesFailed {
  type: typeof CoinbaseActionTypes.EXCHANGE_RATES_FAILED;
  payload: CoinbaseErrorsProps;
}

// ------- Revoke and Delete Token -------- //

interface DisconnectAccountPending {
  type: typeof CoinbaseActionTypes.DISCONNECT_ACCOUNT_PENDING;
}

interface DisconnectAccountSuccess {
  type: typeof CoinbaseActionTypes.DISCONNECT_ACCOUNT_SUCCESS;
}

interface DisconnectAccountFailed {
  type: typeof CoinbaseActionTypes.DISCONNECT_ACCOUNT_FAILED;
  payload: CoinbaseErrorsProps;
}

// ------- Access Token -------- //

interface AccessTokenPending {
  type: typeof CoinbaseActionTypes.ACCESS_TOKEN_PENDING;
}

interface AccessTokenSuccess {
  type: typeof CoinbaseActionTypes.ACCESS_TOKEN_SUCCESS;
  payload: CoinbaseTokenProps;
}

interface AccessTokenFailed {
  type: typeof CoinbaseActionTypes.ACCESS_TOKEN_FAILED;
  payload: CoinbaseErrorsProps;
}

// ------- Refresh Token -------- //

interface RefreshTokenPending {
  type: typeof CoinbaseActionTypes.REFRESH_TOKEN_PENDING;
}

interface RefreshTokenSuccess {
  type: typeof CoinbaseActionTypes.REFRESH_TOKEN_SUCCESS;
  payload: CoinbaseTokenProps;
}

interface RefreshTokenFailed {
  type: typeof CoinbaseActionTypes.REFRESH_TOKEN_FAILED;
  payload: CoinbaseErrorsProps;
}

// ------- User Data -------- //

interface UserPending {
  type: typeof CoinbaseActionTypes.USER_PENDING;
}

interface UserSuccess {
  type: typeof CoinbaseActionTypes.USER_SUCCESS;
  payload: CoinbaseUserProps;
}

interface UserFailed {
  type: typeof CoinbaseActionTypes.USER_FAILED;
  payload: CoinbaseErrorsProps;
}

// ------- Accounts (Wallets) -------- //

interface AccountsPending {
  type: typeof CoinbaseActionTypes.ACCOUNTS_PENDING;
}

interface AccountsSuccess {
  type: typeof CoinbaseActionTypes.ACCOUNTS_SUCCESS;
  payload: {balance: number; accounts: CoinbaseAccountProps[]};
}

interface AccountsFailed {
  type: typeof CoinbaseActionTypes.ACCOUNTS_FAILED;
  payload: CoinbaseErrorsProps;
}

// ------- Transactions (by Account) -------- //

interface TransactionsPending {
  type: typeof CoinbaseActionTypes.TRANSACTIONS_PENDING;
}

interface TransactionsSuccess {
  type: typeof CoinbaseActionTypes.TRANSACTIONS_SUCCESS;
  payload: CoinbaseTransactionsByAccountProps;
}

interface TransactionsFailed {
  type: typeof CoinbaseActionTypes.TRANSACTIONS_FAILED;
  payload: CoinbaseErrorsProps;
}

export type CoinbaseActionType =
  | ExchangeRatesPending
  | ExchangeRatesSuccess
  | ExchangeRatesFailed
  | DisconnectAccountPending
  | DisconnectAccountSuccess
  | DisconnectAccountFailed
  | AccessTokenPending
  | AccessTokenSuccess
  | AccessTokenFailed
  | RefreshTokenPending
  | RefreshTokenSuccess
  | RefreshTokenFailed
  | UserPending
  | UserSuccess
  | UserFailed
  | AccountsPending
  | AccountsSuccess
  | AccountsFailed
  | TransactionsPending
  | TransactionsSuccess
  | TransactionsFailed;

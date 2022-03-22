import {
  CoinbaseAccountProps,
  CoinbaseErrorsProps,
  CoinbaseExchangeRatesProps,
  CoinbaseTokenProps,
  CoinbaseTransactionsProps,
  CoinbaseUserProps,
} from '../../api/coinbase/coinbase.types';
import {CoinbaseActionType, CoinbaseActionTypes} from './coinbase.types';

// ------- Exchange Rates -------- //

export const exchangeRatesPending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.EXCHANGE_RATES_PENDING,
});

export const exchangeRatesSuccess = (
  exchangeRates: CoinbaseExchangeRatesProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.EXCHANGE_RATES_SUCCESS,
  payload: exchangeRates,
});

export const exchangeRatesFailed = (
  error: CoinbaseErrorsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.EXCHANGE_RATES_FAILED,
  payload: error,
});

// ------- Revoke and Delete Token -------- //

export const revokeTokenPending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.DISCONNECT_ACCOUNT_PENDING,
});

export const revokeTokenSuccess = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.DISCONNECT_ACCOUNT_SUCCESS,
});

export const revokeTokenFailed = (
  error: CoinbaseErrorsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.DISCONNECT_ACCOUNT_FAILED,
  payload: error,
});

// ------- Access Token -------- //

export const accessTokenPending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.ACCESS_TOKEN_PENDING,
});

export const accessTokenSuccess = (
  token: CoinbaseTokenProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.ACCESS_TOKEN_SUCCESS,
  payload: token,
});

export const accessTokenFailed = (
  error: CoinbaseErrorsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.ACCESS_TOKEN_FAILED,
  payload: error,
});

// ------- Refresh Token -------- //

export const refreshTokenPending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.REFRESH_TOKEN_PENDING,
});

export const refreshTokenSuccess = (
  token: CoinbaseTokenProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.REFRESH_TOKEN_SUCCESS,
  payload: token,
});

export const refreshTokenFailed = (
  error: CoinbaseErrorsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.REFRESH_TOKEN_FAILED,
  payload: error,
});

// ------- User Data -------- //

export const userPending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.USER_PENDING,
});

export const userSuccess = (user: CoinbaseUserProps): CoinbaseActionType => ({
  type: CoinbaseActionTypes.USER_SUCCESS,
  payload: user,
});

export const userFailed = (error: CoinbaseErrorsProps): CoinbaseActionType => ({
  type: CoinbaseActionTypes.USER_FAILED,
  payload: error,
});

// ------- Accounts (Wallets) -------- //

export const accountsPending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.ACCOUNTS_PENDING,
});

export const accountsSuccess = (
  accounts: CoinbaseAccountProps[],
  balance: number,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.ACCOUNTS_SUCCESS,
  payload: {balance, accounts},
});

export const accountsFailed = (
  error: CoinbaseErrorsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.ACCOUNTS_FAILED,
  payload: error,
});

// ------- Transactions (by Account) -------- //

export const transactionsPending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.TRANSACTIONS_PENDING,
});

export const transactionsSuccess = (
  id: string,
  transactions: CoinbaseTransactionsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.TRANSACTIONS_SUCCESS,
  payload: {[id]: transactions},
});

export const transactionsFailed = (
  error: CoinbaseErrorsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.TRANSACTIONS_FAILED,
  payload: error,
});

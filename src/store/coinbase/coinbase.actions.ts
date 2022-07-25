import {
  CoinbaseAccountProps,
  CoinbaseEnvironment,
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

// ------- Revoke and Delete Token -------- //

export const revokeTokenPending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.DISCONNECT_ACCOUNT_PENDING,
});

export const revokeTokenSuccess = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.DISCONNECT_ACCOUNT_SUCCESS,
});

// ------- Access Token -------- //

export const accessTokenPending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.ACCESS_TOKEN_PENDING,
});

export const accessTokenSuccess = (
  env: CoinbaseEnvironment,
  token: CoinbaseTokenProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.ACCESS_TOKEN_SUCCESS,
  payload: {env, token},
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
  env: CoinbaseEnvironment,
  token: CoinbaseTokenProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.REFRESH_TOKEN_SUCCESS,
  payload: {env, token},
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

export const userSuccess = (
  env: CoinbaseEnvironment,
  user: CoinbaseUserProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.USER_SUCCESS,
  payload: {env, user},
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
  env: CoinbaseEnvironment,
  accounts: CoinbaseAccountProps[],
  balance: number,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.ACCOUNTS_SUCCESS,
  payload: {env, balance, accounts},
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
  env: CoinbaseEnvironment,
  id: string,
  transactions: CoinbaseTransactionsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.TRANSACTIONS_SUCCESS,
  payload: {env, txs: {[id]: transactions}},
});

export const transactionsFailed = (
  error: CoinbaseErrorsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.TRANSACTIONS_FAILED,
  payload: error,
});

// ------- Address -------- //

export const createAddressPending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.CREATE_ADDRESS_PENDING,
});

export const createAddressSuccess = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.CREATE_ADDRESS_SUCCESS,
});

export const createAddressFailed = (
  error: CoinbaseErrorsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.CREATE_ADDRESS_FAILED,
  payload: error,
});

// ------- Send Transaction -------- //

export const sendTransactionPending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.SEND_TRANSACTION_PENDING,
});

export const sendTransactionSuccess = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.SEND_TRANSACTION_SUCCESS,
});

export const sendTransactionFailed = (
  error: CoinbaseErrorsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.SEND_TRANSACTION_FAILED,
  payload: error,
});

export const clearSendTransactionStatus = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.CLEAR_SEND_TRANSACTION_STATUS,
});

// ------- Pay Invoice -------- //

export const payInvoicePending = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.PAY_INVOICE_PENDING,
});

export const payInvoiceSuccess = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.PAY_INVOICE_SUCCESS,
});

export const payInvoiceFailed = (
  error: CoinbaseErrorsProps,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.PAY_INVOICE_FAILED,
  payload: error,
});

// ------- Errors -------- //

export const clearErrorStatus = (): CoinbaseActionType => ({
  type: CoinbaseActionTypes.CLEAR_ERROR_STATUS,
});

// ------- Settings -------- //
export const toggleHideCoinbaseTotalBalance = (
  hideTotalBalance: boolean,
): CoinbaseActionType => ({
  type: CoinbaseActionTypes.TOGGLE_HIDE_TOTAL_BALANCE,
  payload: hideTotalBalance,
});

import {
  CoinbaseAccountProps,
  CoinbaseErrorsProps,
  CoinbaseTokenProps,
  CoinbaseUserProps,
  CoinbaseExchangeRatesProps,
  CoinbaseTransactionsByAccountProps,
  CoinbaseEnvironment,
} from '../../api/coinbase/coinbase.types';
import {EVM_CHAINS} from '../../constants/currencies';

export type ApiLoading = boolean;
export type GetAccessTokenStatus = 'success' | 'failed' | null;
export type GetRefreshTokenStatus = 'success' | 'failed' | null;
export type GetUserStatus = 'success' | 'failed' | null;
export type GetAccountsStatus = 'success' | 'failed' | null;
export type GetTransactionsStatus = 'success' | 'failed' | null;
export type CreateAddressStatus = 'success' | 'failed' | null;
export type SendTransactionStatus = 'success' | 'failed' | null;
export type PayInvoiceStatus = 'success' | 'failed' | null;

export enum CoinbaseActionTypes {
  DISCONNECT_ACCOUNT_PENDING = 'Coinbase/DISCONNECT_ACCOUNT_PENDING',
  DISCONNECT_ACCOUNT_SUCCESS = 'Coinbase/DISCONNECT_ACCOUNT_SUCCESS',
  EXCHANGE_RATES_PENDING = 'Coinbase/EXCHANGE_RATES_PENDING',
  EXCHANGE_RATES_SUCCESS = 'Coinbase/EXCHANGE_RATES_SUCCESS',
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
  CREATE_ADDRESS_PENDING = 'Coinbase/CREATE_ADDRESS_PENDING',
  CREATE_ADDRESS_SUCCESS = 'Coinbase/CREATE_ADDRESS_SUCCESS',
  CREATE_ADDRESS_FAILED = 'Coinbase/CREATE_ADDRESS_FAILED',
  SEND_TRANSACTION_PENDING = 'Coinbase/SEND_TRANSACTION_PENDING',
  SEND_TRANSACTION_SUCCESS = 'Coinbase/SEND_TRANSACTION_SUCCESS',
  SEND_TRANSACTION_FAILED = 'Coinbase/SEND_TRANSACTION_FAILED',
  CLEAR_SEND_TRANSACTION_STATUS = 'Coinbase/CLEAR_SEND_TRANSACTION_STATUS',
  CLEAR_ERROR_STATUS = 'Coinbase/CLEAR_ERROR_STATUS',
  PAY_INVOICE_PENDING = 'Coinbase/PAY_INVOICE_PENDING',
  PAY_INVOICE_SUCCESS = 'Coinbase/PAY_INVOICE_SUCCESS',
  PAY_INVOICE_FAILED = 'Coinbase/PAY_INVOICE_FAILED',
  TOGGLE_HIDE_TOTAL_BALANCE = 'Coinbase/TOGGLE_HIDE_TOTAL_BALANCE',
  BLOCKCHAIN_NETWORK = 'Coinbase/BLOCKCHAIN_NETWORK',
}

// ------- Exchange Rate -------- //

interface ExchangeRatesPending {
  type: typeof CoinbaseActionTypes.EXCHANGE_RATES_PENDING;
}

interface ExchangeRatesSuccess {
  type: typeof CoinbaseActionTypes.EXCHANGE_RATES_SUCCESS;
  payload: CoinbaseExchangeRatesProps;
}

// ------- Revoke and Delete Token -------- //

interface DisconnectAccountPending {
  type: typeof CoinbaseActionTypes.DISCONNECT_ACCOUNT_PENDING;
}

interface DisconnectAccountSuccess {
  type: typeof CoinbaseActionTypes.DISCONNECT_ACCOUNT_SUCCESS;
}

// ------- Access Token -------- //

interface AccessTokenPending {
  type: typeof CoinbaseActionTypes.ACCESS_TOKEN_PENDING;
}

interface AccessTokenSuccess {
  type: typeof CoinbaseActionTypes.ACCESS_TOKEN_SUCCESS;
  payload: {env: CoinbaseEnvironment; token: CoinbaseTokenProps};
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
  payload: {env: CoinbaseEnvironment; token: CoinbaseTokenProps};
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
  payload: {env: CoinbaseEnvironment; user: CoinbaseUserProps};
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
  payload: {
    env: CoinbaseEnvironment;
    balance: number;
    accounts: CoinbaseAccountProps[];
  };
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
  payload: {env: CoinbaseEnvironment; txs: CoinbaseTransactionsByAccountProps};
}

interface TransactionsFailed {
  type: typeof CoinbaseActionTypes.TRANSACTIONS_FAILED;
  payload: CoinbaseErrorsProps;
}

// ------- Address -------- //

interface CreateAddressPending {
  type: typeof CoinbaseActionTypes.CREATE_ADDRESS_PENDING;
}

interface CreateAddressSuccess {
  type: typeof CoinbaseActionTypes.CREATE_ADDRESS_SUCCESS;
}

interface CreateAddressFailed {
  type: typeof CoinbaseActionTypes.CREATE_ADDRESS_FAILED;
  payload: CoinbaseErrorsProps;
}

// ------- Send Transaction -------- //

interface SendTransactionPending {
  type: typeof CoinbaseActionTypes.SEND_TRANSACTION_PENDING;
}

interface SendTransactionSuccess {
  type: typeof CoinbaseActionTypes.SEND_TRANSACTION_SUCCESS;
}

interface SendTransactionFailed {
  type: typeof CoinbaseActionTypes.SEND_TRANSACTION_FAILED;
  payload: CoinbaseErrorsProps;
}

interface ClearSendTransactionStatus {
  type: typeof CoinbaseActionTypes.CLEAR_SEND_TRANSACTION_STATUS;
}

// ------- Pay Invoice -------- //

interface PayInvoicePending {
  type: typeof CoinbaseActionTypes.PAY_INVOICE_PENDING;
}

interface PayInvoiceSuccess {
  type: typeof CoinbaseActionTypes.PAY_INVOICE_SUCCESS;
}

interface PayInvoiceFailed {
  type: typeof CoinbaseActionTypes.PAY_INVOICE_FAILED;
  payload: CoinbaseErrorsProps;
}

// ------- Errors -------- //

interface ClearErrorStatus {
  type: typeof CoinbaseActionTypes.CLEAR_ERROR_STATUS;
}

// ------- Settings -------- //

interface ToggleHideCoinbaseTotalBalance {
  type: typeof CoinbaseActionTypes.TOGGLE_HIDE_TOTAL_BALANCE;
  payload: boolean;
}

interface SetBlockchainNetwork {
  type: typeof CoinbaseActionTypes.BLOCKCHAIN_NETWORK;
  payload: EVM_CHAINS;
}

export type CoinbaseActionType =
  | ExchangeRatesPending
  | ExchangeRatesSuccess
  | DisconnectAccountPending
  | DisconnectAccountSuccess
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
  | TransactionsFailed
  | CreateAddressPending
  | CreateAddressSuccess
  | CreateAddressFailed
  | SendTransactionPending
  | SendTransactionSuccess
  | SendTransactionFailed
  | ClearSendTransactionStatus
  | PayInvoicePending
  | PayInvoiceSuccess
  | PayInvoiceFailed
  | ClearErrorStatus
  | ToggleHideCoinbaseTotalBalance
  | SetBlockchainNetwork;

import {
  CoinbaseAccountProps,
  CoinbaseErrorsProps,
  CoinbaseExchangeRatesProps,
  CoinbaseTokenProps,
  CoinbaseTransactionsByAccountProps,
  CoinbaseUserProps,
} from '../../api/coinbase/coinbase.types';
import {
  CoinbaseActionType,
  CoinbaseActionTypes,
  ApiLoading,
  GetAccessTokenStatus,
  GetRefreshTokenStatus,
  GetAccountsStatus,
  RevokeTokenStatus,
  GetUserStatus,
  GetExchangeRatesStatus,
  GetTransactionsStatus,
} from './coinbase.types';

export const CoinbaseReduxPersistBlackList: (keyof CoinbaseState)[] = [
  'isApiLoading',
  'getExchangeRatesStatus',
  'revokeTokenStatus',
  'revokeTokenError',
  'getAccessTokenStatus',
  'getAccessTokenError',
  'getRefreshTokenStatus',
  'getRefreshTokenError',
  'getUserStatus',
  'getUserError',
  'getAccountsStatus',
  'getAccountsError',
  'getTransactionsStatus',
  'getTransactionsError',
];

export interface CoinbaseState {
  isApiLoading: ApiLoading;
  getExchangeRatesStatus: GetExchangeRatesStatus;
  revokeTokenStatus: RevokeTokenStatus;
  revokeTokenError: CoinbaseErrorsProps | null;
  getAccessTokenStatus: GetAccessTokenStatus;
  getAccessTokenError: CoinbaseErrorsProps | null;
  getRefreshTokenStatus: GetRefreshTokenStatus;
  getRefreshTokenError: CoinbaseErrorsProps | null;
  getUserStatus: GetUserStatus;
  getUserError: CoinbaseErrorsProps | null;
  getAccountsStatus: GetAccountsStatus;
  getAccountsError: CoinbaseErrorsProps | null;
  getTransactionsStatus: GetTransactionsStatus;
  getTransactionsError: CoinbaseErrorsProps | null;
  token: CoinbaseTokenProps | null;
  user: CoinbaseUserProps | null;
  accounts: CoinbaseAccountProps[] | null;
  transactions: CoinbaseTransactionsByAccountProps | null;
  balance: number | null;
  exchangeRates: CoinbaseExchangeRatesProps | null;
}

const initialState: CoinbaseState = {
  isApiLoading: false,
  getExchangeRatesStatus: null,
  revokeTokenStatus: null,
  revokeTokenError: null,
  getAccessTokenStatus: null,
  getAccessTokenError: null,
  getRefreshTokenStatus: null,
  getRefreshTokenError: null,
  getUserStatus: null,
  getUserError: null,
  getAccountsStatus: null,
  getAccountsError: null,
  getTransactionsStatus: null,
  getTransactionsError: null,
  token: null,
  user: null,
  accounts: null,
  transactions: null,
  balance: null,
  exchangeRates: null,
};

export const coinbaseReducer = (
  state: CoinbaseState = initialState,
  action: CoinbaseActionType,
) => {
  switch (action.type) {
    // ------- Exchange Rates -------- //

    case CoinbaseActionTypes.EXCHANGE_RATES_PENDING:
      state.isApiLoading = true;
      return {...state};
    case CoinbaseActionTypes.EXCHANGE_RATES_SUCCESS:
      state.isApiLoading = false;
      state.getExchangeRatesStatus = 'success';
      state.exchangeRates = action.payload;
      return {...state};
    case CoinbaseActionTypes.EXCHANGE_RATES_FAILED:
      state.isApiLoading = false;
      state.getExchangeRatesStatus = 'failed';
      state.exchangeRates = null;
      return {...state};

    // ------- Revoke and Delete Token -------- //

    case CoinbaseActionTypes.DISCONNECT_ACCOUNT_PENDING:
      state.isApiLoading = true;
      return {...state};
    case CoinbaseActionTypes.DISCONNECT_ACCOUNT_SUCCESS:
      state.isApiLoading = false;
      state.revokeTokenStatus = 'success';
      state.revokeTokenError = null;
      state = initialState; // Delete everything
      return {...state};
    case CoinbaseActionTypes.DISCONNECT_ACCOUNT_FAILED:
      state.isApiLoading = false;
      state.revokeTokenStatus = 'failed';
      state.revokeTokenError = action.payload;
      return {...state};

    // ------- Access Token -------- //

    case CoinbaseActionTypes.ACCESS_TOKEN_PENDING:
      state.isApiLoading = true;
      return {...state};
    case CoinbaseActionTypes.ACCESS_TOKEN_SUCCESS:
      state.isApiLoading = false;
      state.getAccessTokenStatus = 'success';
      state.token = action.payload;
      return {...state};
    case CoinbaseActionTypes.ACCESS_TOKEN_FAILED:
      state.isApiLoading = false;
      state.getAccessTokenStatus = 'failed';
      state.getAccessTokenError = action.payload;
      return {...state};

    // ------- Refresh Token -------- //

    case CoinbaseActionTypes.REFRESH_TOKEN_PENDING:
      state.isApiLoading = true;
      return {...state};
    case CoinbaseActionTypes.REFRESH_TOKEN_SUCCESS:
      state.isApiLoading = false;
      state.getRefreshTokenStatus = 'success';
      state.token = action.payload;
      return {...state};
    case CoinbaseActionTypes.REFRESH_TOKEN_FAILED:
      state.isApiLoading = false;
      state.getRefreshTokenStatus = 'failed';
      state.getRefreshTokenError = action.payload;
      return {...state};

    // ------- User Data -------- //

    case CoinbaseActionTypes.USER_PENDING:
      state.isApiLoading = true;
      return {...state};
    case CoinbaseActionTypes.USER_SUCCESS:
      state.isApiLoading = false;
      state.getUserStatus = 'success';
      state.user = action.payload;
      return {...state};
    case CoinbaseActionTypes.USER_FAILED:
      state.isApiLoading = false;
      state.getUserStatus = 'failed';
      state.getUserError = action.payload;
      return {...state};

    // ------- Accounts (Wallets) -------- //

    case CoinbaseActionTypes.ACCOUNTS_PENDING:
      state.isApiLoading = true;
      return {...state};
    case CoinbaseActionTypes.ACCOUNTS_SUCCESS:
      state.isApiLoading = false;
      state.getAccountsStatus = 'success';
      state.accounts = action.payload.accounts;
      state.balance = action.payload.balance;
      return {...state};
    case CoinbaseActionTypes.ACCOUNTS_FAILED:
      state.isApiLoading = false;
      state.getAccessTokenStatus = 'failed';
      state.getAccountsError = action.payload;
      return {...state};

    // ------- Transactions (by Account) -------- //

    case CoinbaseActionTypes.TRANSACTIONS_PENDING:
      state.isApiLoading = true;
      return {...state};
    case CoinbaseActionTypes.TRANSACTIONS_SUCCESS:
      state.isApiLoading = false;
      state.getTransactionsStatus = 'success';
      state.transactions = action.payload;
      return {...state};
    case CoinbaseActionTypes.TRANSACTIONS_FAILED:
      state.isApiLoading = false;
      state.getTransactionsStatus = 'failed';
      state.getTransactionsError = action.payload;
      return {...state};

    default:
      return {...state};
  }
};

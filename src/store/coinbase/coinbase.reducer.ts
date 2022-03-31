import {
  CoinbaseAccountProps,
  CoinbaseErrorsProps,
  CoinbaseExchangeRatesProps,
  CoinbaseTokenProps,
  CoinbaseTransactionsByAccountProps,
  CoinbaseUserProps,
  CoinbaseEnvironment,
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
  CreateAddressStatus,
  SendTransactionStatus,
  PayInvoiceStatus,
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
  'createAddressStatus',
  'createAddressError',
  'sendTransactionStatus',
  'sendTransactionError',
  'payInvoiceStatus',
  'payInvoiceError',
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
  createAddressStatus: CreateAddressStatus;
  createAddressError: CoinbaseErrorsProps | null;
  sendTransactionStatus: SendTransactionStatus;
  sendTransactionError: CoinbaseErrorsProps | null;
  payInvoiceStatus: PayInvoiceStatus;
  payInvoiceError: CoinbaseErrorsProps | null;
  exchangeRates: CoinbaseExchangeRatesProps | null;
  token: {
    [key in CoinbaseEnvironment]: CoinbaseTokenProps | null;
  };
  user: {
    [key in CoinbaseEnvironment]: CoinbaseUserProps | null;
  };
  accounts: {
    [key in CoinbaseEnvironment]: CoinbaseAccountProps[] | null;
  };
  transactions: {
    [key in CoinbaseEnvironment]: CoinbaseTransactionsByAccountProps | null;
  };
  balance: {
    [key in CoinbaseEnvironment]: number | null;
  };
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
  createAddressStatus: null,
  createAddressError: null,
  sendTransactionStatus: null,
  sendTransactionError: null,
  payInvoiceStatus: null,
  payInvoiceError: null,
  exchangeRates: null,
  token: {
    [CoinbaseEnvironment.production]: null,
    [CoinbaseEnvironment.sandbox]: null,
  },
  user: {
    [CoinbaseEnvironment.production]: null,
    [CoinbaseEnvironment.sandbox]: null,
  },
  accounts: {
    [CoinbaseEnvironment.production]: null,
    [CoinbaseEnvironment.sandbox]: null,
  },
  transactions: {
    [CoinbaseEnvironment.production]: null,
    [CoinbaseEnvironment.sandbox]: null,
  },
  balance: {
    [CoinbaseEnvironment.production]: null,
    [CoinbaseEnvironment.sandbox]: null,
  },
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
      return {
        ...state,
        isApiLoading: false,
        getAccessTokenStatus: 'success',
        token: {
          ...state.token,
          [action.payload.env]: action.payload.token,
        },
      };
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
      return {
        ...state,
        isApiLoading: false,
        getRefreshTokenStatus: 'success',
        token: {
          ...state.token,
          [action.payload.env]: action.payload.token,
        },
      };
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
      return {
        ...state,
        isApiLoading: false,
        getUserStatus: 'success',
        user: {
          ...state.user,
          [action.payload.env]: action.payload.user,
        },
      };
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
      return {
        ...state,
        isApiLoading: false,
        getAccountsStatus: 'success',
        accounts: {
          ...state.accounts,
          [action.payload.env]: action.payload.accounts,
        },
        balance: {
          ...state.balance,
          [action.payload.env]: action.payload.balance,
        },
      };
    case CoinbaseActionTypes.ACCOUNTS_FAILED:
      state.isApiLoading = false;
      state.getAccountsStatus = 'failed';
      state.getAccountsError = action.payload;
      return {...state};

    // ------- Transactions (by Account) -------- //

    case CoinbaseActionTypes.TRANSACTIONS_PENDING:
      state.isApiLoading = true;
      return {...state};
    case CoinbaseActionTypes.TRANSACTIONS_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        getTransactionsStatus: 'success',
        transactions: {
          ...state.transactions,
          [action.payload.env]: action.payload.txs,
        },
      };
    case CoinbaseActionTypes.TRANSACTIONS_FAILED:
      state.isApiLoading = false;
      state.getTransactionsStatus = 'failed';
      state.getTransactionsError = action.payload;
      return {...state};

    // ------- Address -------- //

    case CoinbaseActionTypes.CREATE_ADDRESS_PENDING:
      state.isApiLoading = true;
      return {...state};
    case CoinbaseActionTypes.CREATE_ADDRESS_SUCCESS:
      state.isApiLoading = false;
      state.createAddressStatus = 'success';
      return {...state};
    case CoinbaseActionTypes.CREATE_ADDRESS_FAILED:
      state.isApiLoading = false;
      state.createAddressStatus = 'failed';
      state.createAddressError = action.payload;
      return {...state};

    // ------- Send Transaction -------- //

    case CoinbaseActionTypes.SEND_TRANSACTION_PENDING:
      state.isApiLoading = true;
      return {...state};
    case CoinbaseActionTypes.SEND_TRANSACTION_SUCCESS:
      state.isApiLoading = false;
      state.sendTransactionStatus = 'success';
      return {...state};
    case CoinbaseActionTypes.SEND_TRANSACTION_FAILED:
      state.isApiLoading = false;
      state.sendTransactionStatus = 'failed';
      state.sendTransactionError = action.payload;
      return {...state};

    case CoinbaseActionTypes.CLEAR_SEND_TRANSACTION_STATUS:
      state.sendTransactionStatus = null;
      state.sendTransactionError = null;
      return {...state};

    // ------- Pay Invoice -------- //

    case CoinbaseActionTypes.PAY_INVOICE_PENDING:
      state.isApiLoading = true;
      return {...state};
    case CoinbaseActionTypes.PAY_INVOICE_SUCCESS:
      state.isApiLoading = false;
      state.payInvoiceStatus = 'success';
      return {...state};
    case CoinbaseActionTypes.PAY_INVOICE_FAILED:
      state.isApiLoading = false;
      state.payInvoiceStatus = 'failed';
      state.payInvoiceError = action.payload;
      return {...state};

    default:
      return {...state};
  }
};

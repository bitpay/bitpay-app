import {COINBASE_ENV} from '../../api/coinbase/coinbase.constants';
import {
  CoinbaseAccountProps,
  CoinbaseEnvironment,
  CoinbaseErrorsProps,
  CoinbaseExchangeRatesProps,
  CoinbaseSupportedNetwork,
  CoinbaseTokenProps,
  CoinbaseTransactionsByAccountProps,
  CoinbaseUserProps,
} from '../../api/coinbase/coinbase.types';
import {EVM_CHAINS} from '../../constants/currencies';
import {
  ApiLoading,
  CoinbaseActionType,
  CoinbaseActionTypes,
  CreateAddressStatus,
  GetAccessTokenStatus,
  GetAccountsStatus,
  GetRefreshTokenStatus,
  GetTransactionsStatus,
  GetUserStatus,
  PayInvoiceStatus,
  SendTransactionStatus,
} from './coinbase.types';

export const CoinbaseReduxPersistBlackList: (keyof CoinbaseState)[] = [
  'isApiLoading',
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
  hideTotalBalance: boolean;
  blockchainNetwork: EVM_CHAINS;
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
  hideTotalBalance: false,
  // Other chain is not supported by Coinbase API
  blockchainNetwork: CoinbaseSupportedNetwork.ethereum,
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
): CoinbaseState => {
  switch (action.type) {
    // ------- Exchange Rates -------- //

    case CoinbaseActionTypes.EXCHANGE_RATES_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };
    case CoinbaseActionTypes.EXCHANGE_RATES_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        exchangeRates: action.payload,
      };

    // ------- Revoke and Delete Token -------- //

    case CoinbaseActionTypes.DISCONNECT_ACCOUNT_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };
    case CoinbaseActionTypes.DISCONNECT_ACCOUNT_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        getAccessTokenStatus: null,
        getRefreshTokenStatus: null,
        getAccountsStatus: null,
        getUserStatus: null,
        getTransactionsStatus: null,
        createAddressStatus: null,
        sendTransactionStatus: null,
        payInvoiceStatus: null,
        token: {
          ...state.token,
          [COINBASE_ENV]: null,
        },
        user: {
          ...state.user,
          [COINBASE_ENV]: null,
        },
        accounts: {
          ...state.accounts,
          [COINBASE_ENV]: null,
        },
        transactions: {
          ...state.transactions,
          [COINBASE_ENV]: null,
        },
        balance: {
          ...state.balance,
          [COINBASE_ENV]: null,
        },
      };

    // ------- Access Token -------- //

    case CoinbaseActionTypes.ACCESS_TOKEN_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };
    case CoinbaseActionTypes.ACCESS_TOKEN_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        getAccessTokenStatus: 'success',
        getAccessTokenError: null,
        token: {
          ...state.token,
          [action.payload.env]: action.payload.token,
        },
      };
    case CoinbaseActionTypes.ACCESS_TOKEN_FAILED:
      return {
        ...state,
        isApiLoading: false,
        getAccessTokenStatus: 'failed',
        getAccessTokenError: action.payload,
      };

    // ------- Refresh Token -------- //

    case CoinbaseActionTypes.REFRESH_TOKEN_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };
    case CoinbaseActionTypes.REFRESH_TOKEN_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        getRefreshTokenStatus: 'success',
        getRefreshTokenError: null,
        token: {
          ...state.token,
          [action.payload.env]: action.payload.token,
        },
      };
    case CoinbaseActionTypes.REFRESH_TOKEN_FAILED:
      return {
        ...state,
        isApiLoading: false,
        getRefreshTokenStatus: 'failed',
        getRefreshTokenError: action.payload,
      };

    // ------- User Data -------- //

    case CoinbaseActionTypes.USER_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };
    case CoinbaseActionTypes.USER_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        getUserStatus: 'success',
        getUserError: null,
        user: {
          ...state.user,
          [action.payload.env]: action.payload.user,
        },
      };
    case CoinbaseActionTypes.USER_FAILED:
      return {
        ...state,
        isApiLoading: false,
        getUserStatus: 'failed',
        getUserError: action.payload,
      };

    // ------- Accounts (Wallets) -------- //

    case CoinbaseActionTypes.ACCOUNTS_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };
    case CoinbaseActionTypes.ACCOUNTS_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        getAccountsStatus: 'success',
        getAccountsError: null,
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
      return {
        ...state,
        isApiLoading: false,
        getAccountsStatus: 'failed',
        getAccountsError: action.payload,
      };

    // ------- Transactions (by Account) -------- //

    case CoinbaseActionTypes.TRANSACTIONS_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };
    case CoinbaseActionTypes.TRANSACTIONS_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        getTransactionsStatus: 'success',
        getTransactionsError: null,
        transactions: {
          ...state.transactions,
          [action.payload.env]: action.payload.txs,
        },
      };
    case CoinbaseActionTypes.TRANSACTIONS_FAILED:
      return {
        ...state,
        isApiLoading: false,
        getTransactionsStatus: 'failed',
        getTransactionsError: action.payload,
      };

    // ------- Address -------- //

    case CoinbaseActionTypes.CREATE_ADDRESS_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };
    case CoinbaseActionTypes.CREATE_ADDRESS_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        createAddressError: null,
        createAddressStatus: 'success',
      };
    case CoinbaseActionTypes.CREATE_ADDRESS_FAILED:
      return {
        ...state,
        isApiLoading: false,
        createAddressStatus: 'failed',
        createAddressError: action.payload,
      };

    // ------- Send Transaction -------- //

    case CoinbaseActionTypes.SEND_TRANSACTION_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };
    case CoinbaseActionTypes.SEND_TRANSACTION_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        sendTransactionStatus: 'success',
        sendTransactionError: null,
      };
    case CoinbaseActionTypes.SEND_TRANSACTION_FAILED:
      return {
        ...state,
        isApiLoading: false,
        sendTransactionStatus: 'failed',
        sendTransactionError: action.payload,
      };

    case CoinbaseActionTypes.CLEAR_SEND_TRANSACTION_STATUS:
      return {
        ...state,
        sendTransactionStatus: null,
        sendTransactionError: null,
      };

    // ------- Pay Invoice -------- //

    case CoinbaseActionTypes.PAY_INVOICE_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };
    case CoinbaseActionTypes.PAY_INVOICE_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        payInvoiceStatus: 'success',
        payInvoiceError: null,
      };
    case CoinbaseActionTypes.PAY_INVOICE_FAILED:
      return {
        ...state,
        isApiLoading: false,
        payInvoiceStatus: 'failed',
        payInvoiceError: action.payload,
      };

    // ------- Errors -------- //

    case CoinbaseActionTypes.CLEAR_ERROR_STATUS:
      return {
        ...state,
        getAccessTokenStatus: null,
        getAccessTokenError: null,
        getRefreshTokenStatus: null,
        getRefreshTokenError: null,
        getAccountsStatus: null,
        getAccountsError: null,
        getUserStatus: null,
        getUserError: null,
        getTransactionsStatus: null,
        getTransactionsError: null,
        createAddressStatus: null,
        createAddressError: null,
        sendTransactionStatus: null,
        sendTransactionError: null,
        payInvoiceStatus: null,
        payInvoiceError: null,
      };

    // ------- Settings -------- //
    case CoinbaseActionTypes.TOGGLE_HIDE_TOTAL_BALANCE:
      return {
        ...state,
        hideTotalBalance: action.payload,
      };

    case CoinbaseActionTypes.BLOCKCHAIN_NETWORK:
      return {
        ...state,
        blockchainNetwork: action.payload,
      };

    default:
      return {...state};
  }
};

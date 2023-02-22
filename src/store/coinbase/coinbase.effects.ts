import {Effect} from '../index';
import {
  exchangeRatesPending,
  exchangeRatesSuccess,
  accessTokenPending,
  accessTokenSuccess,
  accessTokenFailed,
  refreshTokenPending,
  refreshTokenSuccess,
  refreshTokenFailed,
  revokeTokenPending,
  revokeTokenSuccess,
  userPending,
  userSuccess,
  userFailed,
  accountsPending,
  accountsSuccess,
  accountsFailed,
  transactionsPending,
  transactionsSuccess,
  transactionsFailed,
  createAddressPending,
  createAddressSuccess,
  createAddressFailed,
  sendTransactionPending,
  sendTransactionSuccess,
  sendTransactionFailed,
  clearSendTransactionStatus,
  payInvoicePending,
  payInvoiceSuccess,
  payInvoiceFailed,
} from './index';

import {includes} from 'lodash';

import CoinbaseAPI from '../../api/coinbase';
import {
  CoinbaseAccountProps,
  CoinbaseErrorsProps,
  CoinbaseExchangeRatesProps,
  CoinbaseTokenProps,
  CoinbaseTransactionsByAccountProps,
  CoinbaseTransactionsProps,
} from '../../api/coinbase/coinbase.types';
import {COINBASE_ENV} from '../../api/coinbase/coinbase.constants';

import {SupportedCurrencyOptions} from '../../constants/SupportedCurrencyOptions';
import {LogActions} from '../log';
import {setHomeCarouselConfig} from '../app/app.actions';
import {getCurrencyCodeFromCoinAndChain} from '../../navigation/bitpay-id/utils/bitpay-id-utils';
import {Analytics} from '../analytics/analytics.effects';

const isRevokedTokenError = (error: CoinbaseErrorsProps): boolean => {
  return error?.errors?.some(err => err.id === 'revoked_token');
};

const isExpiredTokenError = (error: CoinbaseErrorsProps): boolean => {
  return error?.errors?.some(err => err.id === 'expired_token');
};

export const isInvalidTokenError = (error: CoinbaseErrorsProps): boolean => {
  return error?.errors?.some(err => err.id === 'invalid_token');
};

export const coinbaseErrorIncludesErrorParams = (
  error: CoinbaseErrorsProps | any,
  errorParams: {
    id?: string;
    message?: string;
  },
): boolean => {
  return error?.errors?.some((err: any) =>
    err && errorParams.id && errorParams.message
      ? err.id === errorParams.id && err.message === errorParams.message
      : err.id === errorParams.id || err.message === errorParams.message,
  );
};

export const coinbaseParseErrorToString = (
  error: CoinbaseErrorsProps | any,
): string => {
  if (typeof error === 'string') {
    return error;
  } else if (error?.error_description) {
    return error.error_description;
  } else if (error?.errors) {
    let message = '';
    for (let i = 0; i < error.errors.length; i++) {
      message = message + (i > 0 ? '. ' : '') + error.errors[i].message;
    }
    return message;
  } else {
    return 'Network Error';
  }
};

export const getTransactionCurrencyForPayInvoice =
  (currency: string): Effect<string> =>
  (dispatch, getState) => {
    const {COINBASE} = getState();
    return getCurrencyCodeFromCoinAndChain(
      currency,
      COINBASE.blockchainNetwork,
    );
  };

export const coinbaseInitialize =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();
    dispatch(LogActions.info('coinbaseInitialize: starting...'));
    if (!COINBASE.token[COINBASE_ENV]) {
      dispatch(
        LogActions.info('coinbaseInitialize: not linked for ' + COINBASE_ENV),
      );
      return;
    }
    await dispatch(coinbaseGetUser());
    await dispatch(coinbaseUpdateExchangeRate());
    await dispatch(coinbaseGetAccountsAndBalance());
    dispatch(LogActions.info('coinbaseInitialize: success'));
  };

export const coinbaseUpdateExchangeRate =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {APP} = getState();
    const selectedCurrency: string = APP.defaultAltCurrency.isoCode || 'USD';
    try {
      dispatch(exchangeRatesPending());
      const exchangeRates = await CoinbaseAPI.getExchangeRates(
        selectedCurrency,
      );
      dispatch(exchangeRatesSuccess(exchangeRates));
    } catch (error: CoinbaseErrorsProps | any) {
      dispatch(
        LogActions.warn(
          'coinbaseUpdateExchangeRate: ' + coinbaseParseErrorToString(error),
        ),
      );
    }
  };

export const coinbaseLinkAccount =
  (code: string, state: string): Effect<Promise<any>> =>
  async dispatch => {
    if (CoinbaseAPI.getOauthStateCode() !== state) {
      const error: CoinbaseErrorsProps = {
        errors: [
          {
            id: 'STATE_INCORRECT',
            message:
              'Looks like you are trying to connect using a different device.',
          },
        ],
      };
      dispatch(accessTokenFailed(error));
      throw error;
    }

    try {
      dispatch(LogActions.info('coinbaseLinkAccount: starting...'));
      dispatch(accessTokenPending());
      const newToken = await CoinbaseAPI.getAccessToken(code);
      dispatch(accessTokenSuccess(COINBASE_ENV, newToken));
      dispatch(LogActions.info('coinbaseLinkAccount: success'));
      await dispatch(coinbaseGetUser());
      await dispatch(coinbaseUpdateExchangeRate());
      dispatch(setHomeCarouselConfig({id: 'coinbaseBalanceCard', show: true}));
      dispatch(coinbaseGetAccountsAndBalance());
      dispatch(
        Analytics.track('Connected Wallet', {
          source: 'coinbase',
        }),
      );
    } catch (error: CoinbaseErrorsProps | any) {
      dispatch(accessTokenFailed(error));
      dispatch(
        LogActions.error(
          'coinbaseLinkAccount: ' + coinbaseParseErrorToString(error),
        ),
      );
    }
  };

export const coinbaseRefreshToken =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(LogActions.info('coinbaseRefreshtoken: starting...'));
      dispatch(refreshTokenPending());
      const newToken = await CoinbaseAPI.getRefreshToken(
        COINBASE.token[COINBASE_ENV],
      );
      dispatch(refreshTokenSuccess(COINBASE_ENV, newToken));
      dispatch(LogActions.info('coinbaseRefreshtoken: success'));
    } catch (error: CoinbaseErrorsProps | any) {
      dispatch(refreshTokenFailed(error));
      dispatch(
        LogActions.error(
          'coinbaseRefreshToken: ' + coinbaseParseErrorToString(error),
        ),
      );
    }
  };

export const coinbaseDisconnectAccount =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE, APP} = getState();

    dispatch(revokeTokenPending());
    dispatch(
      setHomeCarouselConfig(
        APP.homeCarouselConfig.filter(
          item => item?.id !== 'coinbaseBalanceCard',
        ),
      ),
    );
    if (COINBASE.token[COINBASE_ENV]) {
      await CoinbaseAPI.revokeToken(COINBASE.token[COINBASE_ENV]);
    }
    dispatch(revokeTokenSuccess()); // Remove accounts
    dispatch(LogActions.info('coinbaseDisconnectAccount: success'));
  };

export const coinbaseGetUser =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(LogActions.debug('coinbaseGetUser: starting...'));
      dispatch(userPending());
      const user = await CoinbaseAPI.getCurrentUser(
        COINBASE.token[COINBASE_ENV],
      );
      dispatch(userSuccess(COINBASE_ENV, user));
      dispatch(LogActions.debug('coinbaseGetUser: success'));
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbaseGetUser: Token expired. Getting new token...',
          ),
        );
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbaseGetUser());
      } else if (isRevokedTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbaseGetUser: Token revoked. Should re-connect...',
          ),
        );
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(userFailed(error));
        dispatch(
          LogActions.error(
            'coinbaseGetUser: ' + coinbaseParseErrorToString(error),
          ),
        );
      }
    }
  };

export const coinbaseGetFiatAmount = (
  amount: number,
  currency: string,
  exchangeRates: CoinbaseExchangeRatesProps | null,
): number => {
  if (!exchangeRates) {
    return 0.0;
  }
  const rate = exchangeRates?.data.rates[currency];
  return amount / Number(rate);
};

export const coinbaseGetAccountsAndBalance =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    const supportedCurrency: string[] = [];
    for (let i = 0; i < SupportedCurrencyOptions.length; i++) {
      supportedCurrency.push(SupportedCurrencyOptions[i].currencyAbbreviation);
    }

    try {
      dispatch(LogActions.debug('coinbaseGetAccountsAndBalance: starting...'));
      dispatch(accountsPending());
      const accounts = await CoinbaseAPI.getAccounts(
        COINBASE.token[COINBASE_ENV],
      );

      // Calculate balance

      let availableBalance: number = 0.0;
      let availableAccounts: CoinbaseAccountProps[] = [];

      for (let i = 0; i < accounts.data.length; i++) {
        if (
          accounts.data[i].type === 'wallet' &&
          accounts.data[i].balance &&
          accounts.data[i].balance.currency &&
          includes(
            supportedCurrency,
            accounts.data[i].balance.currency.toLowerCase(),
          )
        ) {
          availableAccounts.push(accounts.data[i]);
          if (COINBASE.exchangeRates) {
            availableBalance =
              availableBalance +
              coinbaseGetFiatAmount(
                accounts.data[i].balance.amount,
                accounts.data[i].balance.currency,
                COINBASE.exchangeRates,
              );
          }
        }
      }

      dispatch(
        accountsSuccess(COINBASE_ENV, availableAccounts, availableBalance),
      );
      dispatch(LogActions.debug('coinbaseGetAccountsAndBalance: success'));
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbaseGetAccountsAndBalance: Token expired. Getting new token...',
          ),
        );
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbaseGetAccountsAndBalance());
      } else if (isRevokedTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbaseGetAccountsAndBalance: Token revoked. Should re-connect...',
          ),
        );
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(accountsFailed(error));
        dispatch(
          LogActions.error(
            'coinbaseGetAccountsAndBalance: ' +
              coinbaseParseErrorToString(error),
          ),
        );
      }
    }
  };

export const coinbaseGetTransactionsByAccount =
  (
    accountId: string,
    forceUpdate?: boolean,
    nextStartingAfter?: string,
  ): Effect<Promise<any>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();
    const token = COINBASE.token[COINBASE_ENV];
    let transactionsFromStorage =
      COINBASE.transactions[COINBASE_ENV]?.[accountId];

    if (!token) {
      return;
    }

    // Read from cache
    if (!forceUpdate && !nextStartingAfter && transactionsFromStorage) {
      return;
    }

    if (forceUpdate) {
      nextStartingAfter = undefined;
    }

    try {
      dispatch(
        LogActions.debug('coinbaseGetTransactionsByAccount: starting...'),
      );
      dispatch(transactionsPending());
      const _transactionsFromApi = await getTransactionsByAccount(
        accountId,
        token,
        nextStartingAfter || null,
      );
      if (transactionsFromStorage && nextStartingAfter) {
        const dataFromStorage = transactionsFromStorage.data;
        const allData = dataFromStorage.concat(_transactionsFromApi.data);
        transactionsFromStorage.data = [...new Set(allData.flat())]; // Prevent duplicated values
        transactionsFromStorage.pagination = _transactionsFromApi.pagination;
      } else {
        transactionsFromStorage = _transactionsFromApi;
      }
      dispatch(
        transactionsSuccess(COINBASE_ENV, accountId, transactionsFromStorage),
      );
      dispatch(LogActions.debug('coinbaseGetTransactionsByAccount: success'));
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbaseGetTransactionsByAccount: Token expired. Getting new token...',
          ),
        );
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbaseGetTransactionsByAccount(accountId));
      } else if (isRevokedTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbaseGetTransactionsByAccount: Token revoked. Should re-connect...',
          ),
        );
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(transactionsFailed(error));
        dispatch(
          LogActions.error(
            'coinbaseGetTransactionsByAccount: ' +
              coinbaseParseErrorToString(error),
          ),
        );
        const txs: CoinbaseTransactionsByAccountProps =
          COINBASE.transactions[COINBASE_ENV] || {};
        dispatch(transactionsSuccess(COINBASE_ENV, accountId, txs[accountId]));
      }
    }
  };

const getTransactionsByAccount = (
  accountId: string,
  token: CoinbaseTokenProps,
  nextStartingAfter?: string | null,
): Promise<CoinbaseTransactionsProps> => {
  return new Promise(async (resolve, reject) => {
    try {
      const transactions = await CoinbaseAPI.getTransactions(
        accountId,
        token,
        nextStartingAfter,
      );
      return resolve(transactions);
    } catch (error: CoinbaseErrorsProps | any) {
      return reject(error);
    }
  });
};

export const coinbaseCreateAddress =
  (accountId: string): Effect<Promise<string | undefined>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(LogActions.debug('coinbaseCreateAddress: starting...'));
      dispatch(createAddressPending());
      const addressData = await CoinbaseAPI.getNewAddress(
        accountId,
        COINBASE.token[COINBASE_ENV],
      );
      dispatch(createAddressSuccess());
      dispatch(LogActions.debug('coinbaseCreateAddress: success'));
      return addressData.data.address;
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbaseCreateAddress: Token expired. Getting new token...',
          ),
        );
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbaseCreateAddress(accountId));
      } else if (isRevokedTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbaseCreateAddress: Token revoked. Should re-connect...',
          ),
        );
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(createAddressFailed(error));
        dispatch(
          LogActions.error(
            'coinbaseCreateAddress: ' + coinbaseParseErrorToString(error),
          ),
        );
      }
    }
  };

export const coinbaseSendTransaction =
  (accountId: string, tx: any, code?: string): Effect<Promise<any>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(LogActions.info('coinbaseSendTransaction: starting...'));
      dispatch(sendTransactionPending());
      await CoinbaseAPI.sendTransaction(
        accountId,
        tx,
        COINBASE.token[COINBASE_ENV],
        code,
      );
      dispatch(sendTransactionSuccess());
      dispatch(
        Analytics.track('Sent Crypto', {
          context: 'Coinbase Withdraw Confirm',
          coin: tx?.currency || '',
        }),
      );
      dispatch(LogActions.info('coinbaseSendTransaction: success'));
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbaseSendTransaction: Token expired. Getting new token...',
          ),
        );
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbaseSendTransaction(accountId, tx));
      } else if (isRevokedTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbaseSendTransaction: Token revoked. Should re-connect...',
          ),
        );
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(sendTransactionFailed(error));
        dispatch(
          LogActions.error(
            'coinbaseSendTransaction: ' + coinbaseParseErrorToString(error),
          ),
        );
      }
    }
  };

export const coinbaseClearSendTransactionStatus =
  (): Effect<Promise<any>> => async dispatch => {
    dispatch(clearSendTransactionStatus());
  };

export const coinbasePayInvoice =
  (invoiceId: string, currency: any, code?: string): Effect<Promise<any>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    const transactionCurrency = dispatch(
      getTransactionCurrencyForPayInvoice(currency),
    );

    try {
      dispatch(LogActions.info('coinbasePayInvoice: starting...'));
      dispatch(payInvoicePending());
      await CoinbaseAPI.payInvoice(
        invoiceId,
        transactionCurrency,
        COINBASE.token[COINBASE_ENV],
        code,
      );
      dispatch(payInvoiceSuccess());
      dispatch(LogActions.info('coinbasePayInvoice: success'));
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbasePayInvoice: Token expired. Getting new token...',
          ),
        );
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbasePayInvoice(invoiceId, currency));
        return;
      } else if (isRevokedTokenError(error)) {
        dispatch(
          LogActions.warn(
            'coinbasePayInvoice: Token revoked. Should re-connect...',
          ),
        );
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(payInvoiceFailed(error));
        dispatch(
          LogActions.error(
            'coinbasePayInvoice: ' + coinbaseParseErrorToString(error),
          ),
        );
      }
      const coinbaseErrorString = coinbaseParseErrorToString(error);
      if (coinbaseErrorString) {
        throw new Error(coinbaseErrorString);
      }
      throw error;
    }
  };

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
} from '../../api/coinbase/coinbase.types';
import {COINBASE_ENV} from '../../api/coinbase/coinbase.constants';

import {SupportedCurrencyOptions} from '../../constants/SupportedCurrencyOptions';
import {LogActions} from '../log';
import {setHomeCarouselConfig} from '../app/app.actions';

const isRevokedTokenError = (error: CoinbaseErrorsProps): boolean => {
  return error.errors.some(err => err.id === 'revoked_token');
};

const isExpiredTokenError = (error: CoinbaseErrorsProps): boolean => {
  return error.errors.some(err => err.id === 'expired_token');
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
  } else {
    let message = '';
    for (let i = 0; i < error.errors.length; i++) {
      message = message + (i > 0 ? '. ' : '') + error.errors[i].message;
    }
    return message;
  }
};

export const coinbaseInitialize =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();
    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }
    await dispatch(coinbaseGetUser());
    await dispatch(coinbaseUpdateExchangeRate());
    dispatch(coinbaseGetAccountsAndBalance());
  };

export const coinbaseUpdateExchangeRate =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();
    const nativeCurrency: string =
      COINBASE.user[COINBASE_ENV]?.data.native_currency || 'USD';
    try {
      dispatch(exchangeRatesPending());
      const exchangeRates = await CoinbaseAPI.getExchangeRates(nativeCurrency);
      dispatch(exchangeRatesSuccess(exchangeRates));
    } catch (error: CoinbaseErrorsProps | any) {
      dispatch(LogActions.warn(coinbaseParseErrorToString(error)));
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
      dispatch(accessTokenPending());
      const newToken = await CoinbaseAPI.getAccessToken(code);
      dispatch(accessTokenSuccess(COINBASE_ENV, newToken));
      await dispatch(coinbaseGetUser());
      await dispatch(coinbaseUpdateExchangeRate());
      dispatch(setHomeCarouselConfig({id: 'coinbaseBalanceCard', show: true}));
      dispatch(coinbaseGetAccountsAndBalance());
    } catch (error: CoinbaseErrorsProps | any) {
      dispatch(accessTokenFailed(error));
      dispatch(LogActions.error(coinbaseParseErrorToString(error)));
    }
  };

export const coinbaseRefreshToken =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(refreshTokenPending());
      const newToken = await CoinbaseAPI.getRefreshToken(
        COINBASE.token[COINBASE_ENV],
      );
      dispatch(refreshTokenSuccess(COINBASE_ENV, newToken));
    } catch (error: CoinbaseErrorsProps | any) {
      dispatch(refreshTokenFailed(error));
      dispatch(LogActions.error(coinbaseParseErrorToString(error)));
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
  };

export const coinbaseGetUser =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(userPending());
      const user = await CoinbaseAPI.getCurrentUser(
        COINBASE.token[COINBASE_ENV],
      );
      dispatch(userSuccess(COINBASE_ENV, user));
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(LogActions.warn('Token expired. Getting new token...'));
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbaseGetUser());
      } else if (isRevokedTokenError(error)) {
        dispatch(LogActions.warn('Token revoked. Should re-connect...'));
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(userFailed(error));
        dispatch(LogActions.error(coinbaseParseErrorToString(error)));
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
      supportedCurrency.push(SupportedCurrencyOptions[i].id);
    }

    try {
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
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(LogActions.warn('Token expired. Getting new token...'));
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbaseGetAccountsAndBalance());
      } else if (isRevokedTokenError(error)) {
        dispatch(LogActions.warn('Token revoked. Should re-connect...'));
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(accountsFailed(error));
        dispatch(LogActions.error(coinbaseParseErrorToString(error)));
      }
    }
  };

export const coinbaseGetTransactionsByAccount =
  (accountId: string): Effect<Promise<any>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(transactionsPending());
      const transactions = await CoinbaseAPI.getTransactions(
        accountId,
        COINBASE.token[COINBASE_ENV],
      );
      dispatch(transactionsSuccess(COINBASE_ENV, accountId, transactions));
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(LogActions.warn('Token expired. Getting new token...'));
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbaseGetTransactionsByAccount(accountId));
      } else if (isRevokedTokenError(error)) {
        dispatch(LogActions.warn('Token revoked. Should re-connect...'));
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(transactionsFailed(error));
        dispatch(LogActions.error(coinbaseParseErrorToString(error)));
      }
    }
  };

export const coinbaseCreateAddress =
  (accountId: string): Effect<Promise<string | undefined>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(createAddressPending());
      const addressData = await CoinbaseAPI.getNewAddress(
        accountId,
        COINBASE.token[COINBASE_ENV],
      );
      dispatch(createAddressSuccess());
      return addressData.data.address;
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(LogActions.warn('Token expired. Getting new token...'));
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbaseCreateAddress(accountId));
      } else if (isRevokedTokenError(error)) {
        dispatch(LogActions.warn('Token revoked. Should re-connect...'));
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(createAddressFailed(error));
        dispatch(LogActions.error(coinbaseParseErrorToString(error)));
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
      dispatch(sendTransactionPending());
      await CoinbaseAPI.sendTransaction(
        accountId,
        tx,
        COINBASE.token[COINBASE_ENV],
        code,
      );
      dispatch(sendTransactionSuccess());
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(LogActions.warn('Token expired. Getting new token...'));
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbaseSendTransaction(accountId, tx));
      } else if (isRevokedTokenError(error)) {
        dispatch(LogActions.warn('Token revoked. Should re-connect...'));
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(sendTransactionFailed(error));
        dispatch(LogActions.error(coinbaseParseErrorToString(error)));
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

    try {
      dispatch(payInvoicePending());
      await CoinbaseAPI.payInvoice(
        invoiceId,
        currency,
        COINBASE.token[COINBASE_ENV],
        code,
      );
      dispatch(payInvoiceSuccess());
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        dispatch(LogActions.warn('Token expired. Getting new token...'));
        await dispatch(coinbaseRefreshToken());
        dispatch(coinbasePayInvoice(invoiceId, currency));
        return;
      } else if (isRevokedTokenError(error)) {
        dispatch(LogActions.warn('Token revoked. Should re-connect...'));
        dispatch(coinbaseDisconnectAccount());
      } else {
        dispatch(payInvoiceFailed(error));
        dispatch(LogActions.error(coinbaseParseErrorToString(error)));
      }
      const coinbaseErrorString = coinbaseParseErrorToString(error);
      if (coinbaseErrorString) {
        throw new Error(coinbaseErrorString);
      }
      throw error;
    }
  };

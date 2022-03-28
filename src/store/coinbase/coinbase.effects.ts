import {Effect} from '../index';
import {CoinbaseActions} from './index';

import {includes, filter} from 'lodash';

import CoinbaseAPI from '../../api/coinbase';
import {
  CoinbaseAccountProps,
  CoinbaseErrorsProps,
  CoinbaseExchangeRatesProps,
} from '../../api/coinbase/coinbase.types';
import {COINBASE_ENV} from '../../api/coinbase/coinbase.constants';

import {SupportedCurrencyOptions} from '../../constants/SupportedCurrencyOptions';

const isExpiredTokenError = (error: CoinbaseErrorsProps): boolean => {
  for (let i = 0; i < error.errors.length; i++) {
    if (error.errors[i].id === 'expired_token') {
      return true;
    }
  }
  return false;
};

export const updateCoinbaseData =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();
    if (!COINBASE.token) {
      return;
    }
    await dispatch(getUser());
    await dispatch(setExchangeRate());
    dispatch(getAccountsAndBalance());
  };

export const setExchangeRate =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();
    const nativeCurrency: string =
      COINBASE.user[COINBASE_ENV]?.data.native_currency || 'USD';
    try {
      dispatch(CoinbaseActions.exchangeRatesPending());
      const exchangeRates = await CoinbaseAPI.getExchangeRates(nativeCurrency);
      dispatch(CoinbaseActions.exchangeRatesSuccess(exchangeRates));
    } catch (error: CoinbaseErrorsProps | any) {
      dispatch(CoinbaseActions.exchangeRatesFailed(error));
    }
  };

export const linkCoinbaseAccount =
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
      dispatch(CoinbaseActions.accessTokenFailed(error));
      throw error;
    }

    try {
      dispatch(CoinbaseActions.accessTokenPending());
      const newToken = await CoinbaseAPI.getAccessToken(code);
      dispatch(CoinbaseActions.accessTokenSuccess(COINBASE_ENV, newToken));
      await dispatch(getUser());
      await dispatch(setExchangeRate());
      dispatch(getAccountsAndBalance());
    } catch (error: CoinbaseErrorsProps | any) {
      dispatch(CoinbaseActions.accessTokenFailed(error));
    }
  };

export const refreshToken =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(CoinbaseActions.refreshTokenPending());
      const newToken = await CoinbaseAPI.getRefreshToken(
        COINBASE.token[COINBASE_ENV],
      );
      dispatch(CoinbaseActions.refreshTokenSuccess(COINBASE_ENV, newToken));
    } catch (error: CoinbaseErrorsProps | any) {
      dispatch(CoinbaseActions.refreshTokenFailed(error));
    }
  };

export const disconnectCoinbaseAccount =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();

    dispatch(CoinbaseActions.revokeTokenPending());
    if (COINBASE.token[COINBASE_ENV]) {
      await CoinbaseAPI.revokeToken(COINBASE.token[COINBASE_ENV]);
    }
    dispatch(CoinbaseActions.revokeTokenSuccess()); // Remove accounts
  };

export const getUser =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(CoinbaseActions.userPending());
      const user = await CoinbaseAPI.getCurrentUser(
        COINBASE.token[COINBASE_ENV],
      );
      dispatch(CoinbaseActions.userSuccess(COINBASE_ENV, user));
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        await dispatch(refreshToken());
        dispatch(getUser());
      } else {
        dispatch(CoinbaseActions.userFailed(error));
      }
    }
  };

export const getCoinbaseExchangeRate = (
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

export const getAccountsAndBalance =
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
      dispatch(CoinbaseActions.accountsPending());
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
              getCoinbaseExchangeRate(
                accounts.data[i].balance.amount,
                accounts.data[i].balance.currency,
                COINBASE.exchangeRates,
              );
          }
        }
      }

      dispatch(
        CoinbaseActions.accountsSuccess(
          COINBASE_ENV,
          availableAccounts,
          availableBalance,
        ),
      );
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        await dispatch(refreshToken());
        dispatch(getAccountsAndBalance());
      } else {
        dispatch(CoinbaseActions.accountsFailed(error));
      }
    }
  };

export const getTransactionsByAccount =
  (accountId: string): Effect<Promise<any>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(CoinbaseActions.transactionsPending());
      const transactions = await CoinbaseAPI.getTransactions(
        accountId,
        COINBASE.token[COINBASE_ENV],
      );
      dispatch(
        CoinbaseActions.transactionsSuccess(
          COINBASE_ENV,
          accountId,
          transactions,
        ),
      );
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        await dispatch(refreshToken());
        dispatch(getTransactionsByAccount(accountId));
      } else {
        dispatch(CoinbaseActions.transactionsFailed(error));
      }
    }
  };

export const createAddress =
  (accountId: string): Effect<Promise<any>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(CoinbaseActions.createAddressPending());
      const addressData = await CoinbaseAPI.getNewAddress(
        accountId,
        COINBASE.token[COINBASE_ENV],
      );
      dispatch(CoinbaseActions.createAddressSuccess());
      return addressData.data.address;
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        await dispatch(refreshToken());
        dispatch(createAddress(accountId));
      } else {
        dispatch(CoinbaseActions.createAddressFailed(error));
      }
    }
  };

export const sendTransaction =
  (accountId: string, tx: any, code?: string): Effect<Promise<any>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(CoinbaseActions.sendTransactionPending());
      const addressData = await CoinbaseAPI.sendTransaction(
        accountId,
        tx,
        COINBASE.token[COINBASE_ENV],
        code,
      );
      dispatch(CoinbaseActions.sendTransactionSuccess());
      return addressData.data.address;
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        await dispatch(refreshToken());
        dispatch(sendTransaction(accountId, tx));
      } else {
        dispatch(CoinbaseActions.sendTransactionFailed(error));
      }
    }
  };

export const payInvoice =
  (accountId: string, tx: any, code?: string): Effect<Promise<any>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token[COINBASE_ENV]) {
      return;
    }

    try {
      dispatch(CoinbaseActions.payInvoicePending());
      const addressData = await CoinbaseAPI.payInvoice(
        accountId,
        tx,
        COINBASE.token[COINBASE_ENV],
        code,
      );
      dispatch(CoinbaseActions.payInvoiceSuccess());
      return addressData.data.address;
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        await dispatch(refreshToken());
        dispatch(payInvoice(accountId, tx));
      } else {
        dispatch(CoinbaseActions.payInvoiceFailed(error));
      }
    }
  };

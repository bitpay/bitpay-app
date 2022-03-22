import {Effect} from '../index';
import {CoinbaseActions} from './index';

import {default as _} from 'lodash';

import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {
  showOnGoingProcessModal,
  dismissOnGoingProcessModal,
} from '../app/app.actions';

import CoinbaseAPI from '../../api/coinbase';
import {
  CoinbaseAccountProps,
  CoinbaseErrorsProps,
  CoinbaseExchangeRatesProps,
} from '../../api/coinbase/coinbase.types';
import {sleep} from '../../utils/helper-methods';

const getTokenExistError = (): CoinbaseErrorsProps => {
  return {
    errors: [
      {
        id: 'ACCOUNT_LINKED',
        message: 'You have already linked your Coinbase Account',
      },
    ],
  };
};

const getNoTokenError = (): CoinbaseErrorsProps => {
  return {
    errors: [
      {
        id: 'TOKEN_NOT_FOUND',
        message: 'Token not found. Try to connect again.',
      },
    ],
  };
};

const isExpiredTokenError = (error: CoinbaseErrorsProps): boolean => {
  for (let i = 0; i < error.errors.length; i++) {
    if (error.errors[i].id === 'expired_token') {
      console.warn('Coinbase: Token has expired');
      return true;
    }
  }
  return false;
};

export const setExchangeRate = (): Effect<Promise<any>> => async dispatch => {
  try {
    dispatch(CoinbaseActions.exchangeRatesPending());
    const exchangeRates = await CoinbaseAPI.getExchangeRates();
    dispatch(CoinbaseActions.exchangeRatesSuccess(exchangeRates));
  } catch (error: CoinbaseErrorsProps | any) {
    dispatch(CoinbaseActions.exchangeRatesFailed(error));
  }
};

export const linkCoinbaseAccount =
  (code: string, state: string): Effect<Promise<any>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (COINBASE.token) {
      const error = getTokenExistError();
      dispatch(CoinbaseActions.accessTokenFailed(error));
      throw error;
    }

    if (CoinbaseAPI.getOauthStateCode() !== state) {
      const error: CoinbaseErrorsProps = {
        errors: [
          {
            id: 'STATE_INCORRECT',
            message:
              'Looks like you are trying to connect with differents devices.',
          },
        ],
      };
      dispatch(CoinbaseActions.accessTokenFailed(error));
      throw error;
    }

    try {
      dispatch(
        showOnGoingProcessModal(OnGoingProcessMessages.CONNECTING_COINBASE),
      );
      dispatch(CoinbaseActions.accessTokenPending());
      const token = await CoinbaseAPI.getAccessToken(code);
      dispatch(CoinbaseActions.accessTokenSuccess(token));
      await sleep(500);
      dispatch(dismissOnGoingProcessModal());
    } catch (error: CoinbaseErrorsProps | any) {
      dispatch(CoinbaseActions.accessTokenFailed(error));
      await sleep(500);
      dispatch(dismissOnGoingProcessModal());
    }
  };

export const refreshToken =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token) {
      const error = getNoTokenError();
      dispatch(CoinbaseActions.refreshTokenFailed(error));
      throw error;
    }

    try {
      dispatch(CoinbaseActions.refreshTokenPending());
      const newToken = await CoinbaseAPI.getRefreshToken(COINBASE.token);
      dispatch(CoinbaseActions.refreshTokenSuccess(newToken));
    } catch (error: CoinbaseErrorsProps | any) {
      dispatch(CoinbaseActions.refreshTokenFailed(error));
    }
  };

export const disconnectCoinbaseAccount =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token) {
      const error = getNoTokenError();
      dispatch(CoinbaseActions.revokeTokenFailed(error));
      throw error;
    }

    try {
      dispatch(CoinbaseActions.revokeTokenPending());
      await CoinbaseAPI.revokeToken(COINBASE.token);
      dispatch(CoinbaseActions.revokeTokenSuccess());
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        await dispatch(refreshToken());
      } else {
        dispatch(CoinbaseActions.revokeTokenFailed(error));
      }
      // Clean account
      dispatch(disconnectCoinbaseAccount());
    }
  };

export const getUser =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token) {
      const error = getNoTokenError();
      dispatch(CoinbaseActions.revokeTokenFailed(error));
      throw error;
    }

    try {
      dispatch(CoinbaseActions.userPending());
      const user = await CoinbaseAPI.getCurrentUser(COINBASE.token);
      dispatch(CoinbaseActions.userSuccess(user));
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        await dispatch(refreshToken());
        await dispatch(getUser());
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

    if (!COINBASE.token) {
      const error = getNoTokenError();
      dispatch(CoinbaseActions.revokeTokenFailed(error));
      throw error;
    }

    try {
      dispatch(CoinbaseActions.accountsPending());
      const accounts = await CoinbaseAPI.getAccounts(COINBASE.token);
      // Calculate balance

      let availableBalance: number = 0.0;
      let availableAccounts: CoinbaseAccountProps[] = [];

      for (let i = 0; i < accounts.data.length; i++) {
        if (
          accounts.data[i].type === 'wallet' &&
          accounts.data[i].balance &&
          accounts.data[i].balance.currency &&
          _.includes(
            ['btc', 'bch'],
            accounts.data[i].balance.currency.toLowerCase(),
          )
        ) {
          availableAccounts.push(accounts.data[i]);
          availableBalance =
            availableBalance +
            getCoinbaseExchangeRate(
              accounts.data[i].balance.amount,
              accounts.data[i].balance.currency,
              COINBASE.exchangeRates,
            );
        }
      }

      dispatch(
        CoinbaseActions.accountsSuccess(availableAccounts, availableBalance),
      );
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        await dispatch(refreshToken());
        await dispatch(getAccountsAndBalance());
      } else {
        dispatch(CoinbaseActions.accountsFailed(error));
      }
    }
  };

export const getTransactionsByAccount =
  (accountId: string): Effect<Promise<any>> =>
  async (dispatch, getState) => {
    const {COINBASE} = getState();

    if (!COINBASE.token) {
      const error = getNoTokenError();
      dispatch(CoinbaseActions.revokeTokenFailed(error));
      throw error;
    }

    try {
      dispatch(CoinbaseActions.transactionsPending());
      const transactions = await CoinbaseAPI.getTransactions(
        accountId,
        COINBASE.token,
      );
      dispatch(CoinbaseActions.transactionsSuccess(accountId, transactions));
    } catch (error: CoinbaseErrorsProps | any) {
      if (isExpiredTokenError(error)) {
        await dispatch(refreshToken());
        await dispatch(getTransactionsByAccount(accountId));
      } else {
        dispatch(CoinbaseActions.transactionsFailed(error));
      }
    }
  };

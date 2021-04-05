import {AuthActionTypes, AuthActionType} from './auth.types';
import {Thunk} from '../index';
import axios from 'axios';
import {Account, Session} from './auth.models';
import {AppActions} from '../app/app.actions';

const startGetSession = (): Thunk => async (dispatch, getState) => {
  try {
    const {data: session} = await axios.get<Session>(
      'https://bitpay.com/auth/session',
    );
    dispatch(successGetSession(session));
  } catch (err) {
    console.error(err);
    dispatch(failedGetSession());
  }
};

const successGetSession = (session: Session) => ({
  type: AuthActionTypes.SUCCESS_GET_SESSION,
  payload: session,
});

const failedGetSession = (): AuthActionType => ({
  type: AuthActionTypes.FAILED_GET_SESSION,
});

const startLogin = (): Thunk => async (dispatch, getState) => {
  try {
    await dispatch(
      successLogin({
        email: 'jwhite@bitpay.com',
        isVerified: true,
      }),
    );
    dispatch(AppActions.setOnboardingCompleted());
  } catch (err) {
    console.error(err);
    dispatch(failedLogin());
  }
};

const successLogin = (account: Account): AuthActionType => ({
  type: AuthActionTypes.SUCCESS_LOGIN,
  payload: account,
});

const failedLogin = (): AuthActionType => ({
  type: AuthActionTypes.FAILED_LOGIN,
});

export const AuthActions = {
  startGetSession,
  startLogin,
};

import axios from 'axios';
import {Session} from './auth.models';
import {Effect, RootState} from '../index';
import {AppActions} from '../app/';
import {AuthActions} from './index';

export const startGetSession = (): Effect => async (
  dispatch,
  getState: () => RootState,
) => {
  try {
    const {data: session} = await axios.get<Session>(
      'https://bitpay.com/auth/session',
    );
    dispatch(AuthActions.successGetSession(session));
  } catch (err) {
    console.error(err);
    dispatch(AuthActions.failedGetSession());
  }
};

export const startLogin = (): Effect => async (
  dispatch,
  getState: () => RootState,
) => {
  try {
    await dispatch(
      AuthActions.successLogin({
        email: 'jwhite@bitpay.com',
        isVerified: true,
      }),
    );
    dispatch(AppActions.setOnboardingCompleted());
  } catch (err) {
    console.error(err);
    dispatch(AuthActions.failedLogin());
  }
};

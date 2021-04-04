import {AuthActionTypes, AuthActionType} from './auth.types';
import {Thunk} from '../index';
import axios from 'axios';
import {Account, Session} from './auth.models';

const startGetSession = (): Thunk => async (dispatch, getState) => {
  try {
    const {data: session} = await axios.get('https://bitpay.com/auth/session');
    dispatch(successGetSession(session));
    console.log(session);
  } catch (err) {
    console.error(err);
    dispatch(failedGetSession());
  }
};

const successGetSession = (session: Session) => ({
  type: AuthActionTypes.SUCCESS_GET_SESSION,
  payload: session,
});

const failedGetSession = () => ({
  type: AuthActionTypes.FAILED_GET_SESSION,
});

const successCreateAccount = (account: Account): AuthActionType => ({
  type: AuthActionTypes.SUCCESS_CREATE_ACCOUNT,
  payload: account,
});

export const AuthActions = {
  startGetSession,
  successCreateAccount,
};

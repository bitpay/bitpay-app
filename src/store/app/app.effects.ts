import {RootState, Effect} from '../index';
import {AppActions} from './';
import axios from 'axios';
import {Session} from './app.models';

export const startGetSession = (): Effect => async (
  dispatch,
  getState: () => RootState,
) => {
  const store = getState();

  try {
    const {data: session} = await axios.get<Session>(
      `${store.APP.baseBitPayURL}/auth/session`,
    );
    dispatch(AppActions.successGetSession(session));
  } catch (err) {
    console.error(err);
    dispatch(AppActions.failedGetSession());
  }
};

export const startAppInit = (): Effect => async (
  dispatch,
  getState: () => RootState,
) => {
  const store: RootState = getState();

  try {
    // if onboarding is not completed or if a user is not paired - fetch a session
    if (!store.APP.onboardingCompleted || !store.BITPAY_ID.account) {
      // await dispatch(startGetSession());
    }

    dispatch(AppActions.successAppInit());
  } catch (err) {
    console.error(err);
    dispatch(AppActions.failedAppInit());
  }
};

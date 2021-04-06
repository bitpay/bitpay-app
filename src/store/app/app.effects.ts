import {RootState, Effect} from '../index';
import {AuthEffects} from '../auth';
import {AppActions} from './';

export const startAppInit = (): Effect => async (
  dispatch,
  getState: () => RootState,
) => {
  const store: RootState = getState();

  try {
    // if onboarding is not completed or if a user is not paired - fetch a session
    if (!store.APP.onboardingCompleted || !store.AUTH.account) {
      await dispatch(AuthEffects.startGetSession());
    }

    dispatch(AppActions.successAppInit());
  } catch (err) {
    console.error(err);
    dispatch(AppActions.failedAppInit());
  }
};

import {AppActionTypes} from './app.types';
import {RootState, Thunk} from '../index';
import {AuthActions} from '../auth/auth.actions';

const startAppInit = (): Thunk => async (dispatch, getState) => {
  const store: RootState = getState();

  try {
    // if onboarding is not completed or if a user is not paired - fetch a session
    if (!store.APP.onboardingCompleted || !store.AUTH.account) {
      await dispatch(AuthActions.startGetSession());
    }

    dispatch(successAppInit());
  } catch (err) {
    console.error(err);
    dispatch(failedAppInit());
  }
};

const successAppInit = () => ({
  type: AppActionTypes.SUCCESS_APP_INIT,
});

const failedAppInit = () => ({
  type: AppActionTypes.FAILED_APP_INIT,
});

const setOnboardingCompleted = () => ({
  type: AppActionTypes.SET_ONBOARDING_COMPLETED,
});

export const AppActions = {
  startAppInit,
  setOnboardingCompleted,
};

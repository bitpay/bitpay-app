import {AppActionTypes} from './app.types';

export const successAppInit = () => ({
  type: AppActionTypes.SUCCESS_APP_INIT,
});

export const failedAppInit = () => ({
  type: AppActionTypes.FAILED_APP_INIT,
});

export const setOnboardingCompleted = () => ({
  type: AppActionTypes.SET_ONBOARDING_COMPLETED,
});

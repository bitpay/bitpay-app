import {AppActionType, AppActionTypes} from './app.types';
import {Session} from './app.models';

export const successGetSession = (session: Session): AppActionType => ({
  type: AppActionTypes.SUCCESS_GET_SESSION,
  payload: session,
});

export const failedGetSession = (): AppActionType => ({
  type: AppActionTypes.FAILED_GET_SESSION,
});

export const successAppInit = (): AppActionType => ({
  type: AppActionTypes.SUCCESS_APP_INIT,
});

export const failedAppInit = (): AppActionType => ({
  type: AppActionTypes.FAILED_APP_INIT,
});

export const setOnboardingCompleted = (): AppActionType => ({
  type: AppActionTypes.SET_ONBOARDING_COMPLETED,
});

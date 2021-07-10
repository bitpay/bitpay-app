import {Session} from './app.models';

export enum AppActionTypes {
  SUCCESS_GET_SESSION = 'APP/SUCCESS_GET_SESSION',
  FAILED_GET_SESSION = 'APP/FAILED_GET_SESSION',
  SUCCESS_APP_INIT = 'APP/SUCCESS_APP_INIT',
  FAILED_APP_INIT = 'APP/FAILED_APP_INIT',
  SET_ONBOARDING_COMPLETED = 'APP/SET_ONBOARDING_COMPLETED',
}

interface SuccessGetSession {
  type: typeof AppActionTypes.SUCCESS_GET_SESSION;
  payload: Session;
}

interface FailedGetSession {
  type: typeof AppActionTypes.FAILED_GET_SESSION;
}

interface SuccessAppInit {
  type: typeof AppActionTypes.SUCCESS_APP_INIT;
}

interface FailedAppInit {
  type: typeof AppActionTypes.FAILED_APP_INIT;
}

interface SetOnboardingCompleted {
  type: typeof AppActionTypes.SET_ONBOARDING_COMPLETED;
}

export type AppActionType =
  | SuccessGetSession
  | FailedGetSession
  | SuccessAppInit
  | FailedAppInit
  | SetOnboardingCompleted;

export enum AppActionTypes {
  SUCCESS_APP_INIT = 'APP/SUCCESS_APP_INIT',
  FAILED_APP_INIT = 'APP/FAILED_APP_INIT',
  SET_ONBOARDING_COMPLETED = 'APP/SET_ONBOARDING_COMPLETED',
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
  | SuccessAppInit
  | FailedAppInit
  | SetOnboardingCompleted;

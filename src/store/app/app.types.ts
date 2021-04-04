export enum AppActionTypes {
  START_INIT = 'APP/START_APP_INIT',
  SUCCESS_APP_INIT = 'APP/SUCCESS_APP_INIT',
  FAILED_APP_INIT = 'APP/FAILED_APP_INIT',
}

interface SuccessAppInit {
  type: typeof AppActionTypes.SUCCESS_APP_INIT;
  payload: any;
}

interface FailedAppInit {
  type: typeof AppActionTypes.FAILED_APP_INIT;
}

export type AppActionType = SuccessAppInit | FailedAppInit;

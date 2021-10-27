import {Session} from './app.models';
import {OnGoingProcessMessages} from '../../components/ongoing-process/OngoingProcess';

export enum AppActionTypes {
  SUCCESS_GET_SESSION = 'APP/SUCCESS_GET_SESSION',
  FAILED_GET_SESSION = 'APP/FAILED_GET_SESSION',
  SUCCESS_APP_INIT = 'APP/SUCCESS_APP_INIT',
  FAILED_APP_INIT = 'APP/FAILED_APP_INIT',
  SET_ONBOARDING_COMPLETED = 'APP/SET_ONBOARDING_COMPLETED',
  SHOW_ONGOING_PROCESS_MODAL = 'APP/SHOW_ONGOING_PROCESS_MODAL',
  DISMISS_ONGOING_PROCESS_MODAL = 'APP/DISMISS_ONGOING_PROCESS_MODAL',
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

interface ShowOnGoingProcessModal {
  type: typeof AppActionTypes.SHOW_ONGOING_PROCESS_MODAL;
  payload: OnGoingProcessMessages;
}

interface DismissOnGoingProcessModal {
  type: typeof AppActionTypes.DISMISS_ONGOING_PROCESS_MODAL;
}

export type AppActionType =
  | SuccessGetSession
  | FailedGetSession
  | SuccessAppInit
  | FailedAppInit
  | SetOnboardingCompleted
  | ShowOnGoingProcessModal
  | DismissOnGoingProcessModal;

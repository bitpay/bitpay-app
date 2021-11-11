import {Session} from './app.models';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {ColorSchemeName} from 'react-native';

export enum AppActionTypes {
  SUCCESS_GET_SESSION = 'APP/SUCCESS_GET_SESSION',
  FAILED_GET_SESSION = 'APP/FAILED_GET_SESSION',
  SUCCESS_APP_INIT = 'APP/SUCCESS_APP_INIT',
  FAILED_APP_INIT = 'APP/FAILED_APP_INIT',
  SET_ONBOARDING_COMPLETED = 'APP/SET_ONBOARDING_COMPLETED',
  SHOW_ONGOING_PROCESS_MODAL = 'APP/SHOW_ONGOING_PROCESS_MODAL',
  DISMISS_ONGOING_PROCESS_MODAL = 'APP/DISMISS_ONGOING_PROCESS_MODAL',
  SHOW_BOTTOM_NOTIFICATION_MODAL = 'APP/SHOW_BOTTOM_NOTIFICATION_MODAL',
  DISMISS_BOTTOM_NOTIFICATION_MODAL = 'APP/DISMISS_BOTTOM_NOTIFICATION_MODAL',
  SET_COLOR_SCHEME = 'APP/SET_COLOR_SCHEME',
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

interface ShowBottomNotificationModal {
  type: typeof AppActionTypes.SHOW_BOTTOM_NOTIFICATION_MODAL;
  payload: BottomNotificationConfig;
}

interface DismissBottomNotificationModal {
  type: typeof AppActionTypes.DISMISS_BOTTOM_NOTIFICATION_MODAL;
}

interface SetColorScheme {
  type: typeof AppActionTypes.SET_COLOR_SCHEME;
  payload: ColorSchemeName;
}

export type AppActionType =
  | SuccessGetSession
  | FailedGetSession
  | SuccessAppInit
  | FailedAppInit
  | SetOnboardingCompleted
  | ShowOnGoingProcessModal
  | DismissOnGoingProcessModal
  | ShowBottomNotificationModal
  | DismissBottomNotificationModal
  | SetColorScheme;

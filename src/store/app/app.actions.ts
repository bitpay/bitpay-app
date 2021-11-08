import {ColorSchemeName} from 'react-native';
import {Session} from './app.models';
import {AppActionType, AppActionTypes} from './app.types';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';

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

export const showOnGoingProcessModal = (
  message: OnGoingProcessMessages,
): AppActionType => ({
  type: AppActionTypes.SHOW_ONGOING_PROCESS_MODAL,
  payload: message,
});

export const dismissOnGoingProcessModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_ONGOING_PROCESS_MODAL,
});

export const showBottomNotificationModal = (
  config: BottomNotificationConfig,
): AppActionType => ({
  type: AppActionTypes.SHOW_BOTTOM_NOTIFICATION_MODAL,
  payload: config,
});

export const dismissBottomNotificationModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_BOTTOM_NOTIFICATION_MODAL,
});

export const setColorScheme = (scheme: ColorSchemeName): AppActionType => ({
  type: AppActionTypes.SET_COLOR_SCHEME,
  payload: scheme,
});

import {ColorSchemeName} from 'react-native';
import {AppIdentity} from './app.models';
import {AppActionType, AppActionTypes} from './app.types';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {Network} from '../../constants';

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

export const setCurrentRoute = (route: any): AppActionType => ({
  type: AppActionTypes.SET_CURRENT_ROUTE,
  payload: route,
});

export const successGenerateAppIdentity = (
  network: Network,
  identity: AppIdentity,
): AppActionType => ({
  type: AppActionTypes.SUCCESS_GENERATE_APP_IDENTITY,
  payload: {network, identity},
});

export const failedGenerateAppIdentity = (): AppActionType => ({
  type: AppActionTypes.FAILED_GENERATE_APP_IDENTITY,
});

export const setNotificationsAccepted = (
  notificationsAccepted: boolean,
): AppActionType => ({
  type: AppActionTypes.SET_NOTIFICATIONS_ACCEPTED,
  payload: notificationsAccepted,
});

export const showOnboardingFinishModal = (): AppActionType => ({
  type: AppActionTypes.SHOW_ONBOARDING_FINISH_MODAL,
});

export const dismissOnboardingFinishModal = (): AppActionType => ({
  type: AppActionTypes.DISMISS_ONBOARDING_FINISH_MODAL,
});

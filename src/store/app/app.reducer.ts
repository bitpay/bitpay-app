import {AppActionType, AppActionTypes} from './app.types';
import {Session} from './app.models';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {ColorSchemeName} from 'react-native';

type AppReduxPersistBlackList = [
  'appIsLoading',
  'showOnGoingProcessModal',
  'onGoingProcessModalMessage',
];
export const appReduxPersistBlackList: AppReduxPersistBlackList = [
  'appIsLoading',
  'showOnGoingProcessModal',
  'onGoingProcessModalMessage',
];

export interface AppState {
  network: 'mainnet' | 'testnet';
  baseBitPayURL: string;
  appIsLoading: boolean;
  onboardingCompleted: boolean;
  session: Session | undefined;
  showOnGoingProcessModal: boolean;
  onGoingProcessModalMessage: string | undefined;
  showBottomNotificationModal: boolean;
  bottomNotificationModalConfig: BottomNotificationConfig | undefined;
  colorScheme: ColorSchemeName;
}

const initialState: AppState = {
  network: 'testnet',
  baseBitPayURL: 'https://test.bitpay.com',
  appIsLoading: true,
  onboardingCompleted: false,
  session: undefined,
  showOnGoingProcessModal: false,
  onGoingProcessModalMessage: OnGoingProcessMessages.GENERAL_AWAITING,
  showBottomNotificationModal: false,
  bottomNotificationModalConfig: undefined,
  colorScheme: null,
};

export const appReducer = (
  state: AppState = initialState,
  action: AppActionType,
): AppState => {
  switch (action.type) {
    case AppActionTypes.SUCCESS_GET_SESSION:
      return {
        ...state,
        session: action.payload,
      };

    case AppActionTypes.SUCCESS_APP_INIT:
      return {
        ...state,
        appIsLoading: false,
      };

    case AppActionTypes.SET_ONBOARDING_COMPLETED:
      return {
        ...state,
        onboardingCompleted: true,
      };

    case AppActionTypes.SHOW_ONGOING_PROCESS_MODAL:
      return {
        ...state,
        showOnGoingProcessModal: true,
        onGoingProcessModalMessage: action.payload,
      };

    case AppActionTypes.DISMISS_ONGOING_PROCESS_MODAL:
      return {
        ...state,
        showOnGoingProcessModal: false,
      };

    case AppActionTypes.SHOW_BOTTOM_NOTIFICATION_MODAL:
      return {
        ...state,
        showBottomNotificationModal: true,
        bottomNotificationModalConfig: action.payload,
      };

    case AppActionTypes.DISMISS_BOTTOM_NOTIFICATION_MODAL:
      return {
        ...state,
        showBottomNotificationModal: false,
      };

    case AppActionTypes.SET_COLOR_SCHEME:
      return {
        ...state,
        colorScheme: action.payload,
      };

    default:
      return state;
  }
};

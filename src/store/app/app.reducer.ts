import {ColorSchemeName} from 'react-native';
import {Network} from '../../constants';
import {BASE_BITPAY_URLS} from '../../constants/config';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {NavScreenParams, RootStackParamList} from '../../Root';
import {AppIdentity, Session} from './app.models';
import {AppActionType, AppActionTypes} from './app.types';

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
  identity: {
    [key in Network]: AppIdentity;
  };
  network: Network;
  baseBitPayURL: string;
  appIsLoading: boolean;
  onboardingCompleted: boolean;
  session: Session | undefined;
  showOnGoingProcessModal: boolean;
  onGoingProcessModalMessage: string | undefined;
  showBottomNotificationModal: boolean;
  bottomNotificationModalConfig: BottomNotificationConfig | undefined;
  colorScheme: ColorSchemeName;
  currentRoute: [keyof RootStackParamList, NavScreenParams] | undefined;
}

const initialState: AppState = {
  identity: {
    [Network.mainnet]: {
      priv: '',
      pub: '',
      sin: '',
    },
    [Network.testnet]: {
      priv: '',
      pub: '',
      sin: '',
    },
  },
  network: Network.mainnet,
  baseBitPayURL: BASE_BITPAY_URLS[Network.mainnet],
  appIsLoading: true,
  onboardingCompleted: false,
  session: undefined,
  showOnGoingProcessModal: false,
  onGoingProcessModalMessage: OnGoingProcessMessages.GENERAL_AWAITING,
  showBottomNotificationModal: false,
  bottomNotificationModalConfig: undefined,
  colorScheme: 'light',
  currentRoute: undefined,
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

    case AppActionTypes.SET_CURRENT_ROUTE:
      return {
        ...state,
        currentRoute: action.payload,
      };

    case AppActionTypes.SUCCESS_GENERATE_APP_IDENTITY:
      const {network, identity} = action.payload;

      return {
        ...state,
        identity: {
          ...state.identity,
          [network]: identity,
        },
      };

    default:
      return state;
  }
};

import {AppActionType, AppActionTypes} from './app.types';
import {Session} from './app.models';

type AppReduxPersistBlackList = ['appIsLoading'];
export const appReduxPersistBlackList: AppReduxPersistBlackList = [
  'appIsLoading',
];

export interface AppState {
  network: string;
  baseBitPayURL: string;
  appIsLoading: boolean;
  onboardingCompleted: boolean;
  session: Session | undefined;
}

const initialState: AppState = {
  network: 'testnet',
  baseBitPayURL: 'https://test.bitpay.com',
  appIsLoading: true,
  onboardingCompleted: false,
  session: undefined,
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

    default:
      return state;
  }
};

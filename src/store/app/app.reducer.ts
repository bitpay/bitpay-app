import {AppActionType, AppActionTypes} from './app.types';
import {Session} from './app.models';

export interface AppState {
  network: string;
  baseURL: string;
  appIsLoading: boolean;
  onboardingCompleted: boolean;
  session: Session | undefined;
}

const initialState: AppState = {
  network: 'livenet',
  baseURL: 'https://bitpay.com',
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

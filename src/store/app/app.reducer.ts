import { AppActionType, AppActionTypes } from './app.types';

export interface AppState {
  network: string;
  baseURL: string;
  appIsLoading: boolean;
  onboardingCompleted: boolean;
}

const initialState: AppState = {
  network: 'livenet',
  baseURL: 'https://bitpay.com',
  appIsLoading: true,
  onboardingCompleted: false,
};

export const appReducer = (
  state: AppState = initialState,
  action: AppActionType,
): AppState => {
  switch (action.type) {
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

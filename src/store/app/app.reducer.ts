import {AppActionTypes, AppActionType} from './app.types';

export interface AppState {
  network: string;
  baseURL: string;
  appIsLoading: boolean;
}

const initialState: AppState = {
  network: 'livenet',
  baseURL: 'https://bitpay.com',
  appIsLoading: true,
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

    default:
      return state;
  }
};

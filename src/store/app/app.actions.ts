import {sleep} from '../../utils/helper-methods';
import {AppActionTypes} from './app.types';
import {Thunk} from '../index';

const startAppInit = (): Thunk => async (dispatch, getState) => {
  try {
    // do app init stuff
    await sleep(1000);
    dispatch(successAppInit(null));
  } catch (err) {
    console.error(err);
    dispatch(failedAppInit());
  }
};

const successAppInit = (payload: any) => ({
  type: AppActionTypes.SUCCESS_APP_INIT,
  payload,
});

const failedAppInit = () => ({
  type: AppActionTypes.FAILED_APP_INIT,
});

export const AppActions = {
  startAppInit,
};

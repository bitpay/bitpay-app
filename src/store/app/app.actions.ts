import {AppActionTypes} from './app.types';
import {Thunk} from '../index';
import {sleep} from '../../utils/helper-methods';

const startAppInit = (): Thunk => async (dispatch, getState) => {
  try {
    // do app init stuff
    await sleep(1000);
    dispatch(successAppInit());
  } catch (err) {
    console.error(err);
    dispatch(failedAppInit());
  }
};

const successAppInit = () => ({
  type: AppActionTypes.SUCCESS_APP_INIT,
});

const failedAppInit = () => ({
  type: AppActionTypes.FAILED_APP_INIT,
});

export const AppActions = {
  startAppInit,
};

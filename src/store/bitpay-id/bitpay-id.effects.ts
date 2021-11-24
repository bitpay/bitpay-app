import {AppActions} from '../app/';
import {Effect} from '../index';
import {BitPayIdActions} from './index';

export const startLogin =
  ({email, password}: {email: string; password: string}): Effect =>
  async (dispatch, getState) => {
    const { network } = getState().APP;
    try {
      console.log(email, password);
      await dispatch(
        BitPayIdActions.successLogin(network, {
          email: 'jwhite@bitpay.com',
          userSettings: {}
        }),
      );
      dispatch(AppActions.setOnboardingCompleted());
    } catch (err) {
      console.error(err);
      dispatch(BitPayIdActions.failedLogin());
    }
  };

export const startCreateAccount =
  ({email, password}: {email: string; password: string}): Effect =>
  async dispatch => {
    try {
      console.log(email, password);

      dispatch(AppActions.setOnboardingCompleted());
    } catch (err) {
      console.error(err);
      dispatch(BitPayIdActions.failedLogin());
    }
  };

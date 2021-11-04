import {Effect} from '../index';
import {AppActions} from '../app/';
import {BitPayIdActions} from './index';

export const startLogin =
  ({email, password}: {email: string; password: string}): Effect =>
  async dispatch => {
    try {
      console.log(email, password);
      await dispatch(
        BitPayIdActions.successLogin({
          email: 'jwhite@bitpay.com',
          isVerified: true,
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

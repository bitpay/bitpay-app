import {Effect} from '../index';
import {AppActions} from '../app/';
import {BitPayIdActions} from './index';

export const startLogin = (): Effect => async dispatch => {
  try {
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

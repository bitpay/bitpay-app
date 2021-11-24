import BitPayApi from '../../lib/bitpay-api';
import {AppActions} from '../app/';
import {Effect} from '../index';
import {BitPayIdActions} from './index';

export const startFetchSession = (): Effect => async (dispatch, getState) => {
  try {
    const {network} = getState().APP;
    const api = BitPayApi.getInstance(network);
    const session = await api.fetchSession();

    dispatch(BitPayIdActions.successFetchSession(session));
  } catch (err) {
    dispatch(BitPayIdActions.failedFetchSession());
  }
};

export const startLogin =
  ({email, password}: {email: string; password: string}): Effect =>
  async (dispatch, getState) => {
    try {
      const {APP, BITPAY_ID} = getState();
      const api = BitPayApi.getInstance(APP.network);

      await api.login(email, password, BITPAY_ID.session.csrfToken);
      const session = await api.fetchSession();

      // TODO: start pairing logic

      dispatch(
        BitPayIdActions.successLogin(
          APP.network,
          {email, userSettings: {}},
          session,
        ),
      );
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

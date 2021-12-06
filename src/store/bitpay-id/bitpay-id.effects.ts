import DeviceInfo from 'react-native-device-info';
import BitPayApi from '../../lib/bitpay-api';
import {AppActions} from '../app/';
import {Effect} from '../index';
import {LogActions} from '../log';
import {BitPayIdActions} from './index';

interface PairParams {
  secret: string;
  code?: string;
}

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
      const deviceName = await DeviceInfo.getDeviceName();

      // authenticate
      dispatch(LogActions.info('Authenticating BitPayID credentials...'));
      const {twoFactorPending, emailAuthenticationPending} = await api.login(
        email,
        password,
        BITPAY_ID.session.csrfToken,
      );

      // TODO
      if (twoFactorPending) {
        dispatch(LogActions.debug('Two-factor authentication pending.'));
        dispatch(BitPayIdActions.updateLoginStatus('twoFactorPending'));
        return;
      }

      // TODO
      if (emailAuthenticationPending) {
        dispatch(LogActions.debug('Email authentication pending.'));
        dispatch(
          BitPayIdActions.updateLoginStatus('emailAuthenticationPending'),
        );
        return;
      }

      dispatch(
        LogActions.info('Successfully authenticated BitPayID credentials.'),
      );

      // refresh session
      const session = await api.fetchSession();

      // start pairing
      const secret = await api.generatePairingCode(session.csrfToken);
      const {token, user} = await api.pairAndFetchUser(secret, deviceName);

      dispatch(LogActions.info('Successfully paired with BitPayID.'));
      dispatch(
        BitPayIdActions.successPairingBitPayId(APP.network, token, user),
      );
      dispatch(BitPayIdActions.successLogin(APP.network, session));
    } catch (err) {
      console.error(err);
      dispatch(LogActions.error('Login failed.'));
      dispatch(LogActions.error(JSON.stringify(err)));
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

export const startPairing =
  ({secret, code}: PairParams): Effect =>
  async (dispatch, getState) => {
    const deviceName = DeviceInfo.getModel() || 'unknown device';
    const state = getState();
    const network = state.APP.network;
    const identity = state.APP.identity[network];

    try {
      const api = BitPayApi.getInstance(network).use({identity});
      const {user, token} = await api.pairAndFetchUser(
        secret,
        deviceName,
        code,
      );

      dispatch(BitPayIdActions.successPairingBitPayId(network, token, user));
    } catch (err) {
      console.error(err);
      dispatch(LogActions.error('Pairing failed.'));
      dispatch(LogActions.error(JSON.stringify(err)));
      dispatch(BitPayIdActions.failedPairingBitPayId());
    }
  };

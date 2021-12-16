import {batch} from 'react-redux';
import AuthApi from '../../api/auth';
import UserApi from '../../api/user';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {Network} from '../../constants';
import {AppActions} from '../app/';
import {startOnGoingProcessModal} from '../app/app.effects';
import {CardActions} from '../card';
import {Effect} from '../index';
import {LogActions} from '../log';
import {User} from './bitpay-id.models';
import {BitPayIdActions, BitPayIdEffects} from './index';

interface BitPayIdStoreInitParams {
  user?: User;
}

interface PairParams {
  secret: string;
  code?: string;
}

export const startBitPayIdStoreInit =
  (network: Network, {user}: BitPayIdStoreInitParams): Effect<Promise<void>> =>
  async dispatch => {
    if (user) {
      dispatch(BitPayIdActions.successFetchBasicInfo(network, user));
    }
  };

export const startFetchSession = (): Effect => async dispatch => {
  try {
    const session = await AuthApi.fetchSession();

    dispatch(BitPayIdActions.successFetchSession(session));
  } catch (err) {
    dispatch(BitPayIdActions.failedFetchSession());
  }
};

export const startLogin =
  ({email, password}: {email: string; password: string}): Effect =>
  async (dispatch, getState) => {
    try {
      dispatch(startOnGoingProcessModal(OnGoingProcessMessages.LOGGING_IN));

      const {APP, BITPAY_ID} = getState();

      // authenticate
      dispatch(LogActions.info('Authenticating BitPayID credentials...'));
      const {twoFactorPending, emailAuthenticationPending} =
        await AuthApi.login(email, password, BITPAY_ID.session.csrfToken);

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
      const session = await AuthApi.fetchSession();

      // start pairing
      const secret = await AuthApi.generatePairingCode(session.csrfToken);
      dispatch(BitPayIdEffects.startPairing({secret}));

      dispatch(BitPayIdActions.successLogin(APP.network, session));
    } catch (err) {
      console.error(err);
      dispatch(LogActions.error('Login failed.'));
      dispatch(LogActions.error(JSON.stringify(err)));
      dispatch(BitPayIdActions.failedLogin());
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
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
  ({secret, code}: PairParams): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState();
    const network = state.APP.network;

    try {
      const token = await AuthApi.pair(secret, code);
      const {basicInfo, cards} = await UserApi.fetchAllUserData(token);

      batch(() => {
        dispatch(LogActions.info('Successfully paired with BitPayID.'));
        dispatch(BitPayIdActions.successFetchBasicInfo(network, basicInfo));
        dispatch(CardActions.successFetchCards(network, cards));
        dispatch(BitPayIdActions.successPairingBitPayId(network, token));
      });
    } catch (err) {
      console.error(err);
      dispatch(LogActions.error('Pairing failed.'));
      dispatch(LogActions.error(JSON.stringify(err)));
      dispatch(BitPayIdActions.failedPairingBitPayId());
    }
  };

export const startFetchBasicInfo =
  (token: string): Effect =>
  async (dispatch, getState) => {
    try {
      const {APP} = getState();
      const user = await UserApi.fetchBasicInfo(token);

      dispatch(BitPayIdActions.successFetchBasicInfo(APP.network, user));
    } catch (err) {
      dispatch(LogActions.error('Failed to fetch basic user info'));
      dispatch(LogActions.error(JSON.stringify(err)));
      dispatch(BitPayIdActions.failedFetchBasicInfo());
    }
  };

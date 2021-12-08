import {batch} from 'react-redux';
import BitPayIdApi from '../../api/bitpay-id';
import UserApi from '../../api/user';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {AppActions} from '../app/';
import {startOnGoingProcessModal} from '../app/app.effects';
import {CardEffects} from '../card';
import {Effect} from '../index';
import {LogActions} from '../log';
import {BitPayIdActions, BitPayIdEffects} from './index';

interface PairParams {
  secret: string;
  code?: string;
}

export const startFetchSession = (): Effect => async dispatch => {
  try {
    const session = await BitPayIdApi.fetchSession();

    dispatch(BitPayIdActions.successFetchSession(session));
  } catch (err) {
    dispatch(BitPayIdActions.failedFetchSession());
  }
};

export const startLogin =
  ({email, password}: {email: string; password: string}): Effect =>
  async (dispatch, getState) => {
    dispatch(startOnGoingProcessModal(OnGoingProcessMessages.LOGGING_IN));
    try {
      const {APP, BITPAY_ID} = getState();

      // authenticate
      dispatch(LogActions.info('Authenticating BitPayID credentials...'));
      const {twoFactorPending, emailAuthenticationPending} =
        await BitPayIdApi.login(email, password, BITPAY_ID.session.csrfToken);

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
      const session = await BitPayIdApi.fetchSession();

      // start pairing
      const secret = await BitPayIdApi.generatePairingCode(session.csrfToken);
      dispatch(BitPayIdEffects.startPairing({secret}));

      dispatch(BitPayIdActions.successLogin(APP.network, session));
    } catch (err) {
      console.error(err);
      dispatch(LogActions.error('Login failed.'));
      dispatch(LogActions.error(JSON.stringify(err)));
      dispatch(BitPayIdActions.failedLogin());
    }
    dispatch(AppActions.dismissOnGoingProcessModal());
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
      const token = await BitPayIdApi.pair(secret, code);

      // TODO: combine graph queries
      batch(() => {
        dispatch(BitPayIdEffects.startFetchBasicInfo(token));
        dispatch(CardEffects.startFetchAll(token));
      });

      dispatch(LogActions.info('Successfully paired with BitPayID.'));
      dispatch(BitPayIdActions.successPairingBitPayId(network, token));
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

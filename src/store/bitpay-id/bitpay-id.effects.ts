import {upperFirst} from 'lodash';
import ReactAppboy from 'react-native-appboy-sdk';
import {batch} from 'react-redux';
import AuthApi from '../../api/auth';
import {LoginErrorResponse} from '../../api/auth/auth.types';
import UserApi from '../../api/user';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {Network} from '../../constants';
import {isAxiosError} from '../../utils/axios';
import {AppActions} from '../app/';
import {startOnGoingProcessModal} from '../app/app.effects';
import {CardActions} from '../card';
import {Effect} from '../index';
import {LogActions} from '../log';
import {User} from './bitpay-id.models';
import {BitPayIdActions} from './index';
import ReactNative from 'react-native';
const {Dosh} = ReactNative.NativeModules;

interface BitPayIdStoreInitParams {
  user?: User;
  doshToken?: string;
}

interface StartLoginParams {
  email: string;
  password: string;
  gCaptchaResponse?: string;
}

export const startBitPayIdStoreInit =
  (
    network: Network,
    {user, doshToken}: BitPayIdStoreInitParams,
  ): Effect<Promise<void>> =>
  async dispatch => {
    if (user) {
      dispatch(
        BitPayIdActions.successFetchAllUserData(network, {user, doshToken}),
      );
      dispatch(startSetBrazeUser(user));
    }
  };

export const startFetchSession = (): Effect => async (dispatch, getState) => {
  try {
    const {APP} = getState();
    dispatch(BitPayIdActions.updateFetchSessionStatus('loading'));

    const session = await AuthApi.fetchSession(APP.network);

    dispatch(BitPayIdActions.successFetchSession(session));
  } catch (err) {
    dispatch(BitPayIdActions.failedFetchSession());
  }
};

export const startLogin =
  ({email, password, gCaptchaResponse}: StartLoginParams): Effect =>
  async (dispatch, getState) => {
    try {
      dispatch(startOnGoingProcessModal(OnGoingProcessMessages.LOGGING_IN));
      dispatch(BitPayIdActions.updateLoginStatus(null));

      const {APP, BITPAY_ID} = getState();

      // authenticate
      dispatch(LogActions.info('Authenticating BitPayID credentials...'));
      const {twoFactorPending, emailAuthenticationPending} =
        await AuthApi.login(
          APP.network,
          email,
          password,
          BITPAY_ID.session.csrfToken,
          gCaptchaResponse,
        );

      // refresh session
      const session = await AuthApi.fetchSession(APP.network);

      if (twoFactorPending) {
        dispatch(LogActions.debug('Two-factor authentication pending.'));
        dispatch(BitPayIdActions.pendingLogin('twoFactorPending', session));
        return;
      }

      if (emailAuthenticationPending) {
        dispatch(LogActions.debug('Email authentication pending.'));
        dispatch(
          BitPayIdActions.pendingLogin('emailAuthenticationPending', session),
        );
        return;
      }

      dispatch(
        LogActions.info('Successfully authenticated BitPayID credentials.'),
      );

      // start pairing
      const secret = await AuthApi.generatePairingCode(
        APP.network,
        session.csrfToken,
      );
      await dispatch(startPairAndLoadUser(APP.network, secret));

      // complete
      dispatch(BitPayIdActions.successLogin(APP.network, session));
    } catch (err) {
      batch(() => {
        let errMsg;

        if (isAxiosError<LoginErrorResponse>(err)) {
          errMsg = upperFirst(
            err.response?.data.message ||
              err.message ||
              'An unexpected error occurred.',
          );
          console.error(errMsg);
        } else {
          console.error(err);
        }

        dispatch(LogActions.error('Login failed.'));
        dispatch(LogActions.error(JSON.stringify(err)));
        dispatch(BitPayIdActions.failedLogin(errMsg));
      });
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

export const startTwoFactorAuth =
  (code: string): Effect =>
  async (dispatch, getState) => {
    try {
      dispatch(startOnGoingProcessModal(OnGoingProcessMessages.LOGGING_IN));

      const {APP, BITPAY_ID} = getState();

      await AuthApi.submitTwoFactor(
        APP.network,
        code,
        BITPAY_ID.session.csrfToken,
      );

      // refresh session
      const session = await AuthApi.fetchSession(APP.network);

      // complete
      dispatch(
        BitPayIdActions.successSubmitTwoFactorAuth(APP.network, session),
      );
    } catch (err) {
      batch(() => {
        let errMsg;

        if (isAxiosError<string>(err)) {
          errMsg = upperFirst(
            err.response?.data ||
              err.message ||
              'An unexpected error occurred.',
          );
          console.error(errMsg);
        } else {
          console.error(err);
        }

        dispatch(LogActions.error('Two factor authentication failed.'));
        dispatch(LogActions.error(JSON.stringify(err)));
        dispatch(BitPayIdActions.failedSubmitTwoFactorAuth(errMsg));
      });
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

export const startTwoFactorPairing =
  (code: string): Effect =>
  async (dispatch, getState) => {
    try {
      dispatch(startOnGoingProcessModal(OnGoingProcessMessages.LOGGING_IN));

      const {APP, BITPAY_ID} = getState();
      const secret = await AuthApi.generatePairingCode(
        APP.network,
        BITPAY_ID.session.csrfToken,
      );

      await dispatch(startPairAndLoadUser(APP.network, secret, code));

      dispatch(BitPayIdActions.successSubmitTwoFactorPairing());
    } catch (err) {
      batch(() => {
        let errMsg;

        if (isAxiosError<any>(err)) {
          errMsg = upperFirst(
            err.response?.data ||
              err.message ||
              'An unexpected error occurred.',
          );
          console.error(errMsg);
        } else if (err instanceof Error) {
          errMsg = upperFirst(err.message);
          console.error(errMsg);
        } else {
          console.error(err);
        }

        dispatch(LogActions.error('Pairing with two factor failed.'));
        dispatch(LogActions.error(JSON.stringify(err)));
        dispatch(
          BitPayIdActions.failedSubmitTwoFactorPairing(JSON.stringify(errMsg)),
        );
      });
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

export const startEmailPairing =
  (csrfToken: string): Effect =>
  async (dispatch, getState) => {
    try {
      const {APP} = getState();
      dispatch(startOnGoingProcessModal(OnGoingProcessMessages.LOGGING_IN));

      const secret = await AuthApi.generatePairingCode(APP.network, csrfToken);

      await dispatch(startPairAndLoadUser(APP.network, secret));

      dispatch(BitPayIdActions.successEmailPairing());
    } catch (err) {
      batch(() => {
        console.error(err);
        dispatch(LogActions.error('Pairing from email authentication failed.'));
        dispatch(LogActions.error(JSON.stringify(err)));
        dispatch(BitPayIdActions.failedEmailPairing());
      });
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

export const startDeeplinkPairing =
  (secret: string, code?: string): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState();
    const network = state.APP.network;

    try {
      await dispatch(startPairAndLoadUser(network, secret, code));
    } catch (err) {
      console.error(err);
      dispatch(LogActions.error('Pairing failed.'));
      dispatch(LogActions.error(JSON.stringify(err)));
      dispatch(BitPayIdActions.failedPairingBitPayId());
    }
  };

const startPairAndLoadUser =
  (network: Network, secret: string, code?: string): Effect<Promise<void>> =>
  async dispatch => {
    try {
      const token = await AuthApi.pair(secret, code);
      const {basicInfo, cards, doshToken} = await UserApi.fetchAllUserData(
        token,
      );

      if (Dosh && doshToken) {
        Dosh.setDoshToken(doshToken);
      }

      batch(() => {
        dispatch(LogActions.info('Successfully paired with BitPayID.'));
        dispatch(
          BitPayIdActions.successFetchAllUserData(network, {
            user: basicInfo,
            doshToken,
          }),
        );
        dispatch(startSetBrazeUser(basicInfo));
        dispatch(CardActions.successFetchCards(network, cards));
        dispatch(BitPayIdActions.successPairingBitPayId(network, token));
      });
    } catch (err) {
      dispatch(
        LogActions.error(
          'An error occurred while pairing and loading user data.',
        ),
      );
      throw err;
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

export const startFetchDoshToken = (): Effect => async (dispatch, getState) => {
  try {
    const {APP, BITPAY_ID} = getState();
    const doshToken = await UserApi.fetchDoshToken(
      BITPAY_ID.apiToken[APP.network],
    );

    dispatch(BitPayIdActions.successFetchDoshToken(APP.network, doshToken));
  } catch (err) {
    batch(() => {
      dispatch(LogActions.error('Failed to fetch dosh token.'));
      dispatch(LogActions.error(JSON.stringify(err)));
      dispatch(BitPayIdActions.failedFetchDoshToken());
    });
  }
};

export const startSetBrazeUser =
  ({eid, email}: User): Effect =>
  async dispatch => {
    try {
      ReactAppboy.changeUser(eid);
      ReactAppboy.setEmail(email);
      dispatch(LogActions.info('Braze user session created'));
    } catch (err) {
      dispatch(LogActions.error('Error creating Braze user session'));
    }
  };

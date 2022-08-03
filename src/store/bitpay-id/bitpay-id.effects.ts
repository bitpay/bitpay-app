import {upperFirst} from 'lodash';
import {batch} from 'react-redux';
import AuthApi from '../../api/auth';
import {
  LoginErrorResponse,
  RegisterErrorResponse,
} from '../../api/auth/auth.types';
import UserApi from '../../api/user';
import {InitialUserData} from '../../api/user/user.types';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {Network} from '../../constants';
import Dosh from '../../lib/dosh';
import {isAxiosError, isRateLimitError} from '../../utils/axios';
import {generateSalt, hashPassword} from '../../utils/password';
import {AppActions, AppEffects} from '../app/';
import {Analytics, startOnGoingProcessModal} from '../app/app.effects';
import {CardEffects} from '../card';
import {Effect} from '../index';
import {ShopEffects} from '../shop';
import {BitPayIdActions} from './index';
import {t} from 'i18next';
import {useLogger} from '../../utils/hooks';

interface StartLoginParams {
  email: string;
  password: string;
  gCaptchaResponse?: string;
}

export const startBitPayIdStoreInit =
  (initialData: InitialUserData): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const {APP} = getState();
    const {basicInfo: user} = initialData;

    if (user) {
      dispatch(
        BitPayIdActions.successInitializeStore(APP.network, initialData),
      );
    }
  };

export const startFetchSession =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    try {
      const {APP} = getState();
      dispatch(BitPayIdActions.updateFetchSessionStatus('loading'));

      const session = await AuthApi.fetchSession(APP.network);

      dispatch(BitPayIdActions.successFetchSession(session));
    } catch (err) {
      dispatch(BitPayIdActions.failedFetchSession());
    }
  };

interface CreateAccountParams {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
  agreedToTOSandPP: boolean;
  gCaptchaResponse?: string;
}

export const startCreateAccount =
  (params: CreateAccountParams): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startCreateAccount: starting...');
      const {APP, BITPAY_ID} = getState();
      const salt = generateSalt();
      const hashedPassword = hashPassword(params.password);

      await AuthApi.register(APP.network, BITPAY_ID.session.csrfToken, {
        givenName: params.givenName,
        familyName: params.familyName,
        email: params.email,
        hashedPassword: hashedPassword,
        salt: salt,
        agreedToTOSandPP: params.agreedToTOSandPP,
        gCaptchaResponse: params.gCaptchaResponse,
      });

      // refresh session
      const session = await AuthApi.fetchSession(APP.network);

      // start pairing
      const secret = await AuthApi.generatePairingCode(
        APP.network,
        session.csrfToken,
      );
      await dispatch(startPairAndLoadUser(APP.network, secret));

      dispatch(BitPayIdActions.successCreateAccount());
      logger.info('startCreateAccount: success');
    } catch (err) {
      let errMsg;

      if (isRateLimitError(err)) {
        errMsg = err.response?.data.error || t('Rate limited');
      } else if (isAxiosError<RegisterErrorResponse>(err)) {
        errMsg =
          err.response?.data.message ||
          err.message ||
          t('An unexpected error occurred.');
      } else if (err instanceof Error) {
        errMsg = err.message || t('An unexpected error occurred.');
      } else {
        errMsg = JSON.stringify(err);
      }

      dispatch(BitPayIdActions.failedCreateAccount(upperFirst(errMsg)));
      logger.error(`startCreateAccount: ${errMsg}`);
    }
  };

export const startSendVerificationEmail =
  (): Effect => async (dispatch, getState) => {
    try {
      const {APP, BITPAY_ID} = getState();

      AuthApi.sendVerificationEmail(APP.network, BITPAY_ID.session.csrfToken);
    } catch (e: unknown) {
      const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
      useLogger().error(
        `An error occurred sending verification email: ${errorStr}`,
      );
    }
  };

export const startLogin =
  ({email, password, gCaptchaResponse}: StartLoginParams): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startLogin: starting...');
      dispatch(
        startOnGoingProcessModal(
          // t('Logging In')
          t(OnGoingProcessMessages.LOGGING_IN),
        ),
      );
      dispatch(BitPayIdActions.updateLoginStatus(null));

      const {APP, BITPAY_ID} = getState();

      // authenticate
      logger.info('startLogin: Authenticating BitPayID credentials...');
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
        logger.debug('startLogin: Two-factor authentication pending.');
        dispatch(BitPayIdActions.pendingLogin('twoFactorPending', session));
        return;
      }

      if (emailAuthenticationPending) {
        logger.debug('startLogin: Email authentication pending.');
        dispatch(
          BitPayIdActions.pendingLogin('emailAuthenticationPending', session),
        );
        return;
      }

      logger.info(
        'startLogin: Successfully authenticated BitPayID credentials.',
      );

      // start pairing
      const secret = await AuthApi.generatePairingCode(
        APP.network,
        session.csrfToken,
      );
      await dispatch(startPairAndLoadUser(APP.network, secret));

      // complete
      dispatch(
        Analytics.track('Log In User success', {
          type: 'basicAuth',
        }),
      );
      dispatch(BitPayIdActions.successLogin(APP.network, session));
    } catch (err) {
      batch(() => {
        let errMsg;

        if (isAxiosError<LoginErrorResponse>(err)) {
          errMsg = upperFirst(
            err.response?.data.message ||
              err.message ||
              t('An unexpected error occurred.'),
          );
        } else if (err instanceof Error) {
          errMsg = upperFirst(err.message);
        } else {
          errMsg = JSON.stringify(err);
        }

        logger.error(`startLogin: failed ${errMsg}`);
        dispatch(BitPayIdActions.failedLogin(errMsg));
      });
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

export const startTwoFactorAuth =
  (code: string): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startTwoFactorAuth: starting...');
      dispatch(
        startOnGoingProcessModal(
          // t('Logging In')
          t(OnGoingProcessMessages.LOGGING_IN),
        ),
      );

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
        Analytics.track('Log In User success', {
          type: 'twoFactorAuth',
        }),
      );
      dispatch(
        BitPayIdActions.successSubmitTwoFactorAuth(APP.network, session),
      );
      logger.info('startTwoFactorAuth: success');
    } catch (err) {
      batch(() => {
        let errMsg;

        if (isAxiosError<string>(err)) {
          errMsg = upperFirst(
            err.response?.data ||
              err.message ||
              t('An unexpected error occurred.'),
          );
        } else if (err instanceof Error) {
          errMsg = upperFirst(err.message);
        } else {
          errMsg = JSON.stringify(err);
        }

        logger.error(`startTwoFactorAuth: failed ${errMsg}`);
        dispatch(BitPayIdActions.failedSubmitTwoFactorAuth(errMsg));
      });
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

export const startTwoFactorPairing =
  (code: string): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startTwoFactorPairing: starting...');
      dispatch(
        startOnGoingProcessModal(
          // t('Logging In')
          t(OnGoingProcessMessages.LOGGING_IN),
        ),
      );

      const {APP, BITPAY_ID} = getState();
      const secret = await AuthApi.generatePairingCode(
        APP.network,
        BITPAY_ID.session.csrfToken,
      );

      await dispatch(startPairAndLoadUser(APP.network, secret, code));

      dispatch(BitPayIdActions.successSubmitTwoFactorPairing());
      logger.info('startTwoFactorPairing: success');
    } catch (err) {
      batch(() => {
        let errMsg;

        if (isAxiosError<any>(err)) {
          errMsg = upperFirst(
            err.response?.data ||
              err.message ||
              t('An unexpected error occurred.'),
          );
        } else if (err instanceof Error) {
          errMsg = upperFirst(err.message);
        } else {
          errMsg = JSON.stringify(err);
        }

        logger.error(`startTwoFactorAuth: failed ${errMsg}`);
        dispatch(BitPayIdActions.failedSubmitTwoFactorPairing(errMsg));
      });
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

export const startEmailPairing =
  (csrfToken: string): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startEmailPairing: starting...');
      const {APP} = getState();
      dispatch(
        startOnGoingProcessModal(
          // t('Logging In')
          t(OnGoingProcessMessages.LOGGING_IN),
        ),
      );

      const secret = await AuthApi.generatePairingCode(APP.network, csrfToken);

      await dispatch(startPairAndLoadUser(APP.network, secret));

      dispatch(
        Analytics.track('Log In User success', {
          type: 'emailAuth',
        }),
      );
      dispatch(BitPayIdActions.successEmailPairing());
      logger.info('startEmailPairing: success');
    } catch (err) {
      batch(() => {
        const errorStr =
          err instanceof Error ? err.message : JSON.stringify(err);
        logger.error(`startEmailPairing: failed ${errorStr}`);
        dispatch(BitPayIdActions.failedEmailPairing());
      });
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

export const startDeeplinkPairing =
  (secret: string, code?: string): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const logger = useLogger();
    const state = getState();
    const network = state.APP.network;

    try {
      logger.info('startDeeplinkPairing: starting...');
      dispatch(
        AppEffects.startOnGoingProcessModal(
          // t('Pairing')
          t(OnGoingProcessMessages.PAIRING),
        ),
      );
      await dispatch(startPairAndLoadUser(network, secret, code));
      logger.info('startDeeplinkPairing: success');
    } catch (err) {
      let errMsg;

      if (isAxiosError(err)) {
        errMsg = JSON.stringify(err.response?.data || err.message);
      } else if (err instanceof Error) {
        errMsg = err.message;
      } else {
        errMsg = JSON.stringify(err);
      }

      logger.error(`startDeeplinkPairing: failed ${errMsg}`);
      dispatch(BitPayIdActions.failedPairingBitPayId(errMsg));
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

const startPairAndLoadUser =
  (network: Network, secret: string, code?: string): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startPairAndLoaduser: starting...');
      const token = await AuthApi.pair(secret, code);

      dispatch(BitPayIdActions.successPairingBitPayId(network, token));
      logger.info('startPairAndLoaduser: Successfully paired with BitPayID.');
    } catch (e: unknown) {
      const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
      logger.error(`startPairAndLoaduser: failed ${errorStr}`);
      throw e;
    }

    try {
      logger.info('startPairAndLoaduser: fetching initial user data...');
      const {APP, BITPAY_ID} = getState();
      const token = BITPAY_ID.apiToken[APP.network];

      const {errors, data} = await UserApi.fetchInitialUserData(token);

      // handle partial errors
      if (errors) {
        const msg = errors
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join(',\n');

        logger.error(
          `startPairAndLoadUser: One or more errors occurred while fetching initial user data: ${msg}`,
        );
      }

      dispatch(startBitPayIdStoreInit(data.user));
      dispatch(CardEffects.startCardStoreInit(data.user));
      dispatch(AppEffects.initializeBrazeContent());
      dispatch(ShopEffects.startFetchCatalog());

      if (data.user.basicInfo) {
        const {eid, email, name} = data.user.basicInfo;

        dispatch(Analytics.identify(eid, {email, name}));
      }
      logger.info('startPairAndLoadUser: Successfully initial user data.');
    } catch (err) {
      let errMsg;

      if (err instanceof Error) {
        errMsg = `${err.name}: ${err.message}`;
      } else {
        errMsg = JSON.stringify(err);
      }
      logger.error(`startPairAndLoadUser: failed ${errMsg}`);
    }
  };

export const startDisconnectBitPayId =
  (): Effect => async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startDisconnectBitPayId: starting...');
      const {APP, BITPAY_ID} = getState();
      const {isAuthenticated, csrfToken} = BITPAY_ID.session;

      if (isAuthenticated && csrfToken) {
        await AuthApi.logout(APP.network, csrfToken);
      }

      dispatch(Analytics.track('Log Out User success', {}));
      dispatch(BitPayIdActions.bitPayIdDisconnected(APP.network));
      logger.info('startDisconnectBitPayId: success');
    } catch (err) {
      // log but swallow this error
      const errorStr = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(
        `startDisconnectBitPayId: An error occured while logging out: ${errorStr}`,
      );
    }

    try {
      logger.info('startDisconnectBitPayId: clear Dosh user');
      Dosh.clearUser();
    } catch (e) {
      // log but swallow this error
      const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
      logger.error(
        `startDisconnectBitPayId: An error occured while clearing Dosh user: ${errorStr}`,
      );
      return;
    }
  };

export const startFetchBasicInfo =
  (token: string): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startFetchBasicInfo: starting...');
      const {APP} = getState();
      const user = await UserApi.fetchBasicInfo(token);

      dispatch(BitPayIdActions.successFetchBasicInfo(APP.network, user));
      logger.info('startFetchBasicInfo: success');
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(`startFetchBasicInfo: failed ${errorStr}`);
      dispatch(BitPayIdActions.failedFetchBasicInfo());
    }
  };

export const startFetchDoshToken = (): Effect => async (dispatch, getState) => {
  const logger = useLogger();
  try {
    logger.info('startFetchDoshToken: starting...');
    const {APP, BITPAY_ID} = getState();
    const doshToken = await UserApi.fetchDoshToken(
      BITPAY_ID.apiToken[APP.network],
    );

    dispatch(BitPayIdActions.successFetchDoshToken(APP.network, doshToken));
    logger.info('startFetchDoshToken: success');
  } catch (err) {
    batch(() => {
      const errorStr = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(`startFetchDoshToken: failed ${errorStr}`);
      dispatch(BitPayIdActions.failedFetchDoshToken());
    });
  }
};

export const startSubmitForgotPasswordEmail =
  ({
    email,
    gCaptchaResponse,
  }: {
    email: string;
    gCaptchaResponse?: string;
  }): Effect =>
  async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    const errMsg = t('Error sending forgot password request.');

    try {
      dispatch(BitPayIdActions.resetForgotPasswordEmailStatus());
      dispatch(
        startOnGoingProcessModal(
          // t('Sending Email')
          t(OnGoingProcessMessages.SENDING_EMAIL),
        ),
      );
      const data = await AuthApi.submitForgotPasswordEmail(
        APP.network,
        BITPAY_ID.session.csrfToken,
        email,
        gCaptchaResponse,
      );
      if (data.success) {
        dispatch(
          BitPayIdActions.forgotPasswordEmailStatus(
            'success',
            t(
              "Email sent. If an account with that email address exists, you'll receive an email with a link to reset your password.",
            ),
          ),
        );
      } else {
        dispatch(
          BitPayIdActions.forgotPasswordEmailStatus(
            'failed',
            data.message || errMsg,
          ),
        );
      }
    } catch (e) {
      dispatch(BitPayIdActions.forgotPasswordEmailStatus('failed', errMsg));
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

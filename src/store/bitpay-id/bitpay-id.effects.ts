import {upperFirst} from 'lodash';
import {batch} from 'react-redux';
import AuthApi from '../../api/auth';
import {
  LoginErrorResponse,
  RegisterErrorResponse,
} from '../../api/auth/auth.types';
import UserApi from '../../api/user';
import {InitialUserData} from '../../api/user/user.types';
import {Network} from '../../constants';
import Dosh from '../../lib/dosh';
import {isAxiosError, isRateLimitError} from '../../utils/axios';
import {generateSalt, hashPassword} from '../../utils/password';
import {AppEffects} from '../app/';
import {Analytics} from '../analytics/analytics.effects';
import {startOnGoingProcessModal} from '../app/app.effects';
import {CardEffects} from '../card';
import {Effect} from '../index';
import {LogActions} from '../log';
import {ShopEffects} from '../shop';
import {BitPayIdActions} from './index';
import {t} from 'i18next';
import BitPayIdApi from '../../api/bitpay';
import {ReceivingAddress, SecuritySettings} from './bitpay-id.models';
import {getCoinAndChainFromCurrencyCode} from '../../navigation/bitpay-id/utils/bitpay-id-utils';
import axios from 'axios';
import {BASE_BITPAY_URLS} from '../../constants/config';
import Braze from 'react-native-appboy-sdk';
import {dismissOnGoingProcessModal, setBrazeEid} from '../app/app.actions';

interface StartLoginParams {
  email: string;
  password: string;
  gCaptchaResponse?: string;
}

export const startBitPayIdStoreInit =
  (initialData: InitialUserData): Effect<void> =>
  (dispatch, getState) => {
    const {APP} = getState();
    const {basicInfo: user} = initialData;

    if (user) {
      const {eid, name, referralCode} = user;
      let {email, givenName, familyName} = user;

      if (email) {
        email = email.trim();
      }

      if (!givenName && !familyName && name) {
        const [first, ...rest] = name.split(' ');

        givenName = first.trim();

        if (rest.length) {
          familyName = rest[rest.length - 1].trim();
        }
      }

      dispatch(setBrazeEid(eid));
      dispatch(
        Analytics.identify(eid, {
          email,
          firstName: givenName,
          lastName: familyName,
          'Cardholder Unique Referral Code': referralCode,
        }),
      );

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
  agreedToMarketingCommunications: boolean;
  gCaptchaResponse?: string;
}

export const startCreateAccount =
  (params: CreateAccountParams): Effect =>
  async (dispatch, getState) => {
    try {
      dispatch(startOnGoingProcessModal('CREATING_ACCOUNT'));
      const {APP, BITPAY_ID} = getState();
      const salt = generateSalt();
      const hashedPassword = hashPassword(params.password);

      if (params.agreedToMarketingCommunications) {
        Braze.setEmailNotificationSubscriptionType(
          Braze.NotificationSubscriptionTypes.OPTED_IN,
        );
      }

      await AuthApi.register(APP.network, BITPAY_ID.session.csrfToken, {
        givenName: params.givenName,
        familyName: params.familyName,
        email: params.email,
        hashedPassword: hashedPassword,
        salt: salt,
        agreedToTOSandPP: params.agreedToTOSandPP,
        optInEmailMarketing: params.agreedToMarketingCommunications,
        attribute: params.agreedToMarketingCommunications
          ? 'App Signup'
          : undefined,
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
      dispatch(LogActions.error('Failed to create account.'));
      dispatch(LogActions.error(JSON.stringify(err)));
    } finally {
      dispatch(dismissOnGoingProcessModal());
    }
  };

export const startSendVerificationEmail =
  (): Effect => async (dispatch, getState) => {
    try {
      const {APP, BITPAY_ID} = getState();

      AuthApi.sendVerificationEmail(APP.network, BITPAY_ID.session.csrfToken);
    } catch (err) {
      dispatch(
        LogActions.error('An error occurred sending verification email.'),
      );
      dispatch(LogActions.error(JSON.stringify(err)));
    }
  };

export const startLogin =
  ({email, password, gCaptchaResponse}: StartLoginParams): Effect =>
  async (dispatch, getState) => {
    try {
      dispatch(startOnGoingProcessModal('LOGGING_IN'));
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
          console.error(errMsg);
        } else {
          console.error(err);
        }

        dispatch(LogActions.error('Login failed.'));
        dispatch(LogActions.error(JSON.stringify(err)));
        dispatch(BitPayIdActions.failedLogin(errMsg));
      });
    } finally {
      dispatch(dismissOnGoingProcessModal());
    }
  };

export const startTwoFactorAuth =
  (code: string): Effect =>
  async (dispatch, getState) => {
    try {
      dispatch(startOnGoingProcessModal('LOGGING_IN'));

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
    } catch (err) {
      batch(() => {
        let errMsg;

        if (isAxiosError<string>(err)) {
          errMsg = upperFirst(
            err.response?.data ||
              err.message ||
              t('An unexpected error occurred.'),
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
      dispatch(dismissOnGoingProcessModal());
    }
  };

export const startTwoFactorPairing =
  (code: string): Effect =>
  async (dispatch, getState) => {
    try {
      dispatch(startOnGoingProcessModal('LOGGING_IN'));

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
              t('An unexpected error occurred.'),
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
      dispatch(dismissOnGoingProcessModal());
    }
  };

export const startEmailPairing =
  (csrfToken: string): Effect =>
  async (dispatch, getState) => {
    try {
      const {APP} = getState();
      dispatch(startOnGoingProcessModal('LOGGING_IN'));

      const secret = await AuthApi.generatePairingCode(APP.network, csrfToken);

      await dispatch(startPairAndLoadUser(APP.network, secret));

      dispatch(
        Analytics.track('Log In User success', {
          type: 'emailAuth',
        }),
      );
      dispatch(BitPayIdActions.successEmailPairing());
    } catch (err) {
      batch(() => {
        console.error(err);
        dispatch(LogActions.error('Pairing from email authentication failed.'));
        dispatch(LogActions.error(JSON.stringify(err)));
        dispatch(BitPayIdActions.failedEmailPairing());
      });
    } finally {
      dispatch(dismissOnGoingProcessModal());
    }
  };

export const startDeeplinkPairing =
  (secret: string, code?: string): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState();
    const network = state.APP.network;

    try {
      dispatch(AppEffects.startOnGoingProcessModal('PAIRING'));
      await dispatch(startPairAndLoadUser(network, secret, code));
    } catch (err) {
      let errMsg;

      if (isAxiosError(err)) {
        errMsg = JSON.stringify(err.response?.data || err.message);
      } else if (err instanceof Error) {
        errMsg = err.message;
      } else {
        errMsg = JSON.stringify(err);
      }

      console.error(errMsg);
      dispatch(LogActions.error('Pairing failed.'));
      dispatch(LogActions.error(JSON.stringify(err)));
      dispatch(BitPayIdActions.failedPairingBitPayId(errMsg));
    } finally {
      dispatch(dismissOnGoingProcessModal());
    }
  };

const startPairAndLoadUser =
  (network: Network, secret: string, code?: string): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    try {
      const token = await AuthApi.pair(secret, code);

      dispatch(BitPayIdActions.successPairingBitPayId(network, token));
      dispatch(LogActions.info('Successfully paired with BitPayID.'));
    } catch (err) {
      dispatch(LogActions.error('An error occurred while pairing.'));
      dispatch(LogActions.error(JSON.stringify(err)));

      throw err;
    }

    try {
      const {APP, BITPAY_ID} = getState();
      const token = BITPAY_ID.apiToken[APP.network];

      const {errors, data} = await UserApi.fetchInitialUserData(token);

      // handle partial errors
      if (errors) {
        const msg = errors
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join(',\n');

        dispatch(
          LogActions.error(
            'One or more errors occurred while fetching initial user data:\n' +
              msg,
          ),
        );
      }

      dispatch(startBitPayIdStoreInit(data.user));
      dispatch(CardEffects.startCardStoreInit(data.user));
      dispatch(ShopEffects.startFetchCatalog());
      dispatch(ShopEffects.startSyncGiftCards());
    } catch (err) {
      let errMsg;

      if (err instanceof Error) {
        errMsg = `${err.name}: ${err.message}`;
      } else {
        errMsg = JSON.stringify(err);
      }

      dispatch(LogActions.error('An error occurred while fetching user data.'));
      dispatch(LogActions.error(errMsg));
    }
  };

export const startDisconnectBitPayId =
  (): Effect => async (dispatch, getState) => {
    try {
      const {APP, BITPAY_ID} = getState();
      const {isAuthenticated, csrfToken} = BITPAY_ID.session;

      if (isAuthenticated && csrfToken) {
        await AuthApi.logout(APP.network, csrfToken);
      }

      dispatch(Analytics.track('Log Out User success', {}));
      dispatch(BitPayIdActions.bitPayIdDisconnected(APP.network));
    } catch (err) {
      // log but swallow this error
      dispatch(LogActions.error('An error occurred while logging out.'));
      dispatch(LogActions.error(JSON.stringify(err)));
    }

    try {
      Dosh.clearUser();
    } catch (err) {
      // log but swallow this error
      dispatch(LogActions.error('An error occured while clearing Dosh user.'));
      dispatch(LogActions.error(JSON.stringify(err)));
      return;
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

export const startFetchSecuritySettings =
  (): Effect<Promise<SecuritySettings>> => async (dispatch, getState) =>
    (async () => {
      try {
        const {APP, BITPAY_ID} = getState();
        const securitySettings = await BitPayIdApi.apiCall(
          BITPAY_ID.apiToken[APP.network],
          'getSecuritySettings',
        );
        dispatch(
          BitPayIdActions.successFetchSecuritySettings(
            APP.network,
            securitySettings,
          ),
        );
        return securitySettings;
      } catch (err) {
        batch(() => {
          dispatch(LogActions.error('Failed to fetch security settings.'));
          dispatch(LogActions.error(JSON.stringify(err)));
        });
        throw err;
      }
    })();

export const startToggleTwoFactorAuthEnabled =
  (twoFactorCode: string): Effect<Promise<void>> =>
  async (dispatch, getState) =>
    (async () => {
      try {
        const {APP, BITPAY_ID} = getState();
        const newSecuritySettings = await BitPayIdApi.apiCall(
          BITPAY_ID.apiToken[APP.network],
          'toggleTwoFactorAuthEnabled',
          {code: twoFactorCode},
        );
        dispatch(
          BitPayIdActions.successFetchSecuritySettings(
            APP.network,
            newSecuritySettings,
          ),
        );
      } catch (err) {
        batch(() => {
          dispatch(LogActions.error('Failed to toggle two-factor settings.'));
          dispatch(LogActions.error(JSON.stringify(err)));
        });
        throw err;
      }
    })();

export const startFetchReceivingAddresses =
  (params?: {
    email?: string;
    currency?: string;
  }): Effect<Promise<ReceivingAddress[]>> =>
  async (dispatch, getState) =>
    (async () => {
      try {
        const {APP, BITPAY_ID} = getState();
        const accountAddresses: ReceivingAddress[] = BITPAY_ID.user[APP.network]
          ? await BitPayIdApi.apiCall(
              BITPAY_ID.apiToken[APP.network],
              params ? 'findWalletsByEmail' : 'findWallets',
              params,
            )
          : await axios
              .post(`${BASE_BITPAY_URLS[APP.network]}/api/v2`, {
                method: 'findWalletsByEmail',
                params: JSON.stringify(params),
              })
              .then(res => res.data?.data || res.data);
        const receivingAddresses = accountAddresses
          .filter(address => address.usedFor?.payToEmail)
          .map(address => {
            const {coin, chain} = getCoinAndChainFromCurrencyCode(
              address.currency,
            );
            return {
              ...address,
              coin,
              chain,
            };
          });
        dispatch(
          BitPayIdActions.successFetchReceivingAddresses(
            APP.network,
            receivingAddresses,
          ),
        );
        return receivingAddresses;
      } catch (err) {
        batch(() => {
          dispatch(LogActions.error('Failed to fetch receiving addresses.'));
          dispatch(LogActions.error(JSON.stringify(err)));
        });
        throw err;
      }
    })();

export const startUpdateReceivingAddresses =
  (
    newReceivingAddresses: ReceivingAddress[],
    twoFactorCode: string,
  ): Effect<Promise<void>> =>
  async (dispatch, getState) =>
    (async () => {
      try {
        const {APP, BITPAY_ID} = getState();
        const wallets = newReceivingAddresses.map(address => ({
          ...address,
          use: 'payToEmail',
        }));
        await BitPayIdApi.apiCall(
          BITPAY_ID.apiToken[APP.network],
          'setPayToEmailWallets',
          {
            wallets,
            twoFactorCode,
          },
        );
        await dispatch(startFetchReceivingAddresses());
      } catch (err) {
        batch(() => {
          dispatch(LogActions.error('Failed to update receiving addresses.'));
          dispatch(LogActions.error(JSON.stringify(err)));
        });
        throw err;
      }
    })();

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
      dispatch(startOnGoingProcessModal('SENDING_EMAIL'));
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
      dispatch(dismissOnGoingProcessModal());
    }
  };

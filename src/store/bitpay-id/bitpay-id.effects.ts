import {upperFirst} from 'lodash';
import AuthApi from '../../api/auth';
import {
  LoginErrorResponse,
  RegisterErrorResponse,
} from '../../api/auth/auth.types';
import UserApi from '../../api/user';
import {BasicUserInfo, InitialUserData} from '../../api/user/user.types';
import {Network} from '../../constants';
import Dosh from '../../lib/dosh';
import {MixpanelWrapper} from '../../lib/Mixpanel';
import {BrazeWrapper} from '../../lib/Braze';
import {isAxiosError, isRateLimitError} from '../../utils/axios';
import {generateSalt, hashPassword} from '../../utils/password';
import {Analytics} from '../analytics/analytics.effects';
import {isAnonymousBrazeEid, setEmailNotifications} from '../app/app.effects';
import {CardActions, CardEffects} from '../card';
import {Effect} from '../index';
import {LogActions} from '../log';
import {ShopActions, ShopEffects} from '../shop';
import {BitPayIdActions} from './index';
import {t} from 'i18next';
import BitPayIdApi from '../../api/bitpay';
import {ReceivingAddress, SecuritySettings, Session} from './bitpay-id.models';
import {getCoinAndChainFromCurrencyCode} from '../../navigation/bitpay-id/utils/bitpay-id-utils';
import axios from 'axios';
import {BASE_BITPAY_URLS} from '../../constants/config';
import {setBrazeEid, setEmailNotificationsAccepted} from '../app/app.actions';
import {DeviceEmitterEvents} from '../../constants/device-emitter-events';
import {DeviceEventEmitter} from 'react-native';
import {
  getPasskeyCredentials,
  getPasskeyStatus,
  signInWithPasskey,
} from '../../utils/passkey';
import {
  setPasskeyCredentials,
  setPasskeyStatus,
} from '../../store/bitpay-id/bitpay-id.actions';
import {logManager} from '../../managers/LogManager';
import {ongoingProcessManager} from '../../managers/OngoingProcessManager';
import CookieManager from '@react-native-cookies/cookies';

interface StartLoginParams {
  email?: string;
  password?: string;
  gCaptchaResponse?: string;
}

export const startBitPayIdAnalyticsInit =
  (
    user: BasicUserInfo,
    agreedToMarketingCommunications?: boolean,
  ): Effect<void> =>
  async (dispatch, getState) => {
    const {APP} = getState();
    const acceptedEmailNotifications = !!APP.emailNotifications?.accepted;
    const notificationsAccepted = APP.notificationsAccepted;

    if (user) {
      const {eid, name} = user;
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

      // Check if Braze EID exists and not the same
      // Merge ONLY anonymous EIDs
      // If login with any other BitPayID, we shouldn't delete/merge previous user
      // Only switch to a new EID with setBrazeEid
      if (
        APP.brazeEid &&
        APP.brazeEid !== eid &&
        isAnonymousBrazeEid(APP.brazeEid)
      ) {
        Analytics.startMergingUser();
        // Should migrate the user to the new EID
        logManager.info('Merging current user to new EID: ', eid);
        try {
          await BrazeWrapper.merge(APP.brazeEid, eid);
          // Emit event to delete old user
          DeviceEventEmitter.emit(
            DeviceEmitterEvents.SHOULD_DELETE_BRAZE_USER,
            {
              oldEid: APP.brazeEid,
              newEid: eid,
            },
          );
        } catch (error) {
          const errMsg =
            error instanceof Error ? error.message : JSON.stringify(error);
          logManager.error(`Merging current user failed: ${errMsg}`);
        }
      }
      dispatch(setBrazeEid(eid));
      await dispatch(
        Analytics.identify(eid, {
          email,
          firstName: givenName,
          lastName: familyName,
        }),
      );
      // Set email notifications and push notifications after Braze EID is set
      dispatch(
        setEmailNotifications(
          acceptedEmailNotifications &&
            user.optInEmailMarketing &&
            user.verified,
          email,
          agreedToMarketingCommunications,
        ),
      );
    }
  };

export const startBitPayIdStoreInit =
  (
    initialData: InitialUserData,
    agreedToMarketingCommunications?: boolean,
  ): Effect<void> =>
  async (dispatch, getState) => {
    const {APP} = getState();
    const {basicInfo: user} = initialData;
    dispatch(BitPayIdActions.successInitializeStore(APP.network, initialData));
    try {
      dispatch(
        startBitPayIdAnalyticsInit(user, agreedToMarketingCommunications),
      );
    } catch (err) {
      logManager.error('Failed init user analytics');
      logManager.error(JSON.stringify(err));
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
      ongoingProcessManager.show('CREATING_ACCOUNT');
      const {APP, BITPAY_ID} = getState();
      const salt = generateSalt();
      const hashedPassword = hashPassword(params.password);

      const agreedToMarketingCommunications =
        params.agreedToMarketingCommunications || false;

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
      await dispatch(
        startPairAndLoadUser(
          APP.network,
          secret,
          undefined,
          agreedToMarketingCommunications,
        ),
      );

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

      CookieManager.clearAll();
      dispatch(BitPayIdActions.failedCreateAccount(upperFirst(errMsg)));
      logManager.error('Failed to create account.');
      logManager.error(JSON.stringify(err));
    } finally {
      ongoingProcessManager.hide();
    }
  };

export const checkLoginWithPasskey =
  (
    email: string | undefined,
    network: Network,
    csrfToken: string,
  ): Effect<Promise<boolean>> =>
  async dispatch => {
    let _passkey = false;

    if (email) {
      // check if user has passkey
      const {passkey} = await getPasskeyStatus(email, network, csrfToken);
      dispatch(setPasskeyStatus(passkey));
      _passkey = passkey;
    }

    if (email && !_passkey) {
      return Promise.resolve(false);
    }

    try {
      const signedStatus = await signInWithPasskey(network, csrfToken, email);
      dispatch(setPasskeyStatus(signedStatus));
      if (!signedStatus) {
        const errMsg = 'Failed to sign in with Passkey. Please try again.';
        return Promise.reject(new Error(errMsg));
      }
      return Promise.resolve(true);
    } catch (err: any) {
      const errMsg = err.message || JSON.stringify(err);

      // No show error, user canceled
      if (!errMsg.includes('error 1001')) {
        return Promise.reject(new Error(errMsg));
      }
      return Promise.resolve(false);
    }
  };

export const startLogin =
  ({email, password, gCaptchaResponse}: StartLoginParams): Effect =>
  async (dispatch, getState) => {
    try {
      ongoingProcessManager.show('LOGGING_IN');
      dispatch(BitPayIdActions.updateLoginStatus(null));

      const {APP, BITPAY_ID} = getState();

      let typeLogin = 'basicAuth';
      let session: Session | null = null;

      logManager.info('[startLogin] Authenticating...');
      const signedInPasskey: boolean = await dispatch(
        checkLoginWithPasskey(email, APP.network, BITPAY_ID.session.csrfToken),
      );

      if (signedInPasskey) {
        typeLogin = 'passkeyAuth';
        logManager.info(
          '[startLogin] Successfully authenticated with Passkey: ',
        );
        session = await AuthApi.fetchSession(APP.network);
      } else {
        if (!email || !password) {
          return;
        }
        // authenticate
        logManager.info('[startLogin] Authenticating BitPayID credentials...');
        const {twoFactorPending, emailAuthenticationPending} =
          await AuthApi.login(
            APP.network,
            email,
            password,
            BITPAY_ID.session.csrfToken,
            gCaptchaResponse,
          );

        // refresh session
        session = await AuthApi.fetchSession(APP.network);
        if (twoFactorPending) {
          logManager.debug('[startLogin] Two-factor authentication pending.');
          dispatch(BitPayIdActions.pendingLogin('twoFactorPending', session));
          return;
        }

        if (emailAuthenticationPending) {
          logManager.debug('[startLogin] Email authentication pending.');
          dispatch(
            BitPayIdActions.pendingLogin('emailAuthenticationPending', session),
          );
          return;
        }

        logManager.info(
          '[startLogin] Successfully authenticated BitPayID credentials.',
        );
      }

      // start pairing
      const secret = await AuthApi.generatePairingCode(
        APP.network,
        session.csrfToken,
      );
      await dispatch(startPairAndLoadUser(APP.network, secret));

      if (signedInPasskey) {
        const {BITPAY_ID: bitpay_id} = getState();
        // Updating lists of credentials
        const {credentials} = await getPasskeyCredentials(
          bitpay_id.user[APP.network].email,
          APP.network,
          session.csrfToken,
        );
        dispatch(setPasskeyCredentials(credentials));
      }

      // complete
      dispatch(
        Analytics.track('Log In User success', {
          type: typeLogin,
        }),
      );

      CookieManager.clearAll();
      dispatch(CardActions.isJoinedWaitlist(false));
      dispatch(BitPayIdActions.successLogin(APP.network, session));
    } catch (err: any) {
      let errMsg;

      if (isAxiosError<LoginErrorResponse>(err)) {
        errMsg = upperFirst(
          err.response?.data.message ||
            err.message ||
            t('An unexpected error occurred.'),
        );
        logManager.error('[startLogin]', errMsg);
      } else {
        errMsg = err.message || JSON.stringify(err);
        logManager.error('[startLogin]', err.status, errMsg);
      }

      dispatch(BitPayIdActions.failedLogin(errMsg));
    } finally {
      ongoingProcessManager.hide();
    }
  };

export const startTwoFactorAuth =
  (code: string): Effect =>
  async (dispatch, getState) => {
    try {
      ongoingProcessManager.show('LOGGING_IN');

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

      logManager.error('Two factor authentication failed.');
      logManager.error(JSON.stringify(err));
      dispatch(BitPayIdActions.failedSubmitTwoFactorAuth(errMsg));
    } finally {
      ongoingProcessManager.hide();
    }
  };

export const startTwoFactorPairing =
  (code: string): Effect =>
  async (dispatch, getState) => {
    try {
      ongoingProcessManager.show('LOGGING_IN');

      const {APP, BITPAY_ID} = getState();
      const secret = await AuthApi.generatePairingCode(
        APP.network,
        BITPAY_ID.session.csrfToken,
      );

      await dispatch(startPairAndLoadUser(APP.network, secret, code));

      dispatch(BitPayIdActions.successSubmitTwoFactorPairing());
    } catch (err) {
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

      logManager.error('Pairing with two factor failed.');
      logManager.error(JSON.stringify(err));
      dispatch(
        BitPayIdActions.failedSubmitTwoFactorPairing(JSON.stringify(errMsg)),
      );
    } finally {
      ongoingProcessManager.hide();
    }
  };

export const startEmailPairing =
  (csrfToken: string): Effect =>
  async (dispatch, getState) => {
    try {
      ongoingProcessManager.show('LOGGING_IN');

      const {APP} = getState();

      const secret = await AuthApi.generatePairingCode(APP.network, csrfToken);

      await dispatch(startPairAndLoadUser(APP.network, secret));

      dispatch(
        Analytics.track('Log In User success', {
          type: 'emailAuth',
        }),
      );
      dispatch(BitPayIdActions.successEmailPairing());
    } catch (err) {
      console.error(err);
      logManager.error('Pairing from email authentication failed.');
      logManager.error(JSON.stringify(err));
      dispatch(BitPayIdActions.failedEmailPairing());
    } finally {
      ongoingProcessManager.hide();
    }
  };

export const startDeeplinkPairing =
  (secret: string, code?: string): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    ongoingProcessManager.show('PAIRING');

    const state = getState();
    const network = state.APP.network;

    try {
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
      logManager.error('Pairing failed.');
      logManager.error(JSON.stringify(err));
      dispatch(BitPayIdActions.failedPairingBitPayId(errMsg));
    } finally {
      ongoingProcessManager.hide();
    }
  };

export const startPairAndLoadUser =
  (
    network: Network,
    secret: string,
    code?: string,
    agreedToMarketingCommunications?: boolean,
  ): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    try {
      const token = await AuthApi.pair(secret, code);

      dispatch(BitPayIdActions.successPairingBitPayId(network, token));
      logManager.info('Successfully paired with BitPayID.');
    } catch (err) {
      logManager.error('An error occurred while pairing.');
      logManager.error(JSON.stringify(err));

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

        logManager.error(
          'One or more errors occurred while fetching initial user data:\n' +
            msg,
        );
      }

      dispatch(
        startBitPayIdStoreInit(data.user, agreedToMarketingCommunications),
      );
      dispatch(CardEffects.startCardStoreInit(data.user));
      dispatch(ShopEffects.startFetchCatalog());
      dispatch(ShopEffects.startSyncGiftCards()).then(() =>
        dispatch(ShopEffects.redeemSyncedGiftCards()),
      );
      dispatch(ShopEffects.startGetBillPayAccounts()).catch(_ => {});
    } catch (err) {
      let errMsg;

      if (err instanceof Error) {
        errMsg = `${err.name}: ${err.message}`;
      } else {
        errMsg = JSON.stringify(err);
      }

      logManager.error('An error occurred while fetching user data.');
      logManager.error(errMsg);
    }
  };

export const startDisconnectBitPayId =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    ongoingProcessManager.show('LOGGING_OUT');

    const {APP} = getState();

    try {
      const {isAuthenticated, csrfToken} =
        (await AuthApi.fetchSession(APP.network)) || {};

      if (isAuthenticated && csrfToken) {
        await AuthApi.logout(APP.network, csrfToken);
        dispatch(Analytics.track('Log Out User success', {}));
      }
      dispatch(setPasskeyStatus(false));
      dispatch(setPasskeyCredentials([]));
    } catch (err) {
      // log but swallow this error
      logManager.debug('An error occurred while logging out.');
      logManager.debug(JSON.stringify(err));
    }

    try {
      const session = await AuthApi.fetchSession(APP.network);

      dispatch(BitPayIdActions.successFetchSession(session));
    } catch (err) {
      // log but swallow this error
      logManager.debug('An error occurred while refreshing session.');
      logManager.debug(JSON.stringify(err));
    }

    try {
      await MixpanelWrapper.reset();
    } catch (err) {
      logManager.debug('An error occured while clearing Mixpanel data.');
      logManager.debug(JSON.stringify(err));
    }

    try {
      Dosh.clearUser();
    } catch (err) {
      // log but swallow this error
      logManager.debug('An error occured while clearing Dosh user.');
      logManager.debug(JSON.stringify(err));
    }

    // Braze doesn't recommend changeUser to a new EID
    // Keep tracking current EID as part of logout
    // until login with a different user or uninstall the app

    dispatch(BitPayIdActions.bitPayIdDisconnected(APP.network));
    dispatch(CardActions.isJoinedWaitlist(false));
    dispatch(ShopActions.clearedBillPayAccounts({network: APP.network}));
    dispatch(ShopActions.clearedBillPayPayments({network: APP.network}));
    dispatch(setEmailNotificationsAccepted(false, null)); // Only uncheck accepted, keep subscription status
    ongoingProcessManager.hide();
  };

export const startFetchBasicInfo =
  (
    token: string,
    params: {includeExternalData?: boolean} = {
      includeExternalData: false,
    },
  ): Effect<Promise<BasicUserInfo>> =>
  async (dispatch, getState) => {
    try {
      const {APP} = getState();
      const user = await UserApi.fetchBasicInfo(token, {
        ...params,
        includeMethodData: true,
      });
      dispatch(BitPayIdActions.successFetchBasicInfo(APP.network, user));
      return user;
    } catch (err) {
      logManager.error('Failed to fetch basic user info');
      logManager.error(JSON.stringify(err));
      dispatch(BitPayIdActions.failedFetchBasicInfo());
      throw err;
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
    logManager.error('Failed to fetch dosh token.');
    logManager.error(JSON.stringify(err));
    dispatch(BitPayIdActions.failedFetchDoshToken());
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
        logManager.error('Failed to fetch security settings.');
        logManager.error(JSON.stringify(err));
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
        logManager.error('Failed to toggle two-factor settings.');
        logManager.error(JSON.stringify(err));
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
        logManager.error('Failed to fetch receiving addresses.');
        logManager.error(JSON.stringify(err));
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
        logManager.error('Failed to update receiving addresses.');
        logManager.error(JSON.stringify(err));
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
      ongoingProcessManager.show('SENDING_EMAIL');
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
      CookieManager.clearAll();
    } catch (e) {
      dispatch(BitPayIdActions.forgotPasswordEmailStatus('failed', errMsg));
    } finally {
      ongoingProcessManager.hide();
    }
  };

export const startResetMethodUser =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    await BitPayIdApi.getInstance()
      .request('resetMethodUser', BITPAY_ID.apiToken[APP.network])
      .then(res => {
        if (res?.data?.error) {
          throw new Error(res.data.error);
        }
        dispatch(BitPayIdActions.successResetMethodUser(APP.network));
        return res.data.data as any;
      })
      .catch(err => {
        logManager.error(`failed [startResetMethodUser]: ${err.message}`);
        throw err;
      });
  };

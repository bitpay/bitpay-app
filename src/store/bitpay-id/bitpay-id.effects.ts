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
import {ShopActions, ShopEffects} from '../shop';
import {BitPayIdActions} from './index';
import {t} from 'i18next';
import BitPayIdApi from '../../api/bitpay';
import {ReceivingAddress, SecuritySettings, Session} from './bitpay-id.models';
import {getCoinAndChainFromCurrencyCode} from '../../navigation/bitpay-id/utils/bitpay-id-utils';
import axios from 'axios';
import {BASE_BITPAY_URLS, NO_CACHE_HEADERS} from '../../constants/config';
import {setBrazeEid, setEmailNotificationsAccepted} from '../app/app.actions';
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
import {clearAllCookiesEverywhere} from '../../utils/cookieAuth';
import {sleep} from '../../utils/helper-methods';

interface StartLoginParams {
  email?: string;
  password?: string;
  gCaptchaResponse?: string;
}

export const startBitPayIdAnalyticsInit =
  (user: BasicUserInfo): Effect<void> =>
  async (dispatch, getState) => {
    const {APP} = getState();
    const acceptedEmailNotifications = !!APP.emailNotifications?.accepted;

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

      const previousBrazeEid = APP.brazeEid;
      dispatch(setBrazeEid(eid));
      await dispatch(
        Analytics.identify(eid, {
          email,
          firstName: givenName,
          lastName: familyName,
        }),
      );

      if (
        previousBrazeEid &&
        previousBrazeEid !== eid &&
        isAnonymousBrazeEid(previousBrazeEid)
      ) {
        Analytics.startMergingUser();
        try {
          logManager.info(
            '[Braze] Merge oldEid/newEid: ',
            previousBrazeEid,
            eid,
          );
          await BrazeWrapper.merge(previousBrazeEid, eid);
        } catch (error) {
          const errMsg =
            error instanceof Error ? error.message : JSON.stringify(error);
          logManager.error(`[Braze] Merge EID failed: ${errMsg}`);
        }
        await sleep(5000);
        Analytics.endMergingUser();
      }

      // Set email notifications and push notifications after Braze EID is set
      dispatch(setEmailNotifications(acceptedEmailNotifications, email));
    }
  };

export const startBitPayIdStoreInit =
  (initialData: InitialUserData): Effect<void> =>
  async (dispatch, getState) => {
    const {APP} = getState();
    const {basicInfo: user} = initialData;
    dispatch(BitPayIdActions.successInitializeStore(APP.network, initialData));
    try {
      dispatch(startBitPayIdAnalyticsInit(user));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(
        '[startBitPayIdStoreInit] Failed init user analytics: ',
        errMsg,
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
        optInEmailMarketing: agreedToMarketingCommunications,
        attribute: agreedToMarketingCommunications ? 'App Signup' : undefined,
        gCaptchaResponse: params.gCaptchaResponse,
      });

      // New users accept email notifications by default
      dispatch(setEmailNotificationsAccepted(true, params.email));

      // refresh session
      const session = await AuthApi.fetchSession(APP.network);

      // start pairing
      const secret = await AuthApi.generatePairingCode(
        APP.network,
        session.csrfToken,
      );
      await dispatch(startPairAndLoadUser(APP.network, secret, undefined));

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
      logManager.error(
        '[startCreateAccount] Failed to create account.',
        errMsg,
      );
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
  ({
    email,
    password,
    gCaptchaResponse,
  }: StartLoginParams): Effect<Promise<boolean>> =>
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
        if (!email) {
          return false;
        }
        // authenticate
        logManager.info('[startLogin] Authenticating BitPayID credentials...');
        const {twoFactorPending, emailAuthenticationPending} =
          await AuthApi.login(
            APP.network,
            email,
            password || '',
            BITPAY_ID.session.csrfToken,
            gCaptchaResponse,
          );

        // refresh session
        session = await AuthApi.fetchSession(APP.network);
        if (twoFactorPending) {
          logManager.debug('[startLogin] Two-factor authentication pending.');
          dispatch(BitPayIdActions.pendingLogin('twoFactorPending', session));
          return false;
        }

        if (emailAuthenticationPending) {
          logManager.debug('[startLogin] Email authentication pending.');
          dispatch(
            BitPayIdActions.pendingLogin('emailAuthenticationPending', session),
          );
          return false;
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

      dispatch(CardActions.isJoinedWaitlist(false));
      dispatch(BitPayIdActions.successLogin(APP.network, session));
      return true;
    } catch (err: any) {
      let errMsg;

      if (isAxiosError<LoginErrorResponse>(err)) {
        errMsg = upperFirst(
          err.response?.data.message ||
            err.message ||
            t('An unexpected error occurred.'),
        );
      } else {
        errMsg = err.message || JSON.stringify(err);
      }
      dispatch(BitPayIdActions.failedLogin(errMsg));
      logManager.error('[startLogin]', err.status, errMsg);
      return false;
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
    } catch (err: any) {
      let errMsg;

      if (isAxiosError<string>(err)) {
        errMsg = upperFirst(
          err.response?.data ||
            err.message ||
            t('An unexpected error occurred.'),
        );
      } else {
        errMsg = err.message || JSON.stringify(err);
      }

      logManager.error(
        '[startTwoFactorAuth] Two factor authentication failed.',
        err.status,
        errMsg,
      );
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
    } catch (err: any) {
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
        errMsg = err.message || JSON.stringify(err);
      }

      logManager.error(
        '[startTwoFactorPairing] Pairing with two factor failed.',
        err.status,
        errMsg,
      );
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
    } catch (err: any) {
      const errMsg = err.message || JSON.stringify(err);
      logManager.error(
        '[startEmailPairing] Pairing from email authentication failed.',
        errMsg,
      );
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
    } catch (err: any) {
      let errMsg;

      if (isAxiosError(err)) {
        errMsg = JSON.stringify(err.response?.data || err.message);
      } else if (err instanceof Error) {
        errMsg = err.message;
      } else {
        errMsg = JSON.stringify(err);
      }

      logManager.error('[startDeeplinkPairing] Pairing failed.', errMsg);
      dispatch(BitPayIdActions.failedPairingBitPayId(errMsg));
    } finally {
      ongoingProcessManager.hide();
    }
  };

export const startPairAndLoadUser =
  (network: Network, secret: string, code?: string): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    try {
      const token = await AuthApi.pair(secret, code);

      dispatch(BitPayIdActions.successPairingBitPayId(network, token));
      logManager.info('Successfully paired with BitPayID.');
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(
        '[startPairAndLoadUser] An error occurred while pairing.',
        errMsg,
      );
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
          '[startPairAndLoadUser] One or more errors occurred while fetching initial user data:\n' +
            msg,
        );
      }

      dispatch(startBitPayIdStoreInit(data.user));
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

      logManager.error(
        '[startPairAndLoadUser] An error occurred while fetching user data.',
        errMsg,
      );
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
    } catch (err: any) {
      // log but swallow this error
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.debug(
        '[startDisconnectBitPayId] An error occurred while logging out.',
        errMsg,
      );
    }

    try {
      const session = await AuthApi.fetchSession(APP.network);

      dispatch(BitPayIdActions.successFetchSession(session));
    } catch (err: any) {
      // log but swallow this error
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.debug(
        '[startDisconnectBitPayId] An error occurred while refreshing session.',
        errMsg,
      );
    }

    try {
      await MixpanelWrapper.reset();
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.debug(
        '[startDisconnectBitPayId] An error occurred while clearing Mixpanel data.',
        errMsg,
      );
    }

    try {
      Dosh.clearUser();
    } catch (err: any) {
      // log but swallow this error
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.debug(
        '[startDisconnectBitPayId] An error occurred while clearing Dosh user.',
        errMsg,
      );
    }

    // Braze doesn't recommend changeUser to a new EID
    // Keep tracking current EID as part of logout
    // until login with a different user or uninstall the app

    try {
      await clearAllCookiesEverywhere();
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.debug(
        '[startDisconnectBitPayId] An error occurred while clearing cookies.',
        errMsg,
      );
    }

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
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(
        '[startFetchBasicInfo] Failed to fetch basic user info',
        errMsg,
      );
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
    const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error(
      '[startFetchDoshToken] Failed to fetch dosh token.',
      errMsg,
    );
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
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(
          '[startFetchSecuritySettings] Failed to fetch security settings.',
          errMsg,
        );
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
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(
          '[startToggleTwoFactorAuthEnabled] Failed to toggle two-factor settings.',
          errMsg,
        );
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
              .post(
                `${BASE_BITPAY_URLS[APP.network]}/api/v2`,
                {
                  method: 'findWalletsByEmail',
                  params: JSON.stringify(params),
                },
                {
                  headers: NO_CACHE_HEADERS,
                },
              )
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
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(
          '[startFetchReceivingAddresses] Failed to fetch receiving addresses.',
          errMsg,
        );
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
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(
          '[startUpdateReceivingAddresses] Failed to update receiving addresses.',
          errMsg,
        );
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

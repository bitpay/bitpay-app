import BitAuth from 'bitauth';
import {Linking} from 'react-native';
import ReactAppboy from 'react-native-appboy-sdk';
import InAppBrowser, {
  InAppBrowserOptions,
} from 'react-native-inappbrowser-reborn';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import BitPayApi from '../../api/bitpay';
import GraphQlApi from '../../api/graphql';
import UserApi from '../../api/user';
import {Network} from '../../constants';
import {isAxiosError} from '../../utils/axios';
import {sleep} from '../../utils/helper-methods';
import {BitPayIdEffects} from '../bitpay-id';
import {CardEffects} from '../card';
import {LocationEffects} from '../location';
import {RootState, Effect} from '../index';
import {LogActions} from '../log';
import {startMigration, startWalletStoreInit} from '../wallet/effects';
import {AppActions} from './';
import {AppIdentity} from './app.models';
import RNBootSplash from 'react-native-bootsplash';
import analytics from '@segment/analytics-react-native';
import {SEGMENT_API_KEY, APPSFLYER_API_KEY, APP_ID} from '@env';
import appsFlyer from 'react-native-appsflyer';
import {requestTrackingPermission} from 'react-native-tracking-transparency';
import {walletConnectInit} from '../wallet-connect/wallet-connect.effects';
import {setMigrationComplete, showBlur} from './app.actions';
import {batch} from 'react-redux';
import i18n from 'i18next';
import {WalletActions} from '../wallet';
import {coinbaseInitialize} from '../coinbase';

export const startAppInit = (): Effect => async (dispatch, getState) => {
  try {
    dispatch(LogActions.clear());
    dispatch(LogActions.info('Initializing app...'));

    await dispatch(startWalletStoreInit());

    const {onboardingCompleted, migrationComplete} = getState().APP;

    // init analytics -> post onboarding or migration
    if (onboardingCompleted) {
      dispatch(askForTrackingPermissionAndEnableSdks());
    }

    if (!migrationComplete) {
      await dispatch(startMigration());
      dispatch(setMigrationComplete());
    }

    const {BITPAY_ID} = getState();
    const {network, pinLockActive, biometricLockActive, colorScheme} =
      getState().APP;

    dispatch(LogActions.debug(`Network: ${network}`));
    dispatch(LogActions.debug(`Theme: ${colorScheme || 'system'}`));

    const token = BITPAY_ID.apiToken[network];
    const isPaired = !!token;
    const identity = dispatch(initializeAppIdentity());

    await dispatch(initializeApi(network, identity));

    if (isPaired) {
      try {
        dispatch(
          LogActions.info(
            'App is paired with BitPayID, refreshing user data...',
          ),
        );

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
        await dispatch(LocationEffects.getCountry());
        await dispatch(BitPayIdEffects.startBitPayIdStoreInit(data.user));
        await dispatch(CardEffects.startCardStoreInit(data.user));
      } catch (err: any) {
        if (isAxiosError(err)) {
          dispatch(LogActions.error(`${err.name}: ${err.message}`));
          dispatch(LogActions.error(err.config.url));
          dispatch(LogActions.error(JSON.stringify(err.config.data || {})));
        } else if (err instanceof Error) {
          dispatch(LogActions.error(`${err.name}: ${err.message}`));
        } else {
          dispatch(LogActions.error(JSON.stringify(err)));
        }

        dispatch(
          LogActions.info(
            'Failed to refresh user data. Continuing initialization.',
          ),
        );
      }
    }

    // splitting inits into store specific ones as to keep it cleaner in the main init here
    await dispatch(walletConnectInit());
    await dispatch(initializeBrazeContent());

    // Update Coinbase
    dispatch(coinbaseInitialize());
    dispatch(showBlur(pinLockActive || biometricLockActive));
    await sleep(500);
    dispatch(LogActions.info('Initialized app successfully.'));
    dispatch(LogActions.debug(`Pin Lock Active: ${pinLockActive}`));
    dispatch(LogActions.debug(`Biometric Lock Active: ${biometricLockActive}`));
    RNBootSplash.hide({fade: true}).then(() => {
      // avoid splash conflicting with modal in iOS
      // https://stackoverflow.com/questions/65359539/showing-a-react-native-modal-right-after-app-startup-freezes-the-screen-in-ios
      if (pinLockActive) {
        dispatch(AppActions.showPinModal({type: 'check'}));
      }
      if (biometricLockActive) {
        dispatch(AppActions.showBiometricModal());
      }
      dispatch(AppActions.successAppInit());
    });
  } catch (err) {
    console.error(err);
    dispatch(AppActions.failedAppInit());
    dispatch(LogActions.error('Failed to initialize app.'));
    dispatch(LogActions.error(JSON.stringify(err)));
  }
};

/**
 * Checks to ensure that the App Identity is defined, else generates a new one.
 * @returns The App Identity.
 */
const initializeAppIdentity =
  (): Effect<AppIdentity> => (dispatch, getState) => {
    const {APP} = getState();
    let identity = APP.identity[APP.network];

    dispatch(LogActions.info('Initializing App Identity...'));

    if (!identity || !Object.keys(identity).length || !identity.priv) {
      try {
        dispatch(LogActions.info('Generating new App Identity...'));

        identity = BitAuth.generateSin();

        dispatch(AppActions.successGenerateAppIdentity(APP.network, identity));
      } catch (error) {
        dispatch(
          LogActions.error(
            'Error generating App Identity: ' + JSON.stringify(error),
          ),
        );
        dispatch(AppActions.failedGenerateAppIdentity());
      }
    }

    dispatch(LogActions.info('Initialized App Identity successfully.'));

    return identity;
  };

/**
 * Initializes APIs for the given network and identity.
 * @param network
 * @param identity
 * @returns void
 */
const initializeApi =
  (network: Network, identity: AppIdentity): Effect =>
  () => {
    BitPayApi.init(network, identity);
    GraphQlApi.init(network, identity);
  };

/**
 * Initializes Braze content by checking for a paired user, refreshing the
 * Braze cache, then fetching data from Braze and commiting it to the store.
 * @returns void
 */
export const initializeBrazeContent =
  (): Effect => async (dispatch, getState) => {
    try {
      dispatch(LogActions.info('Initializing Braze content...'));
      const {APP, BITPAY_ID} = getState();
      const user = BITPAY_ID.user[APP.network];

      if (user) {
        ReactAppboy.changeUser(user.eid);
        ReactAppboy.setEmail(user.email);
      }

      ReactAppboy.requestContentCardsRefresh();

      const contentCards = await ReactAppboy.getContentCards();

      dispatch(LogActions.info('Successfully fetched data from Braze.'));
      dispatch(AppActions.brazeContentCardsFetched(contentCards));
    } catch (err) {
      const errMsg = 'Failed to fetch data from Braze.';

      dispatch(LogActions.error(errMsg));
      dispatch(
        LogActions.error(
          err instanceof Error ? err.message : JSON.stringify(err),
        ),
      );
    } finally {
      dispatch(LogActions.info('Initializing Braze content complete.'));
    }
  };

/**
 * Refreshes Braze content by refreshing the Braze cache, then fetching
 * data from Braze and commiting it to the store. Does not change or set user.
 * @returns void
 */
export const startRefreshBrazeContent = (): Effect => async dispatch => {
  try {
    dispatch(LogActions.info('Refreshing Braze content...'));

    ReactAppboy.requestContentCardsRefresh();

    const contentCards = await ReactAppboy.getContentCards();

    dispatch(LogActions.info('Successfully fetched data from Braze.'));
    dispatch(AppActions.brazeContentCardsFetched(contentCards));
  } catch (err) {
    const errMsg = 'Failed to fetch data from Braze.';

    dispatch(LogActions.error(errMsg));
    dispatch(
      LogActions.error(
        err instanceof Error ? err.message : JSON.stringify(err),
      ),
    );
  } finally {
    dispatch(LogActions.info('Refreshing Braze content complete.'));
  }
};

export const startOnGoingProcessModal =
  (message: OnGoingProcessMessages): Effect =>
  async (dispatch, getState: () => RootState) => {
    const store: RootState = getState();

    // if modal currently active dismiss and sleep to allow animation to complete before showing next
    if (store.APP.showOnGoingProcessModal) {
      dispatch(AppActions.dismissOnGoingProcessModal());
      await sleep(500);
    }

    dispatch(AppActions.showOnGoingProcessModal(message));
    return sleep(100);
  };

/**
 * Open a URL with the InAppBrowser if available, else lets the device handle the URL.
 * @param url
 * @param options
 * @returns
 */
export const openUrlWithInAppBrowser =
  (url: string, options: InAppBrowserOptions = {}): Effect =>
  async dispatch => {
    let isIabAvailable = false;

    try {
      isIabAvailable = await InAppBrowser.isAvailable();
    } catch (err) {
      console.log(err);
    }

    const handler = isIabAvailable ? 'InAppBrowser' : 'external app';

    try {
      dispatch(LogActions.info(`Opening URL ${url} with ${handler}`));

      if (isIabAvailable) {
        // successfully resolves after IAB is cancelled or dismissed
        const result = await InAppBrowser.open(url, {
          // iOS options
          animated: true,
          modalEnabled: true,
          modalPresentationStyle: 'pageSheet',

          // android options
          forceCloseOnRedirection: false,
          hasBackButton: true,
          showInRecents: true,

          ...options,
        });

        dispatch(
          LogActions.info(`InAppBrowser closed with type: ${result.type}`),
        );
      } else {
        // successfully resolves if an installed app handles the URL,
        // or the user confirms any presented 'open' dialog
        await Linking.openURL(url);
      }
    } catch (err) {
      const logMsg = `Error opening URL ${url} with ${handler}.\n${JSON.stringify(
        err,
      )}`;

      dispatch(LogActions.error(logMsg));
    }
  };

export const askForTrackingPermissionAndEnableSdks =
  (): Effect<Promise<void>> => async dispatch => {
    return new Promise(async resolve => {
      const trackingStatus = await requestTrackingPermission();
      if (['authorized', 'unavailable'].includes(trackingStatus) && !__DEV__) {
        try {
          await new Promise<void>((resolve2, reject2) => {
            appsFlyer.initSdk(
              {
                devKey: APPSFLYER_API_KEY,
                isDebug: __DEV__,
                appId: APP_ID, // iOS app id
              },
              result => {
                console.log(result);
                resolve2();
              },
              error => {
                console.log(error);
                reject2(error);
              },
            );
          });
        } catch (err) {
          dispatch(LogActions.error('Appsflyer setup failed'));
          dispatch(LogActions.error(JSON.stringify(err)));
        }

        try {
          await analytics.setup(SEGMENT_API_KEY, {
            recordScreenViews: false,
            trackAppLifecycleEvents: true,
          });
        } catch (err) {
          dispatch(LogActions.error('Segment setup failed'));
          dispatch(LogActions.error(JSON.stringify(err)));
        }
      }

      resolve();
    });
  };

export const resetAllSettings = (): Effect => dispatch => {
  batch(() => {
    dispatch(AppActions.setColorScheme(null));
    dispatch(AppActions.showPortfolioValue(true));
    dispatch(
      AppActions.setDefaultAltCurrency({isoCode: 'USD', name: 'US Dollar'}),
    );
    dispatch(AppActions.setDefaultLanguage(i18n.language || 'en'));
    dispatch(WalletActions.setUseUnconfirmedFunds(false));
    dispatch(WalletActions.setCustomizeNonce(false));
    dispatch(WalletActions.setEnableReplaceByFee(false));
    dispatch(LogActions.info('Reset all settings'));
  });
};

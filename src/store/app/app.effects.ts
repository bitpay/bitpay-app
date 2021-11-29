import BitAuth from 'bitauth';
import {Linking} from 'react-native';
import InAppBrowser, {
  InAppBrowserOptions,
} from 'react-native-inappbrowser-reborn';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {Network} from '../../constants';
import {BASE_BITPAY_URLS} from '../../constants/config';
import BitPayApi from '../../lib/bitpay-api';
import {sleep} from '../../utils/helper-methods';
import {RootState, Effect} from '../index';
import {LogActions} from '../log';
import {startWalletStoreInit} from '../wallet/wallet.effects';
import {AppActions} from './';
import {AppIdentity} from './app.models';

export const startAppInit = (): Effect => async (dispatch, getState) => {
  try {
    dispatch(LogActions.clear());
    dispatch(LogActions.info('Initializing app...'));

    const {APP} = getState();
    const identity = dispatch(initializeAppIdentity());
    dispatch(initializeBitPayApi(APP.network, identity));

    // splitting inits into store specific ones as to keep it cleaner in the main init here
    dispatch(startWalletStoreInit());

    await sleep(500);
    dispatch(AppActions.successAppInit());
    dispatch(LogActions.info('Initialized app successfully.'));
  } catch (err) {
    console.error(err);
    dispatch(AppActions.failedAppInit());
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
 * Initializes the BitPayAPI for the given network and identity.
 * @param network
 * @param identity
 * @returns void
 */
const initializeBitPayApi =
  (network: Network, identity: AppIdentity): Effect =>
  () => {
    BitPayApi.init(network, identity, {
      baseUrl: BASE_BITPAY_URLS[network],
    });
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
    return sleep(0);
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
          showInRecents: false,

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

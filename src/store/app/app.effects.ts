import axios from 'axios';
import {Linking} from 'react-native';
import InAppBrowser, {
  InAppBrowserOptions,
} from 'react-native-inappbrowser-reborn';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {sleep} from '../../utils/helper-methods';
import {RootState, Effect} from '../index';
import {LogActions} from '../log';
import {AppActions} from './';
import {Session} from './app.models';

export const startGetSession =
  (): Effect => async (dispatch, getState: () => RootState) => {
    const store = getState();

    try {
      const {data: session} = await axios.get<Session>(
        `${store.APP.baseBitPayURL}/auth/session`,
      );
      dispatch(AppActions.successGetSession(session));
    } catch (err) {
      console.error(err);
      dispatch(AppActions.failedGetSession());
    }
  };

export const startAppInit =
  (): Effect => async (dispatch, getState: () => RootState) => {
    dispatch(LogActions.clear());
    dispatch(LogActions.info('Initializing app...'));
    const store: RootState = getState();

    try {
      // if onboarding is not completed or if a user is not paired - fetch a session
      if (!store.APP.onboardingCompleted || !store.BITPAY_ID.account) {
        // await dispatch(startGetSession());
      }

      await sleep(1000);

      dispatch(AppActions.successAppInit());
      dispatch(LogActions.info('Initialized app successfully.'));
    } catch (err) {
      console.error(err);
      dispatch(AppActions.failedAppInit());
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

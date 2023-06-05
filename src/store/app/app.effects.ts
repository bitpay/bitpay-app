import i18n, {t} from 'i18next';
import {debounce} from 'lodash';
import {
  DeviceEventEmitter,
  EmitterSubscription,
  Linking,
  Platform,
  Share,
} from 'react-native';
import RNBootSplash from 'react-native-bootsplash';
import InAppReview from 'react-native-in-app-review';
import InAppBrowser, {
  InAppBrowserOptions,
} from 'react-native-inappbrowser-reborn';
import {AppActions} from '.';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {sleep} from '../../utils/helper-methods';
import {Effect, RootState} from '../index';
import {LocationEffects} from '../location';
import {LogActions} from '../log';
import {WalletActions} from '../wallet';
import {
  setEmailNotificationsAccepted,
  setMigrationComplete,
  setUserFeedback,
  showBlur,
} from './app.actions';
import {startMigration, startWalletStoreInit} from '../wallet/effects';
import {
  findKeyByKeyId,
  findWalletByIdHashed,
  getAllWalletClients,
} from '../wallet/utils/wallet';
import {navigationRef, RootStacks, SilentPushEvent} from '../../Root';
import {
  startUpdateAllKeyAndWalletStatus,
  startUpdateWalletStatus,
} from '../wallet/effects/status/status';
import {createWalletAddress} from '../wallet/effects/address/address';
import {DeviceEmitterEvents} from '../../constants/device-emitter-events';
import {
  APP_DEEPLINK_PREFIX,
  APP_NAME,
  DOWNLOAD_BITPAY_URL,
} from '../../constants/config';
import {updatePortfolioBalance} from '../wallet/wallet.actions';
import {setContactMigrationComplete} from '../contact/contact.actions';
import {startContactMigration} from '../contact/contact.effects';
import {getStateFromPath} from '@react-navigation/native';
import moment from 'moment';
import {FeedbackRateType} from '../../navigation/tabs/settings/about/screens/SendFeedback';

export const startAppInit = (): Effect => async (dispatch, getState) => {
  try {
    dispatch(LogActions.clear());
    dispatch(
      LogActions.info(
        `Initializing app (${__DEV__ ? 'Development' : 'Production'})...`,
      ),
    );

    dispatch(deferDeeplinksUntilAppIsReady());

    const {APP, CONTACT, WALLET} = getState();
    const {network, pinLockActive, biometricLockActive, colorScheme} = APP;

    WALLET.initLogs.forEach(log => dispatch(log));

    dispatch(LogActions.debug(`Network: ${network}`));
    dispatch(LogActions.debug(`Theme: ${colorScheme || 'system'}`));

    const {migrationComplete} = APP;

    dispatch(startWalletStoreInit());

    const {contactMigrationComplete} = CONTACT;

    if (!contactMigrationComplete) {
      await dispatch(startContactMigration());
      dispatch(setContactMigrationComplete());
      dispatch(LogActions.info('success [setContactMigrationComplete]'));
    }

    if (!migrationComplete) {
      await dispatch(startMigration());
      dispatch(setMigrationComplete());
      dispatch(LogActions.info('success [setMigrationComplete]'));
    }

    dispatch(LocationEffects.getLocationData());

    dispatch(showBlur(pinLockActive || biometricLockActive));

    dispatch(AppActions.successAppInit());
    DeviceEventEmitter.emit(DeviceEmitterEvents.APP_DATA_INITIALIZED);

    await sleep(500);
    dispatch(LogActions.info('Initialized app successfully.'));
    dispatch(LogActions.debug(`Pin Lock Active: ${pinLockActive}`));
    dispatch(LogActions.debug(`Biometric Lock Active: ${biometricLockActive}`));
    // RNBootSplash.hide({fade: true}).then(() => {
    //   // avoid splash conflicting with modal in iOS
    //   // https://stackoverflow.com/questions/65359539/showing-a-react-native-modal-right-after-app-startup-freezes-the-screen-in-ios
    //   if (pinLockActive) {
    //     dispatch(AppActions.showPinModal({type: 'check'}));
    //   }
    //   if (biometricLockActive) {
    //     dispatch(AppActions.showBiometricModal({}));
    //   }

    //   dispatch(AppActions.appInitCompleted());
    //   DeviceEventEmitter.emit(DeviceEmitterEvents.APP_INIT_COMPLETED);
    // });
  } catch (err: unknown) {
    let errorStr;
    if (err instanceof Error) {
      errorStr = err.message;
    } else {
      errorStr = JSON.stringify(err);
    }
    // wait for navigationRef
    await sleep(2000);
    if (errorStr !== 'Network Error') {
      // Avoid lock the app in Debug view
      dispatch(AppActions.failedAppInit());
    }
    dispatch(LogActions.error('Failed to initialize app: ' + errorStr));
    await sleep(500);
    dispatch(showBlur(false));
    // RNBootSplash.hide();
  }
};

const deferDeeplinksUntilAppIsReady =
  (): Effect<void> => (dispatch, getState) => {
    const {APP} = getState();
    let subscriptions: EmitterSubscription[] = [];

    const emitIfReady = () => {
      if (!subscriptions.length) {
        dispatch(AppActions.appIsReadyForDeeplinking());
        DeviceEventEmitter.emit(DeviceEmitterEvents.APP_READY_FOR_DEEPLINKS);
      }
    };

    const waitForEvent = (e: DeviceEmitterEvents) => {
      const sub = DeviceEventEmitter.addListener(e, () => {
        sub.remove();
        subscriptions = subscriptions.filter(s => s !== sub);

        emitIfReady();
      });

      subscriptions.push(sub);
    };

    if (!navigationRef.isReady()) {
      waitForEvent(DeviceEmitterEvents.APP_NAVIGATION_READY);
    }

    if (APP.appIsLoading) {
      waitForEvent(DeviceEmitterEvents.APP_DATA_INITIALIZED);
    }

    if (!APP.onboardingCompleted) {
      waitForEvent(DeviceEmitterEvents.APP_ONBOARDING_COMPLETED);
    }

    emitIfReady();
  };

export const startOnGoingProcessModal =
  (key: OnGoingProcessMessages): Effect<Promise<void>> =>
  async (dispatch, getState: () => RootState) => {
    const store: RootState = getState();

    const _OnGoingProcessMessages = {
      GENERAL_AWAITING: i18n.t("Just a second, we're setting a few things up"),
      CREATING_KEY: i18n.t('Creating Key'),
      LOGGING_IN: i18n.t('Logging In'),
      PAIRING: i18n.t('Pairing'),
      CREATING_ACCOUNT: i18n.t('Creating Account'),
      UPDATING_ACCOUNT: i18n.t('Updating Account'),
      IMPORTING: i18n.t('Importing'),
      DELETING_KEY: i18n.t('Deleting Key'),
      ADDING_WALLET: i18n.t('Adding Wallet'),
      LOADING: i18n.t('Loading'),
      FETCHING_PAYMENT_OPTIONS: i18n.t('Fetching payment options...'),
      FETCHING_PAYMENT_INFO: i18n.t('Fetching payment information...'),
      JOIN_WALLET: i18n.t('Joining Wallet'),
      SENDING_PAYMENT: i18n.t('Sending Payment'),
      ACCEPTING_PAYMENT: i18n.t('Accepting Payment'),
      GENERATING_ADDRESS: i18n.t('Generating Address'),
      GENERATING_GIFT_CARD: i18n.t('Generating Gift Card'),
      SYNCING_WALLETS: i18n.t('Syncing Wallets...'),
      REJECTING_CALL_REQUEST: i18n.t('Rejecting Call Request'),
      SAVING_LAYOUT: i18n.t('Saving Layout'),
      SAVING_ADDRESSES: i18n.t('Saving Addresses'),
      EXCHANGE_GETTING_DATA: i18n.t('Getting data from the exchange...'),
      CALCULATING_FEE: i18n.t('Calculating Fee'),
      CONNECTING_COINBASE: i18n.t('Connecting with Coinbase...'),
      FETCHING_COINBASE_DATA: i18n.t('Fetching data from Coinbase...'),
      UPDATING_TXP: i18n.t('Updating Transaction'),
      CREATING_TXP: i18n.t('Creating Transaction'),
      SENDING_EMAIL: i18n.t('Sending Email'),
      REDIRECTING: i18n.t('Redirecting'),
      BROADCASTING_TXP: i18n.t('Broadcasting transaction...'),
    };

    // if modal currently active dismiss and sleep to allow animation to complete before showing next
    if (store.APP.showOnGoingProcessModal) {
      dispatch(AppActions.dismissOnGoingProcessModal());
      await sleep(500);
    }

    // Translate message before show message
    const _message = _OnGoingProcessMessages[key];

    dispatch(AppActions.showOnGoingProcessModal(_message));
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
        try {
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
        } catch (err) {
          const logMsg = `Error opening URL ${url} with ${handler}. Trying external browser.\n${JSON.stringify(
            err,
          )}`;
          dispatch(LogActions.error(logMsg));
          // if InAppBrowser is available but InAppBrowser.open fails, will try to open an external browser
          await Linking.openURL(url);
        }
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

export const subscribePushNotifications =
  (walletClient: any, eid: string): Effect =>
  dispatch => {
    const opts = {
      externalUserId: eid,
      platform: Platform.OS,
      packageName: 'BitPay',
      walletId: walletClient.credentials.walletId,
    };
    walletClient.pushNotificationsSubscribe(opts, (err: any) => {
      if (err) {
        dispatch(
          LogActions.error(
            'Push Notifications error subscribing: ' + JSON.stringify(err),
          ),
        );
      }
    });
  };

export const unSubscribePushNotifications =
  (walletClient: any, eid: string): Effect =>
  dispatch => {
    walletClient.pushNotificationsUnsubscribe(eid, (err: any) => {
      if (err) {
        dispatch(
          LogActions.error(
            'Push Notifications error unsubscribing: ' + JSON.stringify(err),
          ),
        );
      } else {
        dispatch(
          LogActions.info(
            'Push Notifications success unsubscribing: ' +
              walletClient.credentials.walletName,
          ),
        );
      }
    });
  };

export const subscribeEmailNotifications =
  (
    walletClient: any,
    prefs: {email: string; language: string; unit: string},
  ): Effect<Promise<void>> =>
  async dispatch => {
    walletClient.savePreferences(prefs, (err: any) => {
      if (err) {
        dispatch(
          LogActions.error(
            'Email Notifications error subscribing: ' + JSON.stringify(err),
          ),
        );
      } else {
        dispatch(
          LogActions.info(
            'Email Notifications success subscribing: ' +
              walletClient.credentials.walletName,
          ),
        );
      }
    });
  };

export const unSubscribeEmailNotifications =
  (walletClient: any): Effect<Promise<void>> =>
  async dispatch => {
    walletClient.savePreferences({email: ''}, (err: any) => {
      if (err) {
        dispatch(
          LogActions.error(
            'Email Notifications error unsubscribing: ' + JSON.stringify(err),
          ),
        );
      } else {
        dispatch(
          LogActions.info(
            'Email Notifications success unsubscribing: ' +
              walletClient.credentials.walletName,
          ),
        );
      }
    });
  };

export const setEmailNotifications =
  (
    accepted: boolean,
    email: string | null,
    agreedToMarketingCommunications?: boolean,
  ): Effect =>
  (dispatch, getState) => {
    const _email = accepted ? email : null;
    dispatch(setEmailNotificationsAccepted(accepted, _email));

    const {
      WALLET: {keys},
      APP,
    } = getState();

    getAllWalletClients(keys).then(walletClients => {
      if (accepted && email) {
        const prefs = {
          email,
          language: APP.defaultLanguage,
          unit: 'btc', // deprecated
        };
        walletClients.forEach(walletClient => {
          dispatch(subscribeEmailNotifications(walletClient, prefs));
        });
      } else {
        walletClients.forEach(walletClient => {
          dispatch(unSubscribeEmailNotifications(walletClient));
        });
      }
    });
  };

const _startUpdateAllKeyAndWalletStatus = debounce(
  async dispatch => {
    dispatch(startUpdateAllKeyAndWalletStatus({force: true}));
    DeviceEventEmitter.emit(DeviceEmitterEvents.WALLET_LOAD_HISTORY);
  },
  5000,
  {leading: true, trailing: false},
);

const _createWalletAddress = debounce(
  async (dispatch, wallet) => {
    dispatch(createWalletAddress({wallet, newAddress: true}));
  },
  5000,
  {leading: true, trailing: false},
);

const _startUpdateWalletStatus = debounce(
  async (dispatch, keyObj, wallet) => {
    await dispatch(startUpdateWalletStatus({key: keyObj, wallet, force: true}));
    dispatch(updatePortfolioBalance());
    DeviceEventEmitter.emit(DeviceEmitterEvents.WALLET_LOAD_HISTORY);
  },
  5000,
  {leading: true, trailing: false},
);

export const handleBwsEvent =
  (response: SilentPushEvent): Effect =>
  async (dispatch, getState) => {
    const {
      WALLET: {keys},
    } = getState();
    if (response && response.walletId) {
      const {wallet, keyId} = await findWalletByIdHashed(
        keys,
        response.walletId,
        response.tokenAddress,
      );
      if (!wallet || !keyId) {
        return;
      }

      if (
        !wallet.credentials.walletId &&
        response.notification_type !== 'NewBlock'
      ) {
        return;
      }

      // TODO showInappNotification(data);

      console.log(
        `BWS Event: ${response.notification_type}: `,
        JSON.stringify(response),
      );

      const keyObj = await findKeyByKeyId(keyId, keys);

      switch (response.notification_type) {
        case 'NewAddress':
          _createWalletAddress(dispatch, wallet);
          break;
        case 'NewBlock':
          if (response.network && response.network === 'livenet') {
            _startUpdateAllKeyAndWalletStatus(dispatch);
          }
          break;
        case 'TxProposalAcceptedBy':
        case 'TxProposalRejectedBy':
        case 'TxProposalRemoved':
        case 'NewOutgoingTx':
        case 'NewTxProposal':
        case 'TxConfirmation':
          _startUpdateWalletStatus(dispatch, keyObj, wallet);
          break;
        case 'NewIncomingTx':
          _startUpdateWalletStatus(dispatch, keyObj, wallet);
          break;
      }
    }
  };

export const resetAllSettings = (): Effect => dispatch => {
  dispatch(AppActions.setColorScheme(null));
  dispatch(AppActions.showPortfolioValue(true));
  dispatch(
    AppActions.setDefaultAltCurrency({isoCode: 'USD', name: 'US Dollar'}),
  );
  dispatch(AppActions.setDefaultLanguage(i18n.language || 'en'));
  dispatch(WalletActions.setUseUnconfirmedFunds(false));
  dispatch(WalletActions.setCustomizeNonce(false));
  dispatch(WalletActions.setQueuedTransactions(false));
  dispatch(WalletActions.setEnableReplaceByFee(false));
  dispatch(LogActions.info('Reset all settings'));
};

export const getRouteParam = (url: string, param: string) => {
  const path = url.replace(APP_DEEPLINK_PREFIX, '');
  const state = getStateFromPath(path);
  if (!state?.routes.length) {
    return undefined;
  }
  const route = state.routes[0];
  const routeParam = (((route.params as any) || {})[param] || '').toLowerCase();
  return routeParam;
};

export const shareApp = (): Effect<Promise<void>> => async dispatch => {
  try {
    let message = t(
      'Spend and control your cryptocurrency by downloading the app.',
      {APP_NAME},
    );

    if (Platform.OS !== 'ios') {
      message = `${message} ${DOWNLOAD_BITPAY_URL}`;
    }
    await Share.share({message, url: DOWNLOAD_BITPAY_URL});
  } catch (err) {
    let errorStr;
    if (err instanceof Error) {
      errorStr = err.message;
    } else {
      errorStr = JSON.stringify(err);
    }
    dispatch(LogActions.error(`failed [shareApp]: ${errorStr}`));
  }
};

export const isVersionUpdated = (
  currentVersion: string,
  savedVersion: string,
): boolean => {
  const verifyTagFormat = (tag: string) => {
    const regex = /^v?\d+\.\d+\.\d+$/i;
    return regex.exec(tag);
  };

  const formatTagNumber = (tag: string) => {
    const formattedNumber = tag.replace(/^v/i, '').split('.');
    return {
      major: +formattedNumber[0],
      minor: +formattedNumber[1],
      patch: +formattedNumber[2],
    };
  };

  if (!verifyTagFormat(currentVersion)) {
    LogActions.error(
      'Cannot verify the format of version tag: ' + currentVersion,
    );
  }
  if (!verifyTagFormat(savedVersion)) {
    LogActions.error(
      'Cannot verify the format of the saved version tag: ' + savedVersion,
    );
  }

  const current = formatTagNumber(currentVersion);
  const saved = formatTagNumber(savedVersion);
  if (saved.major === current.major && saved.minor === current.minor) {
    return true;
  }

  return false;
};

export const saveUserFeedback =
  (rate: FeedbackRateType, version: string, sent: boolean): Effect<any> =>
  dispatch => {
    dispatch(
      setUserFeedback({
        time: moment().unix(),
        version,
        sent,
        rate,
      }),
    );
  };

// /**
//  * Requests an in-app review UI from the device. Due to review quotas set by
//  * Apple/Google, request is not guaranteed to be granted and it is possible
//  * that nothing will be presented to the user.
//  *
//  * @returns
//  */
export const requestInAppReview =
  (): Effect<Promise<void>> => async dispatch => {
    try {
      // Whether the device supports app ratings
      const isAvailable = InAppReview.isAvailable();

      if (!isAvailable) {
        dispatch(LogActions.debug('In-app review not available.'));
        return;
      }

      dispatch(LogActions.debug('Requesting in-app review...'));

      // Android - true means the user finished or closed the review flow successfully, but does not indicate if the user left a review
      // iOS - true means the rating flow was launched successfully, but does not indicate if the user left a review
      const hasFlowFinishedSuccessfully =
        await InAppReview.RequestInAppReview();

      dispatch(
        LogActions.debug(
          `In-app review completed successfully: ${!!hasFlowFinishedSuccessfully}`,
        ),
      );
    } catch (e: any) {
      dispatch(
        LogActions.debug(
          `Failed to request in-app review: ${e?.message || JSON.stringify(e)}`,
        ),
      );
    }
  };

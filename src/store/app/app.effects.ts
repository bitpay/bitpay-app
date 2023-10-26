import BitAuth from 'bitauth';
import i18n, {t} from 'i18next';
import {debounce} from 'lodash';
import {
  DeviceEventEmitter,
  EmitterSubscription,
  Linking,
  Platform,
  Share,
} from 'react-native';
import Braze from 'react-native-appboy-sdk';
import RNBootSplash from 'react-native-bootsplash';
import InAppReview from 'react-native-in-app-review';
import InAppBrowser, {
  InAppBrowserOptions,
} from 'react-native-inappbrowser-reborn';
import {
  checkNotifications,
  requestNotifications,
  RESULTS,
} from 'react-native-permissions';
import uuid from 'react-native-uuid';
import {AppActions} from '.';
import BitPayApi from '../../api/bitpay';
import GraphQlApi from '../../api/graphql';
import UserApi from '../../api/user';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {Network} from '../../constants';
import {BuyCryptoScreens} from '../../navigation/services/buy-crypto/BuyCryptoStack';
import {CardScreens} from '../../navigation/card/CardStack';
import {CardActivationScreens} from '../../navigation/card-activation/CardActivationStack';
import {TabsScreens} from '../../navigation/tabs/TabsStack';
import {WalletScreens} from '../../navigation/wallet/WalletStack';
import {isAxiosError} from '../../utils/axios';
import {sleep} from '../../utils/helper-methods';
import {Analytics} from '../analytics/analytics.effects';
import {BitPayIdEffects} from '../bitpay-id';
import {CardActions, CardEffects} from '../card';
import {Card} from '../card/card.models';
import {coinbaseInitialize} from '../coinbase';
import {Effect, RootState} from '../index';
import {LocationEffects} from '../location';
import {LogActions} from '../log';
import {WalletActions} from '../wallet';
import {startMigration, startWalletStoreInit} from '../wallet/effects';
import {
  setAnnouncementsAccepted,
  setAppFirstOpenEventComplete,
  setAppFirstOpenEventDate,
  setBrazeEid,
  setConfirmedTxAccepted,
  setEmailNotificationsAccepted,
  setMigrationComplete,
  setNotificationsAccepted,
  setUserFeedback,
  showBlur,
} from './app.actions';
import {AppIdentity, InAppNotificationContextType} from './app.models';
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
  BASE_BITPAY_URLS,
  DOWNLOAD_BITPAY_URL,
} from '../../constants/config';
import {
  updatePortfolioBalance,
  setCustomTokensMigrationComplete,
} from '../wallet/wallet.actions';
import {setContactMigrationComplete} from '../contact/contact.actions';
import {startContactMigration} from '../contact/contact.effects';
import {getStateFromPath, NavigationProp} from '@react-navigation/native';
import {
  getAvailableGiftCards,
  getCategoriesWithIntegrations,
} from '../shop/shop.selectors';
import {SettingsScreens} from '../../navigation/tabs/settings/SettingsStack';
import {MerchantScreens} from '../../navigation/tabs/shop/merchant/MerchantStack';
import {ShopTabs} from '../../navigation/tabs/shop/ShopHome';
import {ShopScreens} from '../../navigation/tabs/shop/ShopStack';
import QuickActions, {ShortcutItem} from 'react-native-quick-actions';
import {ShortcutList} from '../../constants/shortcuts';
import {goToBuyCrypto} from '../buy-crypto/buy-crypto.effects';
import {goToSwapCrypto} from '../swap-crypto/swap-crypto.effects';
import {receiveCrypto, sendCrypto} from '../wallet/effects/send/send';
import moment from 'moment';
import {FeedbackRateType} from '../../navigation/tabs/settings/about/screens/SendFeedback';
import {moralisInit} from '../moralis/moralis.effects';
import {walletConnectV2Init} from '../wallet-connect-v2/wallet-connect-v2.effects';
import {InAppNotificationMessages} from '../../components/modal/in-app-notification/InAppNotification';
import {SignClientTypes} from '@walletconnect/types';
import axios from 'axios';
import AuthApi from '../../api/auth';
import {ShopActions} from '../shop';
import {startCustomTokensMigration} from '../wallet/effects/currencies/currencies';

// Subscription groups (Braze)
const PRODUCTS_UPDATES_GROUP_ID = __DEV__
  ? '27c86a0b-2a91-4383-b05b-5e671554f186'
  : 'fe2146a6-f5ed-4df7-81de-7ed9cd019d23';
const OFFERS_AND_PROMOTIONS_GROUP_ID = __DEV__
  ? '6be103aa-4df0-46f6-a3fa-438e61aadced'
  : '1d1db929-909d-40e0-93ec-34106ea576b4';

export const startAppInit = (): Effect => async (dispatch, getState) => {
  try {
    dispatch(LogActions.clear());
    dispatch(
      LogActions.info(
        `Initializing app (${__DEV__ ? 'Development' : 'Production'})...`,
      ),
    );

    dispatch(deferDeeplinksUntilAppIsReady());

    const {APP, BITPAY_ID, CONTACT, WALLET} = getState();
    const {network, pinLockActive, biometricLockActive, colorScheme} = APP;

    WALLET.initLogs.forEach(log => dispatch(log));

    dispatch(LogActions.debug(`Network: ${network}`));
    dispatch(LogActions.debug(`Theme: ${colorScheme || 'system'}`));

    const {appFirstOpenData, onboardingCompleted, migrationComplete} = APP;
    const {customTokensMigrationComplete} = WALLET;
    // init analytics -> post onboarding or migration
    if (onboardingCompleted) {
      await dispatch(Analytics.initialize());
      QuickActions.clearShortcutItems();
      QuickActions.setShortcutItems(ShortcutList);
    }

    if (!appFirstOpenData?.firstOpenDate) {
      const firstOpen = Math.floor(Date.now() / 1000);

      dispatch(setAppFirstOpenEventDate(firstOpen));
      dispatch(trackFirstOpenEvent(firstOpen));
    } else {
      dispatch(Analytics.track('Last Opened App'));

      if (!appFirstOpenData?.firstOpenEventComplete) {
        dispatch(trackFirstOpenEvent(appFirstOpenData.firstOpenDate));
      }
    }

    dispatch(startWalletStoreInit());

    const {contactMigrationComplete} = CONTACT;

    if (!contactMigrationComplete) {
      await dispatch(startContactMigration());
      dispatch(setContactMigrationComplete());
      dispatch(LogActions.info('success [setContactMigrationComplete]'));
    }
    if (!customTokensMigrationComplete) {
      await dispatch(startCustomTokensMigration());
      dispatch(setCustomTokensMigrationComplete());
      dispatch(LogActions.info('success [setCustomTokensMigrationComplete]'));
    }

    if (!migrationComplete) {
      await dispatch(startMigration());
      dispatch(setMigrationComplete());
      dispatch(LogActions.info('success [setMigrationComplete]'));
    }

    const token = BITPAY_ID.apiToken[network];
    const isPaired = !!token;
    const identity = dispatch(initializeAppIdentity());

    dispatch(initializeApi(network, identity));

    dispatch(LocationEffects.getLocationData());

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
        dispatch(BitPayIdEffects.startBitPayIdStoreInit(data.user));
        dispatch(CardEffects.startCardStoreInit(data.user));
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
    dispatch(walletConnectV2Init());
    dispatch(initializeBrazeContent());
    dispatch(moralisInit());

    // Update Coinbase
    dispatch(coinbaseInitialize());

    dispatch(AppActions.successAppInit());
    DeviceEventEmitter.emit(DeviceEmitterEvents.APP_DATA_INITIALIZED);
    dispatch(LogActions.info('Initialized app successfully.'));
    dispatch(AppActions.appInitCompleted());
    DeviceEventEmitter.emit(DeviceEmitterEvents.APP_INIT_COMPLETED);
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
    RNBootSplash.hide();
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
 * Initializes Braze content by setting up an event subscription for content
 * changes, checking for a paired user, then requesting a Braze refresh.
 *
 * The subscription will fetch latest content when it receives an update event.
 * @returns void
 */
export const initializeBrazeContent = (): Effect => (dispatch, getState) => {
  try {
    dispatch(LogActions.info('Initializing Braze content...'));
    const {APP} = getState();

    let contentCardSubscription = APP.brazeContentCardSubscription;

    if (contentCardSubscription) {
      contentCardSubscription.subscriber?.removeAllSubscriptions();
      contentCardSubscription = null;
    }

    // When triggering a new Braze session (via changeUser), it may take a bit for campaigns/canvases to propogate.
    const INIT_CONTENT_CARDS_POLL_INTERVAL = 5000;
    const MAX_RETRIES = 3;
    let currentRetry = 0;

    contentCardSubscription = Braze.addListener(
      Braze.Events.CONTENT_CARDS_UPDATED,
      async () => {
        const isInitializing = currentRetry < MAX_RETRIES;

        dispatch(
          isInitializing
            ? LogActions.debug(
                'Braze content cards updated, fetching latest content cards...',
              )
            : LogActions.info(
                'Braze content cards updated, fetching latest content cards...',
              ),
        );

        const contentCards = await Braze.getContentCards();

        if (contentCards.length) {
          currentRetry = MAX_RETRIES;
        } else {
          if (isInitializing) {
            currentRetry++;
            await sleep(INIT_CONTENT_CARDS_POLL_INTERVAL);
            dispatch(
              LogActions.debug(
                `0 content cards found. Retrying... (${currentRetry} of ${MAX_RETRIES})`,
              ),
            );
            Braze.requestContentCardsRefresh();
            return;
          }
        }

        dispatch(
          LogActions.info(
            `${contentCards.length} content ${
              contentCards.length === 1 ? 'card' : 'cards'
            } fetched from Braze.`,
          ),
        );
        dispatch(AppActions.brazeContentCardsFetched(contentCards));
      },
    );

    let eid = APP.brazeEid;

    if (!eid) {
      dispatch(LogActions.debug('Generating EID for anonymous user...'));
      eid = uuid.v4().toString();
      dispatch(setBrazeEid(eid));
    }

    // TODO: we should only identify logged in users, but identifying anonymous users is currently baked into some bitcore stuff, will need to refactor
    dispatch(Analytics.identify(eid));

    dispatch(LogActions.info('Successfully initialized Braze.'));
    dispatch(AppActions.brazeInitialized(contentCardSubscription));
  } catch (err) {
    const errMsg = 'Something went wrong while initializing Braze.';

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
 * Requests a refresh for Braze content.
 * @returns void
 */
export const requestBrazeContentRefresh = (): Effect => async dispatch => {
  try {
    dispatch(LogActions.info('Refreshing Braze content...'));

    Braze.requestContentCardsRefresh();
  } catch (err) {
    const errMsg = 'Something went wrong while refreshing Braze content.';

    dispatch(LogActions.error(errMsg));
    dispatch(
      LogActions.error(
        err instanceof Error ? err.message : JSON.stringify(err),
      ),
    );
  }
};

export const startOnGoingProcessModal =
  (key: OnGoingProcessMessages): Effect<Promise<void>> =>
  async (dispatch, getState: () => RootState) => {
    const store: RootState = getState();

    const _OnGoingProcessMessages = {
      GENERAL_AWAITING: i18n.t("Just a second, we're setting a few things up"),
      CREATING_KEY: i18n.t('Creating Key'),
      LOGGING_IN: i18n.t('Logging In'),
      LOGGING_OUT: i18n.t('Logging Out'),
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
      REMOVING_BILL: i18n.t('Removing Bill'),
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

export const startInAppNotification =
  (
    key: InAppNotificationMessages,
    request: SignClientTypes.EventArguments['session_request'],
    context: InAppNotificationContextType,
  ): Effect<Promise<void>> =>
  async (dispatch, getState: () => RootState) => {
    const store: RootState = getState();

    const _InAppNotificationMessages = {
      NEW_PENDING_REQUEST: i18n.t('New Pending Request'),
    };

    // if modal currently active dismiss and sleep to allow animation to complete before showing next
    if (store.APP.showInAppNotification) {
      dispatch(AppActions.dismissInAppNotification());
      await sleep(500);
    }

    // Translate message before show message
    const _message = _InAppNotificationMessages[key];

    dispatch(AppActions.showInAppNotification(context, _message, request));
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

const trackFirstOpenEvent =
  (date: number): Effect =>
  dispatch => {
    dispatch(
      Analytics.track('First Opened App', {date}, () => {
        dispatch(setAppFirstOpenEventComplete());
      }),
    );
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

export const checkNotificationsPermissions = async (): Promise<boolean> => {
  const {status} = await checkNotifications().catch(() => ({status: null}));

  return status === RESULTS.GRANTED;
};

export const renewSubscription = (): Effect => (dispatch, getState) => {
  const {
    WALLET: {keys},
    APP,
  } = getState();

  getAllWalletClients(keys).then(walletClients => {
    walletClients.forEach(walletClient => {
      dispatch(subscribePushNotifications(walletClient, APP.brazeEid!));
    });
  });
};

export const requestNotificationsPermissions = async (): Promise<boolean> => {
  const {status} = await requestNotifications([
    'alert',
    'badge',
    'sound',
  ]).catch(() => ({status: null}));

  return status === RESULTS.GRANTED;
};

export const setNotifications =
  (accepted: boolean): Effect =>
  (dispatch, getState) => {
    dispatch(setNotificationsAccepted(accepted));
    const value = accepted
      ? Braze.NotificationSubscriptionTypes.SUBSCRIBED
      : Braze.NotificationSubscriptionTypes.UNSUBSCRIBED;

    Braze.setPushNotificationSubscriptionType(value);
    const {
      WALLET: {keys},
      APP,
    } = getState();

    getAllWalletClients(keys).then(walletClients => {
      if (accepted) {
        walletClients.forEach(walletClient => {
          dispatch(subscribePushNotifications(walletClient, APP.brazeEid!));
        });
      } else {
        walletClients.forEach(walletClient => {
          dispatch(unSubscribePushNotifications(walletClient, APP.brazeEid!));
        });
      }
      dispatch(LogActions.info('Push Notifications: ' + value));
    });
  };

export const setConfirmTxNotifications =
  (accepted: boolean): Effect =>
  async dispatch => {
    dispatch(setConfirmedTxAccepted(accepted));
  };

export const setAnnouncementsNotifications =
  (accepted: boolean): Effect =>
  async dispatch => {
    dispatch(setAnnouncementsAccepted(accepted));
    if (accepted) {
      Braze.addToSubscriptionGroup(OFFERS_AND_PROMOTIONS_GROUP_ID);
      Braze.addToSubscriptionGroup(PRODUCTS_UPDATES_GROUP_ID);
    } else {
      Braze.removeFromSubscriptionGroup(PRODUCTS_UPDATES_GROUP_ID);
      Braze.removeFromSubscriptionGroup(OFFERS_AND_PROMOTIONS_GROUP_ID);
    }
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

    if (agreedToMarketingCommunications) {
      Braze.setEmailNotificationSubscriptionType(
        Braze.NotificationSubscriptionTypes.OPTED_IN,
      );
    } else {
      Braze.setEmailNotificationSubscriptionType(
        Braze.NotificationSubscriptionTypes.SUBSCRIBED,
      );
    }

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
          Analytics.track('BitPay App - Funded Wallet', {
            walletType: wallet.credentials.addressType,
            cryptoType: wallet.credentials.coin,
            cryptoAmount: true,
          });
          _startUpdateWalletStatus(dispatch, keyObj, wallet);
          break;
      }
    }
  };

export const resetAllSettings = (): Effect => dispatch => {
  dispatch(AppActions.setColorScheme(null));
  dispatch(AppActions.showPortfolioValue(true));
  dispatch(AppActions.toggleHideAllBalances(false));
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

export const incomingShopLink =
  (url: string): Effect<{merchantName: string} | undefined> =>
  (_, getState) => {
    const {SHOP} = getState();
    const availableGiftCards = getAvailableGiftCards(SHOP.availableCardMap);
    const integrations = Object.values(SHOP.integrations);
    const categories = getCategoriesWithIntegrations(
      Object.values(SHOP.categoriesAndCurations.categories),
      integrations,
    );

    const path = url.replace(APP_DEEPLINK_PREFIX, '');
    const state = getStateFromPath(path);
    if (!state?.routes.length) {
      return undefined;
    }
    const route = state.routes[0];
    const merchantName = getRouteParam(url, 'merchant');
    const categoryName = getRouteParam(url, 'category');

    if (!['giftcard', 'shoponline', 'billpay'].includes(route.name)) {
      return undefined;
    }

    if (route.name === 'giftcard') {
      const cardConfig = availableGiftCards.find(
        gc => gc.name.toLowerCase() === merchantName,
      );

      if (cardConfig) {
        navigationRef.navigate('GiftCard', {
          screen: 'BuyGiftCard',
          params: {
            cardConfig,
          },
        });
      } else {
        navigationRef.navigate('Shop', {
          screen: ShopScreens.HOME,
          params: {
            screen: ShopTabs.GIFT_CARDS,
          },
        });
      }
    } else if (route.name === 'shoponline') {
      const directIntegration = integrations.find(
        i => i.displayName.toLowerCase() === merchantName,
      );
      const category = categories.find(
        c => c.displayName.toLowerCase() === categoryName,
      );

      if (category) {
        navigationRef.navigate('Merchant', {
          screen: MerchantScreens.MERCHANT_CATEGORY,
          params: {
            category,
            integrations: category.integrations,
          },
        });
      } else if (directIntegration) {
        navigationRef.navigate('Merchant', {
          screen: MerchantScreens.MERCHANT_DETAILS,
          params: {
            directIntegration,
          },
        });
      } else {
        navigationRef.navigate('Shop', {
          screen: ShopScreens.HOME,
          params: {
            screen: ShopTabs.SHOP_ONLINE,
          },
        });
      }
    } else if (route.name === 'billpay') {
      navigationRef.navigate('Shop', {
        screen: ShopScreens.HOME,
        params: {
          screen: ShopTabs.BILLS,
        },
      });
    }
    return {merchantName};
  };

export const incomingLink =
  (url: string): Effect<boolean> =>
  (dispatch, getState) => {
    const [fullPath, fullParams] = url
      .replace(APP_DEEPLINK_PREFIX, '')
      .split('?');
    const pathSegments = (fullPath || '').split('/');
    const params = (fullParams || '').split('&').reduce((paramMap, kvp) => {
      const [k, v] = kvp.split('=');
      paramMap[k] = v;
      return paramMap;
    }, {} as Record<string, string | undefined>) as any;

    const pathInfo = dispatch(incomingShopLink(url));

    if (pathInfo) {
      return true;
    }

    let handler: (() => void) | null = null;

    if (pathSegments[0] === 'feedback') {
      if (pathSegments[1] === 'rate') {
        handler = () => {
          setTimeout(() => {
            dispatch(requestInAppReview());
          }, 500);
        };
      }
    } else if (pathSegments[0] === 'buy-crypto') {
      handler = () => {
        navigationRef.navigate(RootStacks.BUY_CRYPTO, {
          screen: BuyCryptoScreens.ROOT,
          params,
        });
      };
    } else if (pathSegments[0] === 'connections') {
      const redirectTo = pathSegments[1];

      handler = () => {
        navigationRef.navigate(RootStacks.TABS, {
          screen: TabsScreens.SETTINGS,
          params: {
            screen: SettingsScreens.Root,
            params: {
              redirectTo: redirectTo as any,
            },
          },
        });
      };
    } else if (pathSegments[0] === 'wallet') {
      if (pathSegments[1] === 'create') {
        handler = () => {
          navigationRef.navigate(RootStacks.WALLET, {
            screen: WalletScreens.CREATION_OPTIONS,
            params,
          });
        };
      }
    } else if (pathSegments[0] === 'card') {
      const cardPath = pathSegments[1];
      const createCardHandler = (cb: (cards: Card[]) => void) => {
        return () => {
          const {APP, CARD} = getState();
          const cards = CARD.cards[APP.network];

          if (cards.length) {
            cb(cards);
          } else {
            navigationRef.navigate(RootStacks.TABS, {
              screen: TabsScreens.CARD,
              params: {
                screen: CardScreens.HOME,
              },
            });
          }
        };
      };

      if (cardPath === 'activate') {
        handler = createCardHandler(cards => {
          navigationRef.navigate(RootStacks.CARD_ACTIVATION, {
            screen: CardActivationScreens.ACTIVATE,
            params: {
              card: cards[0],
            },
          });
        });
      } else if (cardPath === 'offers') {
        handler = createCardHandler(cards => {
          navigationRef.navigate(RootStacks.TABS, {
            screen: TabsScreens.CARD,
            params: {
              screen: CardScreens.SETTINGS,
              params: {
                id: cards[0].id,
              },
            },
          });

          dispatch(CardEffects.startOpenDosh());
        });
      } else if (cardPath === 'referral') {
        handler = createCardHandler(cards => {
          navigationRef.navigate(RootStacks.TABS, {
            screen: TabsScreens.CARD,
            params: {
              screen: CardScreens.REFERRAL,
              params: {
                card: cards[0],
              },
            },
          });
        });
      }
    }

    if (handler) {
      const {APP} = getState();
      const {appIsReadyForDeeplinking} = APP;

      if (appIsReadyForDeeplinking) {
        handler();
      } else {
        const subscription = DeviceEventEmitter.addListener(
          DeviceEmitterEvents.APP_READY_FOR_DEEPLINKS,
          () => {
            subscription.remove();
            handler?.();
          },
        );
      }

      return true;
    }

    return false;
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

export const isVersionUpdated =
  (currentVersion: string, savedVersion: string): Effect<Promise<boolean>> =>
  async dispatch => {
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
      dispatch(
        LogActions.error(
          'Cannot verify the format of version tag: ' + currentVersion,
        ),
      );
    }
    if (!verifyTagFormat(savedVersion)) {
      dispatch(
        LogActions.error(
          'Cannot verify the format of the saved version tag: ' + savedVersion,
        ),
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

export const shortcutListener =
  (item: ShortcutItem, navigation: NavigationProp<any>): Effect<void> =>
  dispatch => {
    const {type} = item || {};
    switch (type) {
      case 'buy':
        dispatch(goToBuyCrypto());
        return;
      case 'swap':
        dispatch(goToSwapCrypto());
        return;
      case 'send':
        dispatch(sendCrypto('Shortcut'));
        return;
      case 'receive':
        dispatch(receiveCrypto(navigation, 'Shortcut'));
        return;
      case 'share':
        dispatch(shareApp());
        return;
    }
  };

/**
 * Requests an in-app review UI from the device. Due to review quotas set by
 * Apple/Google, request is not guaranteed to be granted and it is possible
 * that nothing will be presented to the user.
 *
 * @returns
 */
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

export const joinWaitlist =
  (
    email: string,
    attribute: string,
    context: 'bill-pay' | 'bitpay-card',
  ): Effect =>
  async (dispatch, getState) => {
    try {
      const {APP} = getState();
      const network = APP.network as Network;
      const session = await AuthApi.fetchSession(network);
      const baseUrl = BASE_BITPAY_URLS[network];

      const config = {
        headers: {
          'x-csrf-token': session.csrfToken,
        },
      };
      const data = {
        email,
        attribute,
      };

      await axios.post(`${baseUrl}/marketing/marketingOptIn`, data, config);
      switch (context) {
        case 'bitpay-card':
          dispatch(CardActions.isJoinedWaitlist(true));
          break;
        case 'bill-pay':
          dispatch(ShopActions.isJoinedWaitlist(true));
          break;
      }
    } catch (err) {
      dispatch(LogActions.error(`Error joining waitlist: ${err}`));
      throw err;
    }
  };

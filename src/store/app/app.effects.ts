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
import Braze from '@braze/react-native-sdk';
import RNBootSplash from 'react-native-bootsplash';
import InAppReview from 'react-native-in-app-review';
import InAppBrowser, {
  InAppBrowserOptions,
} from 'react-native-inappbrowser-reborn';
import {
  checkNotifications,
  requestNotifications,
  check,
  request,
  RESULTS,
  PERMISSIONS,
} from 'react-native-permissions';
import uuid from 'react-native-uuid';
import {AppActions} from '.';
import BitPayApi from '../../api/bitpay';
import GraphQlApi from '../../api/graphql';
import UserApi from '../../api/user';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {Network} from '../../constants';
import {BuyCryptoScreens} from '../../navigation/services/buy-crypto/BuyCryptoGroup';
import {CardScreens} from '../../navigation/card/CardStack';
import {CardActivationScreens} from '../../navigation/card-activation/CardActivationGroup';
import {TabsScreens} from '../../navigation/tabs/TabsStack';
import {WalletScreens} from '../../navigation/wallet/WalletGroup';
import {isAxiosError} from '../../utils/axios';
import {sleep} from '../../utils/helper-methods';
import {Analytics} from '../analytics/analytics.effects';
import {BitPayIdEffects} from '../bitpay-id';
import {CardActions, CardEffects} from '../card';
import {Card} from '../card/card.models';
import {coinbaseInitialize} from '../coinbase';
import {zenledgerInitialize} from '../zenledger';
import {Effect, RootState} from '../index';
import {LocationEffects} from '../location';
import {LogActions} from '../log';
import {WalletActions} from '../wallet';
import {
  startMigration,
  startAddEDDSAKey,
  startWalletStoreInit,
  startGetRates,
} from '../wallet/effects';
import {
  setAnnouncementsAccepted,
  setAppFirstOpenEventComplete,
  setAppFirstOpenEventDate,
  setAppInstalled,
  setBrazeEid,
  setConfirmedTxAccepted,
  setEmailNotificationsAccepted,
  setMigrationComplete,
  setEDDSAKeyMigrationComplete,
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
import {navigationRef, RootStacks, SilentPushEventObj} from '../../Root';
import {
  startUpdateAllKeyAndWalletStatus,
  startUpdateWalletStatus,
  FormatKeyBalances,
} from '../wallet/effects/status/status';
import {createWalletAddress} from '../wallet/effects/address/address';
import {DeviceEmitterEvents} from '../../constants/device-emitter-events';
import {
  APP_DEEPLINK_PREFIX,
  APP_NAME,
  APP_VERSION,
  BASE_BITPAY_URLS,
  DOWNLOAD_BITPAY_URL,
} from '../../constants/config';
import {
  updatePortfolioBalance,
  setCustomTokensMigrationComplete,
  setWalletScanning,
  setPolygonMigrationComplete,
} from '../wallet/wallet.actions';
import {
  setContactMigrationComplete,
  setContactTokenAddressMigrationComplete,
  setContactBridgeUsdcMigrationComplete,
  setContactMigrationCompleteV2,
} from '../contact/contact.actions';
import {
  startContactBridgeUsdcMigration,
  startContactMigration,
  startContactPolMigration,
  startContactTokenAddressMigration,
  startContactV2Migration,
} from '../contact/contact.effects';
import {getStateFromPath, NavigationProp} from '@react-navigation/native';
import {
  getAvailableGiftCards,
  getCategoriesWithIntegrations,
} from '../shop-catalog';
import {MerchantScreens} from '../../navigation/tabs/shop/merchant/MerchantGroup';
import {ShopTabs} from '../../navigation/tabs/shop/ShopHome';
import {ShopScreens} from '../../navigation/tabs/shop/ShopStack';
import QuickActions, {ShortcutItem} from 'react-native-quick-actions';
import {ShortcutList} from '../../constants/shortcuts';
import {goToBuyCrypto} from '../buy-crypto/buy-crypto.effects';
import {goToSellCrypto} from '../sell-crypto/sell-crypto.effects';
import {goToSwapCrypto} from '../swap-crypto/swap-crypto.effects';
import {receiveCrypto, sendCrypto} from '../wallet/effects/send/send';
import moment from 'moment';
import {FeedbackRateType} from '../../navigation/tabs/settings/about/screens/SendFeedback';
import {moralisInit} from '../moralis/moralis.effects';
import {walletConnectV2Init} from '../wallet-connect-v2/wallet-connect-v2.effects';
import {InAppNotificationMessages} from '../../components/modal/in-app-notification/InAppNotification';
import axios from 'axios';
import AuthApi from '../../api/auth';
import {ShopActions} from '../shop';
import {
  successFetchCatalog,
  setShopMigrationComplete,
} from '../shop-catalog/shop-catalog.actions';
import {clearedShopCatalogFields} from '../shop/shop.actions';
import {
  startCustomTokensMigration,
  startPolMigration,
} from '../wallet/effects/currencies/currencies';
import {WalletKitTypes} from '@reown/walletkit';
import {Key, Wallet} from '../wallet/wallet.models';
import {AppDispatch} from '../../utils/hooks';
import {isNotMobile} from '../../components/styled/Containers';
import {SettingsScreens} from '../../navigation/tabs/settings/SettingsGroup';

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
    dispatch(LogActions.info(`Current App Version: ${APP_VERSION}`));

    dispatch(deferDeeplinksUntilAppIsReady());

    const {APP, CONTACT, WALLET} = getState();
    const {network, colorScheme} = APP;

    WALLET.initLogs.forEach(log => dispatch(log));

    dispatch(LogActions.debug(`Network: ${network}`));
    dispatch(LogActions.debug(`Theme: ${colorScheme || 'system'}`));

    const {migrationComplete, EDDSAKeyMigrationComplete} = APP;
    const {customTokensMigrationComplete, polygonMigrationComplete} = WALLET;
    // init analytics -> post onboarding or migration
    dispatch(initAnalytics());

    dispatch(startWalletStoreInit());

    const {
      contactMigrationComplete,
      contactMigrationCompleteV2,
      contactTokenAddressMigrationComplete,
      contactBridgeUsdcMigrationComplete,
    } = CONTACT;

    if (!contactMigrationComplete) {
      await dispatch(startContactMigration());
      dispatch(setContactMigrationComplete());
      dispatch(LogActions.info('success [setContactMigrationComplete]'));
    }
    if (!contactTokenAddressMigrationComplete) {
      await dispatch(startContactTokenAddressMigration());
      dispatch(setContactTokenAddressMigrationComplete());
      dispatch(
        LogActions.info('success [setContactTokenAddressMigrationComplete]'),
      );
    }
    if (!contactBridgeUsdcMigrationComplete) {
      await dispatch(startContactBridgeUsdcMigration());
      dispatch(setContactBridgeUsdcMigrationComplete());
      dispatch(
        LogActions.info('success [setContactBridgeUsdcMigrationComplete]'),
      );
    }
    if (!customTokensMigrationComplete) {
      await dispatch(startCustomTokensMigration());
      dispatch(setCustomTokensMigrationComplete());
      dispatch(LogActions.info('success [setCustomTokensMigrationComplete]'));
    }

    if (!contactMigrationCompleteV2) {
      await dispatch(startContactV2Migration());
      dispatch(setContactMigrationCompleteV2());
      dispatch(LogActions.info('success [setContactMigrationCompleteV2]'));
    }

    if (!migrationComplete) {
      await dispatch(startMigration());
      dispatch(setMigrationComplete());
      dispatch(LogActions.info('success [setMigrationComplete]'));
    }

    if (!EDDSAKeyMigrationComplete) {
      await dispatch(startAddEDDSAKey());
      dispatch(setEDDSAKeyMigrationComplete());
      dispatch(LogActions.info('success [setEDDSAKeyMigrationComplete]'));
    }

    if (!polygonMigrationComplete) {
      await dispatch(startPolMigration());
      await dispatch(startContactPolMigration());
      dispatch(setPolygonMigrationComplete());
      dispatch(LogActions.info('success [setPolygonMigrationComplete]'));
    }

    dispatch(migrateShopCatalog());

    const identity = dispatch(initializeAppIdentity());

    dispatch(initializeApi(network, identity));

    dispatch(LocationEffects.getLocationData());

    dispatch(fetchInitialUserData());

    // splitting inits into store specific ones as to keep it cleaner in the main init here
    dispatch(walletConnectV2Init());
    dispatch(initializeBrazeContent());
    dispatch(moralisInit());

    // Update Coinbase
    dispatch(coinbaseInitialize());

    // Initialize Zenledger
    dispatch(zenledgerInitialize());

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

const initAnalytics = (): Effect<void> => async (dispatch, getState) => {
  const {APP} = getState();
  const {appFirstOpenData, appInstalled, onboardingCompleted} = APP;

  if (onboardingCompleted) {
    QuickActions.clearShortcutItems();
    QuickActions.setShortcutItems(ShortcutList);
  }
  await dispatch(Analytics.initialize());

  if (!appInstalled) {
    dispatch(trackAppInstalled(Math.floor(Date.now() / 1000)));
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
};

const fetchInitialUserData = (): Effect<void> => async (dispatch, getState) => {
  const {APP, BITPAY_ID} = getState();
  const {network} = APP;

  const token = BITPAY_ID.apiToken[network];

  if (!token) {
    return;
  }

  try {
    dispatch(
      LogActions.info('App is paired with BitPayID, refreshing user data...'),
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
      async (update: Braze.ContentCardsUpdatedEvent) => {
        if (Analytics.isMergingUser()) {
          dispatch(
            LogActions.debug(
              'Skipping Braze content cards update during user merge.',
            ),
          );
          return;
        }
        const contentCards = update.cards;
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

    // Create a Braze EID for all users
    let eid = APP.brazeEid;
    if (!eid) {
      eid = dispatch(createBrazeEid());
    }
    dispatch(LogActions.debug('Braze EID: ', eid));
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

const createBrazeEid = (): Effect<string | undefined> => dispatch => {
  try {
    dispatch(LogActions.info('Generating EID for BWS user...'));

    const eid = uuid.v4().toString();
    dispatch(setBrazeEid(eid));
    dispatch(Analytics.identify(eid));

    dispatch(LogActions.info('Generated EID for BWS user.'));
    return eid;
  } catch (err) {
    const errMsg = 'Something went wrong while generating EID for BWS user.';

    dispatch(LogActions.error(errMsg));
    dispatch(
      LogActions.error(
        err instanceof Error ? err.message : JSON.stringify(err),
      ),
    );
  }
};

/**
 * Requests a refresh for Braze content.
 * @returns void
 */
export const requestBrazeContentRefresh = (): Effect => async dispatch => {
  if (Analytics.isMergingUser()) {
    dispatch(
      LogActions.debug('Skipping Braze content refresh during user merge.'),
    );
    return;
  }
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

    const translations: Record<OnGoingProcessMessages, string> = {
      GENERAL_AWAITING: i18n.t("Just a second, we're setting a few things up"),
      CREATING_KEY: i18n.t(
        "Creating Key... just a second, we're setting a few things up",
      ),
      LOGGING_IN: i18n.t('Logging In'),
      LOGGING_OUT: i18n.t('Logging Out'),
      PAIRING: i18n.t('Pairing'),
      CREATING_ACCOUNT: i18n.t('Creating Account'),
      UPDATING_ACCOUNT: i18n.t('Updating Account'),
      IMPORTING: i18n.t('Importing... this process may take a few minutes'),
      IMPORT_SCANNING_FUNDS: i18n.t(
        'Scanning Funds... this process may take a few minutes',
      ),
      DELETING_KEY: i18n.t('Deleting Key'),
      ADDING_WALLET: i18n.t('Adding Wallet'),
      ADDING_ACCOUNT: i18n.t('Adding Account-Based Wallet'),
      ADDING_EVM_CHAINS: i18n.t('Adding EVM Chains'),
      ADDING_SPL_CHAINS: i18n.t('Adding Solana Account'),
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
      SWEEPING_WALLET: i18n.t('Sweeping Wallet...'),
      SCANNING_FUNDS: i18n.t('Scanning Funds...'),
      SCANNING_FUNDS_WITH_PASSPHRASE: i18n.t(
        'Scanning Funds... this process may take a few minutes',
      ),
    };

    // if modal currently active dismiss and sleep to allow animation to complete before showing next
    if (store.APP.showOnGoingProcessModal) {
      dispatch(AppActions.dismissOnGoingProcessModal());
      await sleep(500);
    }

    // Translate message before show message
    const _message = translations[key];

    dispatch(AppActions.showOnGoingProcessModal(_message));

    // After 60 seconds, check if the modal is active. If so, dismiss it.
    setTimeout(async () => {
      const currentStore = getState();
      if (
        currentStore.APP.showOnGoingProcessModal &&
        currentStore.APP.onGoingProcessModalMessage !==
          i18n.t('Importing... this process may take a few minutes') &&
        currentStore.APP.onGoingProcessModalMessage !==
          i18n.t('Scanning Funds... this process may take a few minutes') &&
        currentStore.APP.onGoingProcessModalMessage !==
          i18n.t("Creating Key... just a second, we're setting a few things up")
      ) {
        dispatch(AppActions.dismissOnGoingProcessModal());
        await sleep(500);
      }
    }, 60000);

    return sleep(100);
  };

export const startInAppNotification =
  (
    key: InAppNotificationMessages,
    request: WalletKitTypes.EventArguments['session_request'],
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
          dispatch(AppActions.setInAppBrowserOpen(true));
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

          dispatch(AppActions.setInAppBrowserOpen(false));
          dispatch(
            LogActions.info(`InAppBrowser closed with type: ${result.type}`),
          );
        } catch (err) {
          const logMsg = `Error opening URL ${url} with ${handler}. Trying external browser.\n${JSON.stringify(
            err,
          )}`;
          dispatch(AppActions.setInAppBrowserOpen(false));
          dispatch(LogActions.error(logMsg));
          // if InAppBrowser is available but InAppBrowser.open fails, will try to open an external browser
          await Linking.openURL(url);
        }
      } else {
        // successfully resolves if an installed app handles the URL,
        // or the user confirms any presented 'open' dialog
        dispatch(AppActions.setInAppBrowserOpen(false));
        await Linking.openURL(url);
      }
    } catch (err) {
      const logMsg = `Error opening URL ${url} with ${handler}.\n${JSON.stringify(
        err,
      )}`;

      dispatch(AppActions.setInAppBrowserOpen(false));
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

const trackAppInstalled =
  (date: number): Effect =>
  dispatch => {
    dispatch(
      Analytics.installedApp({date}, () => {
        dispatch(setAppInstalled());
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
      } else {
        dispatch(
          LogActions.info(
            'Push Notifications success subscribing: ' +
              walletClient.credentials.walletName,
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
  return status?.toLowerCase() === RESULTS.GRANTED;
};

export const renewSubscription = (): Effect => (dispatch, getState) => {
  const {
    WALLET: {keys},
    APP,
  } = getState();

  if (!APP.notificationsAccepted) {
    return;
  }

  LogActions.debug('Renewing Push Notifications...');

  let eid = APP.brazeEid;
  if (!eid) {
    eid = dispatch(createBrazeEid());
  }

  if (eid) {
    getAllWalletClients(keys).then(walletClients => {
      walletClients.forEach(walletClient => {
        dispatch(subscribePushNotifications(walletClient, eid!));
      });
    });
  }
};

export const requestNotificationsPermissions = async (): Promise<boolean> => {
  const {status} = await requestNotifications([
    'alert',
    'badge',
    'sound',
  ]).catch(() => ({
    status: null,
  }));

  return status?.toLowerCase() === RESULTS.GRANTED;
};

export const setNotifications =
  (accepted: boolean): Effect =>
  (dispatch, getState) => {
    dispatch(setNotificationsAccepted(accepted));
    const value = accepted
      ? Braze.NotificationSubscriptionTypes.OPTED_IN
      : Braze.NotificationSubscriptionTypes.UNSUBSCRIBED;

    Braze.setPushNotificationSubscriptionType(value);
    const {
      WALLET: {keys},
      APP,
    } = getState();

    let eid = APP.brazeEid;
    if (!eid && accepted) {
      eid = dispatch(createBrazeEid());
    }
    if (eid) {
      getAllWalletClients(keys).then(walletClients => {
        if (accepted) {
          walletClients.forEach(walletClient => {
            dispatch(subscribePushNotifications(walletClient, eid!));
          });
        } else {
          walletClients.forEach(walletClient => {
            dispatch(unSubscribePushNotifications(walletClient, eid!));
          });
        }
        dispatch(LogActions.info('Push Notifications: ' + value));
      });
    }
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
  async (dispatch, chain, tokenAddress) => {
    dispatch(
      startUpdateAllKeyAndWalletStatus({
        context: 'newBlockEvent',
        force: true,
        createTokenWalletWithFunds: false,
        chain,
        tokenAddress,
      }),
    );
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

const _setScanFinishedForWallet = async (
  dispatch: AppDispatch,
  key: Key,
  wallet: Wallet,
) => {
  dispatch(
    setWalletScanning({
      keyId: key.id,
      walletId: wallet.credentials.walletId,
      isScanning: false,
    }),
  );
  await dispatch(startGetRates({force: true}));
  await dispatch(startUpdateWalletStatus({key, wallet, force: true}));
  await sleep(1000);
  await dispatch(updatePortfolioBalance());
};

export const handleBwsEvent =
  (response: SilentPushEventObj): Effect =>
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
        case 'ScanFinished':
          _setScanFinishedForWallet(dispatch, keyObj, wallet);
          break;
        case 'NewAddress':
          _createWalletAddress(dispatch, wallet);
          break;
        case 'NewBlock':
          if (response.network && response.network === 'livenet') {
            // Chain and tokenAddress are passed to check if a new token received funds on that network and create the wallet if necessary
            _startUpdateAllKeyAndWalletStatus(
              dispatch,
              response.chain,
              response.tokenAddress,
            );
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
  // Reset AltCurrency
  dispatch(
    AppActions.setDefaultAltCurrency({isoCode: 'USD', name: 'US Dollar'}),
  );
  dispatch(FormatKeyBalances());
  dispatch(updatePortfolioBalance());
  dispatch(coinbaseInitialize());
  // Reset Default Language
  i18n.changeLanguage('en');
  dispatch(AppActions.setDefaultLanguage('en'));
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
    const {SHOP_CATALOG} = getState();
    const availableGiftCards = getAvailableGiftCards(
      SHOP_CATALOG.availableCardMap,
    );
    const integrations = Object.values(SHOP_CATALOG.integrations);
    const categories = getCategoriesWithIntegrations(
      Object.values(SHOP_CATALOG.categoriesAndCurations.categories),
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
        navigationRef.navigate('BuyGiftCard', {
          cardConfig,
        });
      } else {
        navigationRef.navigate('Tabs', {
          screen: 'Shop',
          params: {
            screen: ShopScreens.HOME,
            params: {
              screen: ShopTabs.GIFT_CARDS,
            },
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
        navigationRef.navigate(MerchantScreens.MERCHANT_CATEGORY, {
          category,
          integrations: category.integrations,
        });
      } else if (directIntegration) {
        navigationRef.navigate(MerchantScreens.MERCHANT_DETAILS, {
          directIntegration,
        });
      } else {
        navigationRef.navigate('Tabs', {
          screen: 'Shop',
          params: {
            screen: ShopScreens.HOME,
            params: {
              screen: ShopTabs.SHOP_ONLINE,
            },
          },
        });
      }
    } else if (route.name === 'billpay') {
      navigationRef.navigate('Tabs', {
        screen: 'Bills',
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
        navigationRef.navigate(BuyCryptoScreens.ROOT, params);
      };
    } else if (pathSegments[0] === 'connections') {
      const redirectTo = pathSegments[1];

      handler = async () => {
        navigationRef.navigate(RootStacks.TABS, {
          screen: TabsScreens.SETTINGS,
        });
        await sleep(800);
        navigationRef.navigate(SettingsScreens.SETTINGS_DETAILS, {
          initialRoute: 'Connections',
          redirectTo,
        });
      };
    } else if (pathSegments[0] === 'wallet') {
      if (pathSegments[1] === 'create') {
        handler = () => {
          navigationRef.navigate(WalletScreens.CREATION_OPTIONS, params);
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
          navigationRef.navigate(CardActivationScreens.ACTIVATE, {
            card: cards[0],
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
      }
    } else if (pathSegments[0] === 'exchange-rate') {
      handler = () => {
        navigationRef.navigate(RootStacks.TABS, {
          screen: TabsScreens.HOME,
          params,
        });
      };
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

export const checkFaceIdPermissions = async () => {
  // only supported by iOS
  if (Platform.OS !== 'ios') {
    return;
  }
  // Workaround for Desktop App (Apple Silicon)
  if (isNotMobile) {
    return;
  }
  const status = await check(PERMISSIONS.IOS.FACE_ID).catch(() => ({
    status: null,
  }));

  if (status === RESULTS.GRANTED) {
    return;
  }
  const requestStatus = await request(PERMISSIONS.IOS.FACE_ID).catch(() => ({
    status: null,
  }));
  switch (requestStatus) {
    case RESULTS.UNAVAILABLE:
      throw new Error('Biometric is not available on this device');
    case RESULTS.BLOCKED:
      throw new Error('Biometric is blocked on this device');
    case RESULTS.LIMITED:
      throw new Error('Biometric is limited on this device');
    case RESULTS.DENIED:
      throw new Error('Biometric is denied on this device');
    case RESULTS.GRANTED:
    default:
      return;
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
      case 'sell':
        dispatch(goToSellCrypto());
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

export const migrateShopCatalog = (): Effect => (dispatch, getState) => {
  try {
    const {SHOP_CATALOG, SHOP} = getState();
    if (!SHOP_CATALOG.shopMigrationComplete && SHOP.supportedCardMap) {
      dispatch(
        successFetchCatalog({
          availableCardMap: SHOP.availableCardMap,
          supportedCardMap: SHOP.supportedCardMap,
          categoriesAndCurations: SHOP.categoriesAndCurations,
          integrations: SHOP.integrations,
        }),
      );
      dispatch(clearedShopCatalogFields());
      dispatch(setShopMigrationComplete());
      dispatch(
        LogActions.info(
          'Migrated shop tab catalog fields from SHOP store to SHOP_CATALOG store.',
        ),
      );
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
    dispatch(
      LogActions.error(
        `Error migrating shop tab catalog fields from SHOP store to SHOP_CATALOG store: ${errorMsg}`,
      ),
    );
  }
};

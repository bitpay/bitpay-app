// import BitAuth from 'bitauth';
import i18n, {t} from 'i18next';
import {debounce} from 'lodash';
import {Platform, Linking, Share} from 'react-native';
import {AppActions} from '.';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
// import {Network} from '../../constants';
// import {TabsScreens} from '../../navigation/tabs/TabsStack';
// import {WalletScreens} from '../../navigation/wallet/WalletStack';
// import {isAxiosError} from '../../utils/axios';
import {sleep} from '../../utils/helper-methods';
import {Effect, RootState} from '../index';
import {LogActions} from '../log';
import {WalletActions} from '../wallet';
import {startWalletStoreInit} from '../wallet/effects';
import {findKeyByKeyId, findWalletByIdHashed} from '../wallet/utils/wallet';
import {SilentPushEvent} from '../../Root';
import {
  startUpdateAllKeyAndWalletStatus,
  startUpdateWalletStatus,
} from '../wallet/effects/status/status';
import {createWalletAddress} from '../wallet/effects/address/address';
import {APP_NAME, DOWNLOAD_BITPAY_URL} from '../../constants/config';
import {updatePortfolioBalance} from '../wallet/wallet.actions';
// import {getStateFromPath, NavigationProp} from '@react-navigation/native';
// import {
//   getAvailableGiftCards,
//   getCategoriesWithIntegrations,
// } from '../shop/shop.selectors';
// import {SettingsScreens} from '../../navigation/tabs/settings/SettingsStack';
// import {ShortcutList} from '../../constants/shortcuts';
// import {receiveCrypto, sendCrypto} from '../wallet/effects/send/send';
// import moment from 'moment';

export const startAppInit = (): Effect => async (dispatch, getState) => {
  try {
    dispatch(LogActions.clear());
    dispatch(
      LogActions.info(
        `Initializing app (${__DEV__ ? 'Development' : 'Production'})...`,
      ),
    );

    //dispatch(deferDeeplinksUntilAppIsReady());

    const {APP, WALLET} = getState();
    const {network, pinLockActive, biometricLockActive, colorScheme} = APP;

    WALLET.initLogs.forEach(log => dispatch(log));

    dispatch(LogActions.debug(`Network: ${network}`));
    dispatch(LogActions.debug(`Theme: ${colorScheme || 'system'}`));

    dispatch(startWalletStoreInit());

    //dispatch(LocationEffects.getLocationData());

    //dispatch(showBlur(pinLockActive || biometricLockActive));

    dispatch(AppActions.successAppInit());

    //await sleep(500);
    dispatch(LogActions.info('Initialized app successfully.'));
    dispatch(LogActions.debug(`Pin Lock Active: ${pinLockActive}`));
    dispatch(LogActions.debug(`Biometric Lock Active: ${biometricLockActive}`));
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
  }
};

// const deferDeeplinksUntilAppIsReady =
//   (): Effect<void> => (dispatch, getState) => {
//     const {APP} = getState();
//     let subscriptions: EmitterSubscription[] = [];

//     const emitIfReady = () => {
//       if (!subscriptions.length) {
//         dispatch(AppActions.appIsReadyForDeeplinking());
//         DeviceEventEmitter.emit(DeviceEmitterEvents.APP_READY_FOR_DEEPLINKS);
//       }
//     };

//     const waitForEvent = (e: DeviceEmitterEvents) => {
//       const sub = DeviceEventEmitter.addListener(e, () => {
//         sub.remove();
//         subscriptions = subscriptions.filter(s => s !== sub);

//         emitIfReady();
//       });

//       subscriptions.push(sub);
//     };

//     if (!navigationRef.isReady()) {
//       waitForEvent(DeviceEmitterEvents.APP_NAVIGATION_READY);
//     }

//     if (APP.appIsLoading) {
//       waitForEvent(DeviceEmitterEvents.APP_DATA_INITIALIZED);
//     }

//     if (!APP.onboardingCompleted) {
//       waitForEvent(DeviceEmitterEvents.APP_ONBOARDING_COMPLETED);
//     }

//     emitIfReady();
//   };

// /**
//  * Checks to ensure that the App Identity is defined, else generates a new one.
//  * @returns The App Identity.
//  */
// const initializeAppIdentity =
//   (): Effect<AppIdentity> => (dispatch, getState) => {
//     const {APP} = getState();
//     let identity = APP.identity[APP.network];

//     dispatch(LogActions.info('Initializing App Identity...'));

//     if (!identity || !Object.keys(identity).length || !identity.priv) {
//       try {
//         dispatch(LogActions.info('Generating new App Identity...'));

//         identity = BitAuth.generateSin();

//         dispatch(AppActions.successGenerateAppIdentity(APP.network, identity));
//       } catch (error) {
//         dispatch(
//           LogActions.error(
//             'Error generating App Identity: ' + JSON.stringify(error),
//           ),
//         );
//         dispatch(AppActions.failedGenerateAppIdentity());
//       }
//     }

//     dispatch(LogActions.info('Initialized App Identity successfully.'));

//     return identity;
//   };

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

const _startUpdateAllKeyAndWalletStatus = debounce(
  async dispatch => {
    dispatch(startUpdateAllKeyAndWalletStatus({force: true}));
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

/**
 * Open a URL with the InAppBrowser if available, else lets the device handle the URL.
 * @param url
 * @param options
 * @returns
 */
export const openUrlWithInAppBrowser =
  (url: string): Effect =>
  async dispatch => {
    const handler = 'external app'; //in app browser not available
    try {
      dispatch(LogActions.info(`Opening URL ${url} with ${handler}`));

      // successfully resolves if an installed app handles the URL,
      // or the user confirms any presented 'open' dialog
      await Linking.openURL(url);
    } catch (err) {
      const logMsg = `Error opening URL ${url} with ${handler}.\n${JSON.stringify(
        err,
      )}`;

      dispatch(LogActions.error(logMsg));
    }
  };

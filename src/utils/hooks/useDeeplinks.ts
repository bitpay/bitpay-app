import {
  getActionFromState,
  getStateFromPath,
  LinkingOptions,
} from '@react-navigation/native';
import {useMemo, useRef} from 'react';
import {Linking} from 'react-native';
import AppsFlyer from 'react-native-appsflyer';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import {
  APP_CRYPTO_PREFIX,
  APP_DEEPLINK_PREFIX,
  APP_UNIVERSAL_LINK_DOMAINS,
} from '../../constants/config';
import {BitpayIdScreens} from '../../navigation/bitpay-id/BitpayIdStack';
import {BuyCryptoScreens} from '../../navigation/services/buy-crypto/BuyCryptoStack';
import {SwapCryptoScreens} from '../../navigation/services/swap-crypto/SwapCryptoStack';
import {CoinbaseScreens} from '../../navigation/coinbase/CoinbaseStack';
import {navigationRef, RootStackParamList, RootStacks} from '../../Root';
import {incomingData} from '../../store/scan/scan.effects';
import {showBlur} from '../../store/app/app.actions';
import {incomingLink} from '../../store/app/app.effects';
import useAppDispatch from './useAppDispatch';
import {useLogger} from './useLogger';

const getLinkingConfig = (): LinkingOptions<RootStackParamList>['config'] => ({
  initialRouteName: RootStacks.TABS,
  // configuration for associating screens with paths
  screens: {
    [RootStacks.DEBUG]: {
      path: 'debug/:name',
    },
    [RootStacks.BITPAY_ID]: {
      path: 'id',
      screens: {
        [BitpayIdScreens.PAIRING]: 'pair',
        [BitpayIdScreens.RECEIVE_SETTINGS]: 'receive-settings',
      },
    },
    [RootStacks.GIFT_CARD_DEEPLINK]: 'giftcard',
    [RootStacks.BUY_CRYPTO]: {
      screens: {
        [BuyCryptoScreens.ROOT]: {
          path: 'buy/:amount?',
        },
      },
    },
    [RootStacks.SWAP_CRYPTO]: {
      screens: {
        [SwapCryptoScreens.ROOT]: 'swap',
      },
    },
    [RootStacks.COINBASE]: {
      screens: {
        [CoinbaseScreens.ROOT]: 'coinbase',
      },
    },
  },
});

const isUniversalLink = (url: string): boolean => {
  try {
    const domain = url.split('https://')[1].split('/')[0];
    return APP_UNIVERSAL_LINK_DOMAINS.includes(domain);
  } catch {
    return false;
  }
};

const isDeepLink = (url: string): boolean =>
  url.startsWith(APP_DEEPLINK_PREFIX) ||
  url.startsWith(APP_DEEPLINK_PREFIX.replace('//', ''));

const isCryptoLink = (url: string): boolean => {
  try {
    const prefix = url.split(':')[0];
    return APP_CRYPTO_PREFIX.includes(prefix);
  } catch {
    return false;
  }
};

export const useUrlEventHandler = () => {
  const dispatch = useAppDispatch();
  const logger = useLogger();

  const urlEventHandler = async ({url}: {url: string | null}) => {
    logger.debug(`[deeplink] received: ${url}`);

    if (url && (isDeepLink(url) || isUniversalLink(url) || isCryptoLink(url))) {
      logger.info(`[deeplink] valid: ${url}`);
      dispatch(showBlur(false));

      let handled = false;

      // check if the url maps to a navigational link
      if (!handled) {
        handled = dispatch(incomingLink(url));
      }

      // check if the url contains payment data
      if (!handled) {
        handled = await dispatch(incomingData(url));
      }

      // check if the url can be handled by the NavigationContainer based on the linking config
      if (!handled) {
        // try to translate the path to a navigation state according to our linking config
        const path = url.replace(APP_DEEPLINK_PREFIX, '/');
        const state = getStateFromPath(path, getLinkingConfig());

        if (state) {
          const action = getActionFromState(state);

          if (action !== undefined) {
            navigationRef.dispatch(action);
          } else {
            navigationRef.reset(state);
          }

          handled = true;
        }
      }

      try {
        // clicking a deeplink from the IAB in iOS doesn't auto-close the IAB, so do it manually
        InAppBrowser.isAvailable().then(isAvailable => {
          if (isAvailable) {
            InAppBrowser.close();
          }
        });
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error('[deeplink] not available from IAB: ' + errStr);
      }

      return handled;
    }
  };
  const handlerRef = useRef(urlEventHandler);

  return handlerRef.current;
};

export const useDeeplinks = () => {
  const urlEventHandler = useUrlEventHandler();
  const logger = useLogger();

  const memoizedSubscribe = useMemo<
    LinkingOptions<RootStackParamList>['subscribe']
  >(
    () => listener => {
      const subscription = Linking.addEventListener('url', async ({url}) => {
        let handled = false;
        const urlObj = new URL(url);
        const urlParams = urlObj.searchParams;

        if (!handled) {
          const isAppsFlyerDeeplink = urlParams.get('af_deeplink') === 'true';
          const hasEmbeddedDeepLink = !!urlParams.get('deep_link_value');

          // true if should be handled by AppsFlyer SDK
          handled = !!(isAppsFlyerDeeplink && hasEmbeddedDeepLink);
        }

        if (!handled) {
          handled = !!(await urlEventHandler({url}));
        }

        if (!handled) {
          listener(url);
        }
      });

      // Configure AppsFlyer to handle wrapped deeplinks.
      // ie. resolve deeplinks with these hostnames to get the real deeplink
      AppsFlyer.setResolveDeepLinkURLs(
        ['clicks.bitpay.com', 'email.bitpay.com'],
        () => {
          logger.debug(
            'Successfully configured AppsFlyer deeplink resolution.',
          );
        },
        e => {
          const errString = e instanceof Error ? e.message : JSON.stringify(e);
          logger.debug(
            `An error occurred trying to configure AppsFlyer deeplink resolution: ${errString}`,
          );
        },
      );

      const appsFlyerUnsubscribe = AppsFlyer.onDeepLink(udlData => {
        const {data, deepLinkStatus, status} = udlData;

        if (status === 'failure' || deepLinkStatus === 'Error') {
          logger.info('Failed to handle Universal Deep Link.');
          return;
        }

        if (deepLinkStatus === 'NOT_FOUND') {
          logger.info('Universal Deep Link not recognized.');
          return;
        }

        if (deepLinkStatus === 'FOUND') {
          const {deep_link_value} = data;

          if (deep_link_value) {
            urlEventHandler({url: deep_link_value});
          }

          return;
        }

        logger.info(`Unrecognized deeplink status: ${deepLinkStatus}`);
      });

      return () => {
        subscription.remove();
        appsFlyerUnsubscribe();
      };
    },
    [logger, urlEventHandler],
  );

  const linkingOptions: LinkingOptions<RootStackParamList> = {
    prefixes: [APP_DEEPLINK_PREFIX],
    subscribe: memoizedSubscribe,
    config: getLinkingConfig(),
  };

  return linkingOptions;
};

export default useDeeplinks;

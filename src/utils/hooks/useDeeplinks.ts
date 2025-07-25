import {
  getActionFromState,
  getStateFromPath,
  LinkingOptions,
  PathConfig,
} from '@react-navigation/native';
import {useMemo, useRef} from 'react';
import {DeviceEventEmitter, Linking, NativeModules} from 'react-native';
import AppsFlyer from 'react-native-appsflyer';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import {
  APP_CRYPTO_PREFIX,
  APP_DEEPLINK_PREFIX,
  APP_UNIVERSAL_LINK_DOMAINS,
} from '../../constants/config';
import {BitpayIdScreens} from '../../navigation/bitpay-id/BitpayIdGroup';
import {CardScreens} from '../../navigation/card/CardStack';
import {BuyCryptoScreens} from '../../navigation/services/buy-crypto/BuyCryptoGroup';
import {SwapCryptoScreens} from '../../navigation/services/swap-crypto/SwapCryptoGroup';
import {CoinbaseScreens} from '../../navigation/coinbase/CoinbaseGroup';
import {navigationRef, RootStackParamList, RootStacks} from '../../Root';
import {TabsScreens, TabsStackParamList} from '../../navigation/tabs/TabsStack';
import {incomingData} from '../../store/scan/scan.effects';
import {showBlur} from '../../store/app/app.actions';
import {AppActions} from '../../store/app';
import {incomingLink} from '../../store/app/app.effects';
import useAppDispatch from './useAppDispatch';
import {useLogger} from './useLogger';
import {DebugScreens} from '../../navigation/Debug';
import {GiftCardScreens} from '../../navigation/tabs/shop/gift-card/GiftCardGroup';
import useAppSelector from './useAppSelector';
import {DeviceEmitterEvents} from '../../constants/device-emitter-events';
import {SellCryptoScreens} from '../../navigation/services/sell-crypto/SellCryptoGroup';

const getLinkingConfig = (): LinkingOptions<RootStackParamList>['config'] => ({
  initialRouteName: RootStacks.TABS,
  // configuration for associating screens with paths
  screens: {
    [DebugScreens.DEBUG]: {
      path: 'debug/:name',
    },
    [BitpayIdScreens.PAIRING]: 'id/pair',
    [BitpayIdScreens.RECEIVE_SETTINGS]: 'receive-settings',
    [RootStacks.TABS]: {
      screens: {
        [TabsScreens.CARD]: {
          path: 'wallet-card',
          initialRouteName: CardScreens.HOME,
          screens: {
            [CardScreens.PAIRING]: 'pairing',
          },
        },
      },
    } as PathConfig<TabsStackParamList>,
    [GiftCardScreens.GIFT_CARD_DEEPLINK]: 'giftcard',
    [BuyCryptoScreens.ROOT]: {path: 'buy/:amount?'},
    [SwapCryptoScreens.SWAP_CRYPTO_ROOT]: 'swap',
    [SellCryptoScreens.ROOT]: 'sell',
    [CoinbaseScreens.ROOT]: 'coinbase',
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

export const isAcceptedUrl = (url: string): boolean => {
  return isDeepLink(url) || isUniversalLink(url) || isCryptoLink(url);
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
            dispatch(AppActions.setInAppBrowserOpen(false));
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
  const {
    biometricLockActive,
    pinLockActive,
    lockAuthorizedUntil,
    inAppBrowserOpen,
  } = useAppSelector(({APP}) => APP);

  const memoizedSubscribe = useMemo<
    LinkingOptions<RootStackParamList>['subscribe']
  >(
    () => listener => {
      const subscription = Linking.addEventListener('url', async ({url}) => {
        let handled = false;
        const handleUrl = async () => {
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
        };

        if (pinLockActive || biometricLockActive) {
          if (lockAuthorizedUntil) {
            const timeSinceBoot = await NativeModules.Timer.getRelativeTime();
            const totalSecs =
              Number(lockAuthorizedUntil) - Number(timeSinceBoot);
            if (totalSecs < 0 && !inAppBrowserOpen) {
              const subscription = DeviceEventEmitter.addListener(
                DeviceEmitterEvents.APP_LOCK_MODAL_DISMISSED,
                () => {
                  subscription.remove();
                  handleUrl();
                },
              );
            } else {
              handleUrl();
            }
          } else {
            const subscription = DeviceEventEmitter.addListener(
              DeviceEmitterEvents.APP_LOCK_MODAL_DISMISSED,
              () => {
                subscription.remove();
                handleUrl();
              },
            );
          }
        } else {
          handleUrl();
        }
      });

      const appsFlyerUnsubscribe = AppsFlyer.onDeepLink(udlData => {
        const {data, deepLinkStatus, status} = udlData;

        if (status === 'failure' || deepLinkStatus === 'ERROR') {
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
    [
      logger,
      urlEventHandler,
      pinLockActive,
      biometricLockActive,
      lockAuthorizedUntil,
      inAppBrowserOpen,
    ],
  );

  const linkingOptions: LinkingOptions<RootStackParamList> = {
    prefixes: [APP_DEEPLINK_PREFIX],
    subscribe: memoizedSubscribe,
    config: getLinkingConfig(),
  };

  return linkingOptions;
};

export default useDeeplinks;

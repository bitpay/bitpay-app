import {
  getStateFromPath,
  LinkingOptions,
  useNavigation,
} from '@react-navigation/native';
import {useEffect} from 'react';
import {Linking} from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import {useDispatch} from 'react-redux';
import {
  APP_DEEPLINK_PREFIX,
  APP_UNIVERSAL_LINK_DOMAINS,
} from '../../constants/config';
import {BitpayIdScreens} from '../../navigation/bitpay-id/BitpayIdStack';
import {CardScreens} from '../../navigation/card/CardStack';
import {BuyCryptoScreens} from '../../navigation/services/buy-crypto/BuyCryptoStack';
import {SwapCryptoScreens} from '../../navigation/services/swap-crypto/SwapCryptoStack';
import {CoinbaseScreens} from '../../navigation/coinbase/CoinbaseStack';
import {RootStackParamList, RootStacks} from '../../Root';
import {useAppSelector, useLogger} from '.';
import {TabsScreens} from '../../navigation/tabs/TabsStack';
import {SettingsScreens} from '../../navigation/tabs/settings/SettingsStack';
import {incomingData} from '../../store/scan/scan.effects';
import {showBlur} from '../../store/app/app.actions';
import {ShopTabs} from '../../navigation/tabs/shop/ShopHome';
import {ShopScreens} from '../../navigation/tabs/shop/ShopStack';
import {
  selectAvailableGiftCards,
  selectIntegrations,
} from '../../store/shop/shop.selectors';

const isUniversalLink = (url: string): boolean => {
  const domain = url.split('https://')[1].split('/')[0];
  return APP_UNIVERSAL_LINK_DOMAINS.includes(domain);
};

const isDeepLink = (url: string): boolean =>
  url.startsWith(APP_DEEPLINK_PREFIX);

export const useUrlEventHandler = () => {
  const dispatch = useDispatch();
  const logger = useLogger();
  const urlEventHandler = ({url}: {url: string | null}) => {
    if (url && (isDeepLink(url) || isUniversalLink(url))) {
      logger.info(`Deep link received: ${url}`);
      dispatch(showBlur(false));
      dispatch(incomingData(url));

      try {
        // clicking a deeplink from the IAB in iOS doesn't auto-close the IAB, so do it manually
        InAppBrowser.isAvailable().then(isAvailable => {
          if (isAvailable) {
            InAppBrowser.close();
          }
        });
      } catch (err) {
        console.log(err);
      }
    }
  };
  return urlEventHandler;
};

export const useShopDeepLinkHandler = () => {
  const navigation = useNavigation();
  const availableGiftCards = useAppSelector(selectAvailableGiftCards);
  const integrations = useAppSelector(selectIntegrations);

  const shopDeepLinkHandler = (
    url: string,
  ): {merchantName: string} | undefined => {
    const path = url.replace(APP_DEEPLINK_PREFIX, '');
    const state = getStateFromPath(path);
    if (!state?.routes.length) {
      return undefined;
    }
    const route = state.routes[0];
    const merchantName = (
      ((route.params as any) || {}).merchant || ''
    ).toLowerCase();

    if (!['giftcard', 'shoponline'].includes(route.name)) {
      return undefined;
    }

    if (route.name === 'giftcard') {
      const cardConfig = availableGiftCards.find(
        gc => gc.name.toLowerCase() === merchantName,
      );

      if (cardConfig) {
        navigation.navigate('GiftCard', {
          screen: 'BuyGiftCard',
          params: {
            cardConfig,
          },
        });
      } else {
        console.log('navigating to shop tab');
        navigation.navigate('Shop', {
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

      if (directIntegration) {
        navigation.navigate('Merchant', {
          screen: 'MerchantDetails',
          params: {
            directIntegration,
          },
        });
      } else {
        navigation.navigate('Shop', {
          screen: ShopScreens.HOME,
          params: {
            screen: ShopTabs.SHOP_ONLINE,
          },
        });
      }
    }
    return {merchantName};
  };
  return shopDeepLinkHandler;
};

export const useDeeplinks = () => {
  const dispatch = useDispatch();
  const logger = useLogger();
  const urlEventHandler = useUrlEventHandler();

  useEffect(() => {
    Linking.addEventListener('url', urlEventHandler);
    return () => {
      Linking.removeEventListener('url', urlEventHandler);
    };
  }, [dispatch, logger, urlEventHandler]);

  const linkingOptions: LinkingOptions<RootStackParamList> = {
    prefixes: [APP_DEEPLINK_PREFIX],
    config: {
      initialRouteName: 'Tabs',
      // configuration for associating screens with paths
      screens: {
        [RootStacks.DEBUG]: {
          path: 'debug/:name',
        },
        [RootStacks.BITPAY_ID]: {
          path: 'id',
          screens: {
            [BitpayIdScreens.PAIRING]: 'pair',
          },
        },
        [RootStacks.TABS]: {
          screens: {
            [TabsScreens.CARD]: {
              path: 'wallet-card',
              screens: {
                [CardScreens.PAIRING]: 'pairing',
              },
            },
            [TabsScreens.SETTINGS]: {
              screens: {
                [SettingsScreens.Root]: 'connections/:redirectTo',
              },
            },
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
    },
  };

  return linkingOptions;
};

export default useDeeplinks;

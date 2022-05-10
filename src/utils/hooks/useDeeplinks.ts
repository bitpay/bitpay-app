import {LinkingOptions} from '@react-navigation/native';
import {useEffect} from 'react';
import {Linking} from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import {useDispatch} from 'react-redux';
import {APP_DEEPLINK_PREFIX} from '../../constants/config';
import {BitpayIdScreens} from '../../navigation/bitpay-id/BitpayIdStack';
import {CardScreens} from '../../navigation/card/CardStack';
import {BuyCryptoScreens} from '../../navigation/services/buy-crypto/BuyCryptoStack';
import {SwapCryptoScreens} from '../../navigation/services/swap-crypto/SwapCryptoStack';
import {CoinbaseScreens} from '../../navigation/coinbase/CoinbaseStack';
import {RootStackParamList, RootStacks} from '../../Root';
import {useLogger} from '.';
import {TabsScreens} from '../../navigation/tabs/TabsStack';
import {SettingsScreens} from '../../navigation/tabs/settings/SettingsStack';
import {incomingData} from '../../store/scan/scan.effects';

export const useDeeplinks = () => {
  const dispatch = useDispatch();
  const logger = useLogger();

  useEffect(() => {
    const urlEventHandler = ({url}: {url: string}) => {
      if (url && url.startsWith(APP_DEEPLINK_PREFIX)) {
        logger.info(`Deep link received: ${url}`);

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

    Linking.addEventListener('url', urlEventHandler);

    return () => {
      Linking.removeEventListener('url', urlEventHandler);
    };
  }, [dispatch, logger]);

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
          screens: {
            [BitpayIdScreens.PAIR]: 'wallet-card/pairing',
          },
        },
        [RootStacks.TABS]: {
          screens: {
            [TabsScreens.CARD]: {
              screens: {
                [CardScreens.HOME]: 'wallet-card/dashboard/:id',
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

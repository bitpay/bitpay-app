import {LinkingOptions} from '@react-navigation/native';
import {useEffect} from 'react';
import {Linking} from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import {useDispatch} from 'react-redux';
import {DEEPLINK_PREFIX} from '../../constants/config';
import {BitpayIdScreens} from '../../navigation/bitpay-id/BitpayIdStack';
import {RootStackParamList, RootStacks} from '../../Root';
import {useLogger} from '.';

export const useDeeplinks = () => {
  const dispatch = useDispatch();
  const logger = useLogger();

  useEffect(() => {
    const urlEventHandler = ({url}: {url: string}) => {
      if (url && url.startsWith(`${DEEPLINK_PREFIX}://`)) {
        logger.info(`Deep link received: ${url}`);

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
  }, [dispatch]);

  const linkingOptions: LinkingOptions<RootStackParamList> = {
    prefixes: [`${DEEPLINK_PREFIX}://`],
    config: {
      // configuration for associating screens with paths
      screens: {
        [RootStacks.BITPAY_ID]: {
          screens: {
            [BitpayIdScreens.PAIR]: 'wallet-card/pairing',
          },
        },
      },
    },
  };

  return linkingOptions;
};

export default useDeeplinks;

import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useMemo, useRef} from 'react';
import {getCardConfigFromApiConfigMap} from '../../../../lib/gift-cards/gift-card';
import {RootStackParamList} from '../../../../Root';
import {useAppSelector} from '../../../../utils/hooks';

export type GiftCardDeeplinkScreenParamList =
  | {
      merchant?: string | undefined | null;
    }
  | undefined;

/**
 * Creating a dedicated deeplink screen since we rely on the store to get card config.
 * Otherwise we should configure the deeplink directly.
 */
const GiftCardDeeplinkScreen: React.FC<
  StackScreenProps<RootStackParamList, 'GiftCardDeeplink'>
> = ({navigation, route}) => {
  const merchantName = ((route.params || {}).merchant || '').toLowerCase();
  const availableCardMap = useAppSelector(({SHOP}) => SHOP.availableCardMap);
  const availableGiftCards = useMemo(
    () => getCardConfigFromApiConfigMap(availableCardMap),
    [availableCardMap],
  );
  const targetedGiftCard = availableGiftCards.find(
    gc => gc.name.toLowerCase() === merchantName,
  );
  const targetedGiftCardRef = useRef(targetedGiftCard);
  targetedGiftCardRef.current = targetedGiftCard;

  useEffect(() => {
    if (targetedGiftCardRef.current) {
      // ensure there is a root screen before navigating
      if (!navigation.canGoBack()) {
        navigation.replace('Tabs', {
          screen: 'Shop',
          params: {
            screen: 'Home',
          },
        });
        navigation.navigate('GiftCard', {
          screen: 'BuyGiftCard',
          params: {
            cardConfig: targetedGiftCardRef.current,
          },
        });

      } else {
        navigation.replace('GiftCard', {
          screen: 'BuyGiftCard',
          params: {
            cardConfig: targetedGiftCardRef.current,
          },
        });
      }
    } else {
      navigation.replace('Tabs', {
        screen: 'Shop',
        params: {
          screen: 'Home',
        },
      });
    }
  }, [navigation]);

  return <></>;
};

export default GiftCardDeeplinkScreen;

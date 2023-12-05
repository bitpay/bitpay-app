import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useRef} from 'react';
import {RootStackParamList} from '../../../../Root';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {selectAvailableGiftCards} from '../../../../store/shop/shop.selectors';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';

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
  NativeStackScreenProps<RootStackParamList, 'GiftCardDeeplink'>
> = ({navigation, route}) => {
  const merchantName = ((route.params || {}).merchant || '').toLowerCase();
  const availableGiftCards = useAppSelector(selectAvailableGiftCards);
  const dispatch = useAppDispatch();
  const targetedGiftCard = availableGiftCards.find(
    gc => gc.name.toLowerCase() === merchantName,
  );
  const targetedGiftCardRef = useRef(targetedGiftCard);
  targetedGiftCardRef.current = targetedGiftCard;

  useEffect(() => {
    dispatch(
      Analytics.track('Clicked Shop with Crypto', {
        context: 'GiftCardDeeplink',
      }),
    );
    if (targetedGiftCardRef.current) {
      navigation.replace('GiftCard', {
        screen: 'BuyGiftCard',
        params: {
          cardConfig: targetedGiftCardRef.current,
        },
      });
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

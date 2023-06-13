import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useRef} from 'react';
import {RootStackParamList, RootStacks} from '../../../../Root';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {selectAvailableGiftCards} from '../../../../store/shop/shop.selectors';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {TabsScreens} from '../../TabsStack';
import {GiftCardScreens} from './GiftCardStack';

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
  StackScreenProps<RootStackParamList, RootStacks.GIFT_CARD_DEEPLINK>
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
      navigation.replace(RootStacks.GIFT_CARD, {
        screen: GiftCardScreens.BUY_GIFT_CARD,
        params: {
          cardConfig: targetedGiftCardRef.current,
        },
      });
    } else {
      navigation.replace(RootStacks.TABS, {
        screen: TabsScreens.SHOP,
      });
    }
  }, [navigation]);

  return <></>;
};

export default GiftCardDeeplinkScreen;

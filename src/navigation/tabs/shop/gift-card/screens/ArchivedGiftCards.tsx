import React, {useCallback, useEffect} from 'react';
import {useNavigation} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FlashList} from '@shopify/flash-list';
import {
  ScreenContainer,
  SectionContainer,
} from '../../components/styled/ShopTabComponents';
import {GiftCardGroupParamList, GiftCardScreens} from '../GiftCardGroup';
import {GiftCard} from '../../../../../store/shop/shop.models';
import GiftCardCreditsItem from '../../components/GiftCardCreditsItem';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useAppSelector} from '../../../../../utils/hooks';
import {sortByDescendingDate} from '../../../../../lib/gift-cards/gift-card';

const ArchivedGiftCards = ({
  route,
  navigation,
}: NativeStackScreenProps<GiftCardGroupParamList, 'ArchivedGiftCards'>) => {
  const navigator = useNavigation();
  const {supportedGiftCardMap} = route.params;
  const allGiftCards = useAppSelector(
    ({APP, SHOP}) => SHOP.giftCards[APP.network],
  ) as GiftCard[];
  const giftCards = allGiftCards
    .filter(
      giftCard => giftCard.archived && supportedGiftCardMap[giftCard.name],
    )
    .sort(sortByDescendingDate);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!giftCards.length) {
        navigation.pop();
      }
    });
    return unsubscribe;
  }, [giftCards.length, navigation]);
  const renderItem = useCallback(
    ({item: giftCard}: {item: GiftCard}) => {
      const cardConfig = supportedGiftCardMap[giftCard.name];
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          key={giftCard.invoiceId}
          onPress={() =>
            navigator.navigate(GiftCardScreens.GIFT_CARD_DETAILS, {
              cardConfig,
              giftCard,
            })
          }>
          <GiftCardCreditsItem
            cardConfig={cardConfig}
            amount={giftCard.amount}
          />
        </TouchableOpacity>
      );
    },
    [navigator, supportedGiftCardMap],
  );

  return (
    <ScreenContainer>
      <SectionContainer style={{flex: 1}}>
        <FlashList
          data={giftCards}
          renderItem={renderItem}
          estimatedItemSize={65}
          keyExtractor={item => item.invoiceId}
        />
      </SectionContainer>
    </ScreenContainer>
  );
};

export default ArchivedGiftCards;

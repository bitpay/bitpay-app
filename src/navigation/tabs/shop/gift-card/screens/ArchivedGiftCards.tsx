import React, {useCallback, useEffect} from 'react';
import {useNavigation} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import {SectionContainer} from '../../components/styled/ShopTabComponents';
import {GiftCardScreens, GiftCardStackParamList} from '../GiftCardStack';
import {CardConfig, GiftCard} from '../../../../../store/shop/shop.models';
import GiftCardCreditsItem from '../../components/GiftCardCreditsItem';
import {FlatList, TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {useAppSelector} from '../../../../../utils/hooks';
import {APP_NETWORK} from '../../../../../constants/config';
import {sortByDescendingDate} from '../../../../../lib/gift-cards/gift-card';

const ArchivedGiftCards = ({
  route,
  navigation,
}: StackScreenProps<GiftCardStackParamList, 'ArchivedGiftCards'>) => {
  const navigator = useNavigation();
  const {supportedGiftCards} = route.params;
  const allGiftCards = useAppSelector(
    ({SHOP}) => SHOP.giftCards[APP_NETWORK],
  ) as GiftCard[];
  const giftCards = allGiftCards
    .filter(giftCard => giftCard.archived)
    .sort(sortByDescendingDate);
  const supportedGiftCardMap = supportedGiftCards.reduce(
    (map, cardConfig) => ({...map, ...{[cardConfig.name]: cardConfig}}),
    {} as {[name: string]: CardConfig},
  );
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
        <TouchableWithoutFeedback
          key={giftCard.invoiceId}
          onPress={() =>
            navigator.navigate('GiftCard', {
              screen: GiftCardScreens.GIFT_CARD_DETAILS,
              params: {cardConfig, giftCard},
            })
          }>
          <GiftCardCreditsItem
            cardConfig={cardConfig}
            amount={giftCard.amount}
          />
        </TouchableWithoutFeedback>
      );
    },
    [navigator, supportedGiftCardMap],
  );
  return (
    <SectionContainer>
      <FlatList
        data={giftCards}
        renderItem={renderItem}
        keyExtractor={item => item.invoiceId}
      />
    </SectionContainer>
  );
};

export default ArchivedGiftCards;

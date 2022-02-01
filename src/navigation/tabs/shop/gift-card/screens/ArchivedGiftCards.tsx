import React from 'react';
import {ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import {
  SectionContainer,
  SectionSpacer,
} from '../../components/styled/ShopTabComponents';
import {GiftCardScreens, GiftCardStackParamList} from '../GiftCardStack';
import {CardConfig} from '../../../../../store/shop/shop.models';
import GiftCardCreditsItem from '../../components/GiftCardCreditsItem';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';

const ArchivedGiftCards = ({
  route,
}: StackScreenProps<GiftCardStackParamList, 'ArchivedGiftCards'>) => {
  const navigation = useNavigation();
  const {supportedGiftCards, giftCards} = route.params;
  const supportedGiftCardMap = supportedGiftCards.reduce(
    (map, cardConfig) => ({...map, ...{[cardConfig.name]: cardConfig}}),
    {} as {[name: string]: CardConfig},
  );
  return (
    <ScrollView>
      <SectionContainer>
        <SectionSpacer />
        {giftCards
          .sort((a, b) => parseInt(b.date, 10) - parseInt(a.date, 10))
          .map(giftCard => {
            const cardConfig = supportedGiftCardMap[giftCard.name];
            return (
              <TouchableWithoutFeedback
                key={giftCard.invoiceId}
                onPress={() => {
                  navigation.navigate('GiftCard', {
                    screen: GiftCardScreens.GIFT_CARD_DETAILS,
                    params: {cardConfig, giftCard},
                  });
                }}>
                <GiftCardCreditsItem
                  cardConfig={cardConfig}
                  amount={giftCard.amount}
                />
              </TouchableWithoutFeedback>
            );
          })}
      </SectionContainer>
    </ScrollView>
  );
};

export default ArchivedGiftCards;

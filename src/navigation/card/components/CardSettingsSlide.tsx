import {NavigationProp, useNavigation} from '@react-navigation/native';
import React from 'react';
import {View} from 'react-native';
import {Card} from '../../../store/card/card.models';
import {CardStackParamList} from '../CardStack';
import MastercardBack from './CardBack.Mastercard';

interface CardSettingsSlideProps {
  parent: Card;
  card: Card;
}

const buildCardNumber = (lastFour: string) => `**** **** **** ${lastFour}`;

const CardSettingsSlide: React.FC<CardSettingsSlideProps> = props => {
  const navigation = useNavigation<NavigationProp<CardStackParamList>>();
  const {parent, card} = props;
  const CardBack = MastercardBack;

  return (
    <View
      onTouchEnd={() =>
        navigation.navigate('Home', {
          id: parent.id,
        })
      }>
      <CardBack
        cardNumber={buildCardNumber(card.lastFourDigits)}
        cvv={''}
        nickname={card.nickname}
        expiration={''}
      />
    </View>
  );
};

export default CardSettingsSlide;

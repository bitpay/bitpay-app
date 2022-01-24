import {NavigationProp, useNavigation} from '@react-navigation/native';
import React from 'react';
import {View} from 'react-native';
import {Card} from '../../../store/card/card.models';
import {buildCardNumber} from '../../../utils/card';
import {CardStackParamList} from '../CardStack';
import CardBack from './CardBack';

interface CardSettingsSlideProps {
  parent: Card;
  card: Card;
}

const CardSettingsSlide: React.FC<CardSettingsSlideProps> = props => {
  const navigation = useNavigation<NavigationProp<CardStackParamList>>();
  const {parent, card} = props;

  return (
    <View
      onTouchEnd={() =>
        navigation.navigate('Home', {
          id: parent.id,
        })
      }>
      <CardBack
        brand={card.brand || 'Visa'}
        cardNumber={buildCardNumber(card.lastFourDigits)}
        cvv={''}
        nickname={card.nickname}
        expiration={''}
      />
    </View>
  );
};

export default CardSettingsSlide;

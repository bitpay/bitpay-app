import {NavigationProp, useNavigation} from '@react-navigation/native';
import React from 'react';
import {View} from 'react-native';
import {Card} from '../../../store/card/card.models';
import {CardStackParamList} from '../CardStack';
import MastercardBack from './CardBack.Mastercard';
import VisaBack from './CardBack.Visa';

interface CardSettingsSlideProps {
  parent: Card;
  card: Card;
}

export interface ProviderBackProps {
  cardNumber: string;
  nickname: string;
  cvv: string;
  expiration: string;
}

const CARD_BACK = {
  default: MastercardBack,
  galileo: MastercardBack,
  firstView: VisaBack,
};

const buildCardNumber = (lastFour: string) => `**** **** **** ${lastFour}`;

const CardSettingsSlide: React.FC<CardSettingsSlideProps> = props => {
  const navigation = useNavigation<NavigationProp<CardStackParamList>>();
  const {parent, card} = props;
  const CardBack = CARD_BACK[card.provider] || CARD_BACK.default;

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

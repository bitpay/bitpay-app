import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {useSelector} from 'react-redux';
import styled from 'styled-components/native';
import BitPayBLogoBg from '../../../../../../assets/img/logos/bitpay-b-background.svg';
import McLogo from '../../../../../../assets/img/logos/mc-logo.svg';
import HomeCard from '../../../../../components/home-card/HomeCard';
import {RootState} from '../../../../../store';
import {Card} from '../../../../../store/card/card.models';
import {format} from '../../../../../utils/currency';

const HeaderImg = styled.View`
  width: 60px;
  height: 30px;
  align-items: center;
  justify-content: center;
`;

const HeaderComponent = (
  <HeaderImg>
    <McLogo />
  </HeaderImg>
);

const GetMastercard: React.FC = () => {
  const navigation = useNavigation();
  const primaryCard = useSelector<RootState, Card | null>(({APP, CARD}) => {
    const cards = CARD.cards[APP.network] || [];

    return cards.find(c => c.provider === 'galileo') || null;
  });
  const primaryBalance = useSelector<RootState, number>(({CARD}) =>
    primaryCard ? CARD.balances[primaryCard.id] : 0,
  );

  const body = primaryCard
    ? {
        title: 'BitPayCard',
        value: format(primaryBalance, 'USD'),
      }
    : {
        description: 'Get the BitPay prepaid Mastercard®',
      };

  const onCTAPress = () => {
    navigation.navigate('Card', {
      screen: 'Home',
    });
  };

  return (
    <HomeCard
      backgroundImg={() => <BitPayBLogoBg />}
      header={HeaderComponent}
      body={body}
      onCTAPress={onCTAPress}
    />
  );
};

export default GetMastercard;

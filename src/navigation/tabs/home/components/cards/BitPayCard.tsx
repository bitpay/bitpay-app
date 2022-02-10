import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {useSelector} from 'react-redux';
import styled from 'styled-components/native';
import McLogo from '../../../../../../assets/img/logos/mc-logo.svg';
import HomeCard from '../../../../../components/home-card/HomeCard';
import {RootState} from '../../../../../store';
import {Card} from '../../../../../store/card/card.models';
import {format} from '../../../../../utils/currency';
import BitpayBBackgroundIcon from '../../../../../components/icons/bitpay-b-background/BitpayBBackground';

const BgImage = () => <BitpayBBackgroundIcon />;

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

export const GetMastercard: React.FC = () => {
  const navigation = useNavigation();

  return (
    <HomeCard
      backgroundImg={BgImage}
      header={HeaderComponent}
      body={{
        description: 'Get the BitPay prepaid Mastercard®',
      }}
      onCTAPress={() => navigation.navigate('Card', {screen: 'Home'})}
    />
  );
};

export const BitPayCard: React.FC = () => {
  const navigation = useNavigation();
  const primaryCard = useSelector<RootState, Card | null>(({APP, CARD}) => {
    const cards = CARD.cards[APP.network] || [];

    return cards.find(c => c.provider === 'galileo') || null;
  });
  const primaryBalance = useSelector<RootState, number>(({CARD}) =>
    primaryCard ? CARD.balances[primaryCard.id] : 0,
  );

  return (
    <HomeCard
      backgroundImg={BgImage}
      header={HeaderComponent}
      body={{
        title: 'BitPay Card',
        value: format(primaryBalance, 'USD'),
      }}
      onCTAPress={() => navigation.navigate('Card', {screen: 'Home'})}
    />
  );
};

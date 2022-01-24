import {NavigationProp, useNavigation} from '@react-navigation/native';
import React from 'react';
import {useSelector} from 'react-redux';
import styled from 'styled-components/native';
import {RootState} from '../../../store';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import {format} from '../../../utils/currency';
import {CardStackParamList} from '../CardStack';
import {OverviewSlide} from './CardDashboard';
import CardFront from './CardFront';

export interface CardOverviewSlideProps {
  slide: OverviewSlide;
  designCurrency: VirtualDesignCurrency;
}

const SlideContainer = styled.View`
  padding: 0 10px;
`;

const CardOverviewSlide: React.FC<CardOverviewSlideProps> = ({
  designCurrency,
  slide,
}) => {
  const navigation = useNavigation<NavigationProp<CardStackParamList>>();
  const primaryCard = slide.primaryCard;
  const balance = useSelector<RootState, number>(
    ({CARD}) => CARD.balances[primaryCard.id],
  );

  const formattedBalance = format(balance, primaryCard.currency.code);

  return (
    <SlideContainer onTouchEnd={() => navigation.navigate('Settings', {slide})}>
      <CardFront
        brand={primaryCard.brand || 'Visa'}
        provider={primaryCard.provider}
        balance={formattedBalance}
        nickname={primaryCard.nickname}
        fiat={primaryCard.currency.code}
        fiatSymbol={primaryCard.currency.symbol}
        designCurrency={designCurrency}
      />
    </SlideContainer>
  );
};

export default CardOverviewSlide;

import React from 'react';
import {useSelector} from 'react-redux';
import styled from 'styled-components/native';
import {RootState} from '../../../store';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import {format} from '../../../utils/currency';
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
  const primaryCard = slide.primaryCard;
  const balance = useSelector<RootState, number>(
    ({CARD}) => CARD.balances[primaryCard.id],
  );

  const formattedBalance = format(balance, primaryCard.currency.code);

  return (
    <SlideContainer>
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

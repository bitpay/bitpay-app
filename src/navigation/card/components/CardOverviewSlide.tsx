import React from 'react';
import {useSelector} from 'react-redux';
import styled from 'styled-components/native';
import {RootState} from '../../../store';
import {Card} from '../../../store/card/card.models';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import {format} from '../../../utils/currency';
import CardFront from './CardFront';

export interface CardOverviewSlideProps {
  card: Card;
  designCurrency: VirtualDesignCurrency;
}

const SlideContainer = styled.View`
  padding: 0 10px;
`;

const CardOverviewSlide: React.FC<CardOverviewSlideProps> = ({
  card,
  designCurrency,
}) => {
  const balance = useSelector<RootState, number>(
    ({CARD}) => CARD.balances[card.id],
  );

  const formattedBalance = format(balance, card.currency.code);

  return (
    <SlideContainer>
      <CardFront
        brand={card.brand || 'Visa'}
        provider={card.provider}
        balance={formattedBalance}
        nickname={card.nickname}
        fiat={card.currency.code}
        fiatSymbol={card.currency.symbol}
        designCurrency={designCurrency}
      />
    </SlideContainer>
  );
};

export default CardOverviewSlide;

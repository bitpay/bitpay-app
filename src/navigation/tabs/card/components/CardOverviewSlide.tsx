import React from 'react';
import styled from 'styled-components/native';
import {Card} from '../../../../store/card/card.models';
import {VirtualDesignCurrency} from '../../../../store/card/card.types';
import MastercardFront from './CardFront.Mastercard';

export interface CardOverviewSlideProps {
  card: Card;
  designCurrency: VirtualDesignCurrency;
}

export interface BrandFrontProps {
  basic?: boolean;
  balance: string;
  nickname: string;
  fiatSymbol: string;
  fiat: string;
  designCurrency: VirtualDesignCurrency;
}

const SlideContainer = styled.View`
  padding: 0 10px;
`;

const BRANDS = {
  default: MastercardFront,
  Mastercard: MastercardFront,
};

const DEFAULTS = {
  balance: '$9999.99',
};

const CardOverviewSlide: React.FC<CardOverviewSlideProps> = props => {
  const {card, designCurrency} = props;

  const BrandFront = (card.brand && BRANDS[card.brand]) || BRANDS.default;
  const formattedBalance = DEFAULTS.balance;
  const nickname = card.nickname;
  const fiatCurrency = card.currency.code;
  const fiatSymbol = card.currency.symbol;

  return (
    <SlideContainer>
      <BrandFront
        balance={formattedBalance}
        nickname={nickname}
        fiat={fiatCurrency}
        fiatSymbol={fiatSymbol}
        designCurrency={designCurrency}
      />
    </SlideContainer>
  );
};

export default CardOverviewSlide;

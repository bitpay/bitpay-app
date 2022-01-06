import {NavigationProp, useNavigation} from '@react-navigation/native';
import React from 'react';
import styled from 'styled-components/native';
import {VirtualDesignCurrency} from '../../../../store/card/card.types';
import {CardStackParamList} from '../CardStack';
import {OverviewSlide} from './CardDashboard';
import MastercardFront from './CardFront.Mastercard';

export interface CardOverviewSlideProps {
  slide: OverviewSlide;
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
  const navigation = useNavigation<NavigationProp<CardStackParamList>>();

  const {designCurrency, slide} = props;
  const primaryCard = slide.primaryCard;

  const BrandFront =
    (primaryCard.brand && BRANDS[primaryCard.brand]) || BRANDS.default;
  const formattedBalance = DEFAULTS.balance;
  const nickname = primaryCard.nickname;
  const fiatCurrency = primaryCard.currency.code;
  const fiatSymbol = primaryCard.currency.symbol;

  return (
    <SlideContainer onTouchEnd={() => navigation.navigate('Settings', {slide})}>
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

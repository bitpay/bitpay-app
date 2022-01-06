import React from 'react';
import styled from 'styled-components/native';
import {Card} from '../../../../store/card/card.models';
import BitPayBCurrencyShape from '../svgs/currency-shapes/bitpay-b-shape.svg';
import MastercardFront from './CardFront.Mastercard';

export interface CardOverviewSlideProps {
  card: Card;
  designCurrency: 'bitpay-b';
}

export interface BrandFrontProps {
  basic?: boolean;
  balance: string;
  nickname: string;
  fiatSymbol: string;
  fiat: string;
  designCurrency: 'bitpay-b';
}

const SlideContainer = styled.View`
  padding: 0 10px;
`;

export const CURRENCY_LOGOS = {
  'bitpay-b': BitPayBCurrencyShape,
};

const BRANDS = {
  default: MastercardFront,
  Mastercard: MastercardFront,
};

export const getVirtualCardCustomColor = (currency: string) => {
  switch (currency) {
    case 'BTC':
      return {
        stopColor1: '#F7931A',
        stopColor2: '#A25F0E',
        pillColor: '#FFF',
        pillBackground: '#B66400',
        pillCircleBackground: '#FFF',
      };
    case 'BCH':
      return {
        stopColor1: '#2FCF6E',
        stopColor2: '#0C6630',
        pillColor: '#FFF',
        pillBackground: '#20924F',
        pillCircleBackground: '#FFF',
      };
    case 'ETH':
      return {
        stopColor1: '#9A9FF1',
        stopColor2: '#575DC2',
        pillColor: '#FFF',
        pillBackground: '#595FC6',
        pillCircleBackground: '#FFF',
      };
    case 'DOGE':
      return {
        stopColor1: '#E5C66B',
        stopColor2: '#80641B',
        pillColor: '#5C4731',
        pillBackground: '#F1DBA0',
        pillCircleBackground: '#000',
      };
    case 'XRP':
      return {
        stopColor1: '#4D4D4D',
        stopColor2: '#000',
        pillColor: '#FFF',
        pillBackground: '#3F3F3F',
        pillCircleBackground: '#FFF',
      };
    case 'DAI':
      return {
        stopColor1: '#F5AC37',
        stopColor2: '#895605',
        pillColor: '#FFF',
        pillBackground: '#A36A10',
        pillCircleBackground: '#FFF',
      };
    case 'USDC':
      return {
        stopColor1: '#2775CA',
        stopColor2: '#03366D',
        pillColor: '#FFF',
        pillBackground: '#024085',
        pillCircleBackground: '#FFF',
      };
    case 'PAX':
      return {
        stopColor1: '#B3D234',
        stopColor2: '#00845D',
        pillColor: '#FFF',
        pillBackground: '#2BA023',
        pillCircleBackground: '#FFF',
      };
    case 'BUSD':
      return {
        stopColor1: '#F3BA2D',
        stopColor2: '#936903',
        pillColor: '#FFF',
        pillBackground: '#A47708',
        pillCircleBackground: '#FFF',
      };
    case 'GUSD':
      return {
        stopColor1: '#00DFFE',
        stopColor2: '#006F7E',
        pillColor: '#FFF',
        pillBackground: '#007B8C',
        pillCircleBackground: '#FFF',
      };
    default:
      return {
        stopColor1: '#1A3B8B',
        stopColor2: '#1A3B8B',
        pillColor: '#FFF',
        pillBackground: '#3C4E9E',
        pillCircleBackground: '#FFF',
      };
  }
};

const DEFAULTS = {
  balance: '$9999.99',
  designCurrency: 'bitpay-b' as 'bitpay-b',
};

const CardOverviewSlide: React.FC<CardOverviewSlideProps> = props => {
  const {card, designCurrency = DEFAULTS.designCurrency} = props;

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

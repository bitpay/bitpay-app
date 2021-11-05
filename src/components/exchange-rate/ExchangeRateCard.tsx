import React from 'react';
import styled from 'styled-components/native';
import {Caution} from '../../styles/colors';
import {BaseText} from '../styled/text/Text';
import {ExchangeRateProps} from './ExchangeRatesSlides';

const ExchangeRateCardContainer = styled.View`
  justify-content: flex-start;
  align-items: center;
  flex-direction: column;
  width: 100px;
  height: 91px;
  border-radius: 12px;
  background-color: white;
`;

const CoinIconContainer = styled.View`
  padding-top: 19px;
  padding-bottom: 6px;
`;

const CoinNameText = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
  line-height: 19px;
`;
const CoinAverageText = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 10px;
  line-height: 12px;
  color: ${({average}: ExchangeRateProps) =>
    average && average >= 0 ? '#1E8257' : Caution};
`;

export default ({item}: {item: ExchangeRateProps}) => {
  const {img, coinName, average} = item;

  return (
    <ExchangeRateCardContainer
      style={{
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      }}>
      <CoinIconContainer>{img()}</CoinIconContainer>
      <CoinNameText>{coinName}</CoinNameText>
      <CoinAverageText average={average}>{average}%</CoinAverageText>
    </ExchangeRateCardContainer>
  );
};

import React from 'react';
import styled from 'styled-components/native';
import {
  Black,
  Caution,
  LightBlack,
  White,
} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import {ExchangeRateProps} from './ExchangeRatesSlides';
import {ColorSchemeName} from 'react-native';

const ExchangeRateCardContainer = styled.View<{colorScheme: ColorSchemeName}>`
  justify-content: flex-start;
  align-items: center;
  flex-direction: column;
  width: 130px;
  height: 100px;
  border-radius: 12px;
  background-color: ${({colorScheme}: {colorScheme: ColorSchemeName}) =>
    colorScheme === 'light' ? White : LightBlack};
`;

const CoinIconContainer = styled.View`
  padding-top: 19px;
  padding-bottom: 6px;
`;

const CoinNameText = styled(BaseText)<{colorScheme: ColorSchemeName}>`
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
  line-height: 19px;
  color: ${({colorScheme}: {colorScheme: ColorSchemeName}) =>
    colorScheme === 'light' ? Black : White};
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
  const {img, coinName, average, colorScheme} = item;

  return (
    <ExchangeRateCardContainer
      style={[
        {
          shadowColor: '#000',
          shadowOffset: {width: -2, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 5,
          borderRadius: 12,
          position: 'absolute',
          top: 12,
          left: 10,
        },
      ]}
      colorScheme={colorScheme}>
      <CoinIconContainer>{img}</CoinIconContainer>
      <CoinNameText colorScheme={colorScheme}>{coinName}</CoinNameText>
      <CoinAverageText average={average}>{average}%</CoinAverageText>
    </ExchangeRateCardContainer>
  );
};

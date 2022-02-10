import React, {ReactElement} from 'react';
import {Carousel} from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import {WIDTH} from '../styled/Containers';
import ExchangeRateCard from './ExchangeRateCard';

export interface ExchangeRateProps {
  id: string;
  img: string | ((props: any) => ReactElement);
  currencyName?: string;
  average?: number;
}

interface ExchangeRateSlide {
  items: Array<ExchangeRateProps>;
}

const ExchangeRatesContainer = styled.View`
  min-height: 125px;
  width: 100%;
`;

const ExchangeRatesSlides = ({items}: ExchangeRateSlide) => {
  return (
    <ExchangeRatesContainer>
      <Carousel
        vertical={false}
        layout={'default'}
        useExperimentalSnap={true}
        data={items}
        renderItem={ExchangeRateCard}
        sliderWidth={WIDTH}
        itemWidth={150}
        inactiveSlideScale={1}
        inactiveSlideOpacity={1}
      />
    </ExchangeRatesContainer>
  );
};

export default ExchangeRatesSlides;

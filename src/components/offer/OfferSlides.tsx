import React, {ReactElement, useRef} from 'react';
import {Dimensions} from 'react-native';
import {Carousel} from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import haptic from '../haptic-feedback/haptic';
import ExchangeRateCard from './OfferCard';

export interface OfferProps {
  id: number;
  img: () => ReactElement;
  title?: string;
  description?: string;
}

interface OfferSlide {
  items: Array<OfferProps>;
}

const WIDTH = Dimensions.get('window').width;

const OffersContainer = styled.SafeAreaView`
  flex: 1;
  position: relative;
  left: 16px;
  top: 30px;
`;

const OffersSlides = ({items}: OfferSlide) => {
  const ref = useRef(null);

  return (
    <OffersContainer>
      <Carousel
        vertical={false}
        layout={'default'}
        useExperimentalSnap={true}
        data={items}
        renderItem={ExchangeRateCard}
        ref={ref}
        sliderWidth={WIDTH}
        itemWidth={270}
        inactiveSlideScale={1}
        inactiveSlideOpacity={1}
        onScrollIndexChanged={() => {
          haptic('impactLight');
        }}
      />
    </OffersContainer>
  );
};

export default OffersSlides;

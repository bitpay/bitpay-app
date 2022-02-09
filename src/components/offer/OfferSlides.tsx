import React, {ReactElement} from 'react';
import {Carousel} from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import haptic from '../haptic-feedback/haptic';
import {WIDTH} from '../styled/Containers';
import OfferCard from './OfferCard';

export interface OfferProps {
  id: number;
  img: ReactElement;
  title?: string;
  description?: string;
  onPress: () => void;
}

interface OfferSlide {
  items: Array<OfferProps>;
}

const OffersContainer = styled.View`
  flex: 1;
  margin: 10px 0 20px;
`;

const OffersSlides = ({items}: OfferSlide) => {
  return (
    <OffersContainer>
      <Carousel
        vertical={false}
        layout={'default'}
        useExperimentalSnap={true}
        data={items}
        renderItem={OfferCard}
        sliderWidth={WIDTH}
        itemWidth={280}
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

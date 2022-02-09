import React, {memo} from 'react';
import {Carousel} from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import haptic from '../haptic-feedback/haptic';
import {WIDTH} from '../styled/Containers';
import {OfferItems, OfferProps} from './offer';
import OfferCard from './OfferCard';

const OffersContainer = styled.View`
  flex: 1;
  margin: 10px 0 20px;
`;

const OffersSlides = () => {
  return (
    <OffersContainer>
      <Carousel<OfferProps>
        vertical={false}
        layout={'default'}
        useExperimentalSnap={true}
        data={OfferItems}
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

export default memo(OffersSlides);

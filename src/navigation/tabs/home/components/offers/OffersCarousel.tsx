import React, {memo} from 'react';
import {Carousel} from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import {WIDTH} from '../../../../../components/styled/Containers';
import OfferCard, {Offer} from './OfferCard';

interface OfferSlidesProps {
  offers: Offer[];
}

const OffersContainer = styled.View`
  flex: 1;
  margin: 10px 0 20px;
`;

const renderOffer = ({item}: {item: Offer}) => <OfferCard offer={item} />;

const OffersCarousel: React.FC<OfferSlidesProps> = props => {
  const {offers} = props;

  return (
    <OffersContainer>
      <Carousel<Offer>
        vertical={false}
        layout={'default'}
        useExperimentalSnap={true}
        data={offers}
        renderItem={renderOffer}
        sliderWidth={WIDTH}
        itemWidth={280}
        inactiveSlideScale={1}
        inactiveSlideOpacity={1}
      />
    </OffersContainer>
  );
};

export default memo(OffersCarousel);

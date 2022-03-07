import React, {memo} from 'react';
import {Carousel} from 'react-native-snap-carousel';
import {WIDTH} from '../../../../../components/styled/Containers';
import OfferCard, {Offer} from './OfferCard';

interface OfferSlidesProps {
  offers: Offer[];
}

const renderOffer = ({item}: {item: Offer}) => <OfferCard offer={item} />;

const OffersCarousel: React.FC<OfferSlidesProps> = props => {
  const {offers} = props;

  return (
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
  );
};

export default memo(OffersCarousel);

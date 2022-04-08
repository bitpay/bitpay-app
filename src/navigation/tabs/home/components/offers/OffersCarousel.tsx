import React, {memo} from 'react';
import {ContentCard} from 'react-native-appboy-sdk';
import {Carousel} from 'react-native-snap-carousel';
import {WIDTH} from '../../../../../components/styled/Containers';
import OfferCard from './OfferCard';

interface OfferSlidesProps {
  contentCards: ContentCard[];
}

const renderOffer = ({item}: {item: ContentCard}) => (
  <OfferCard contentCard={item} />
);

const OffersCarousel: React.FC<OfferSlidesProps> = props => {
  const {contentCards} = props;

  return (
    <Carousel<ContentCard>
      containerCustomStyle={{
        paddingVertical: 20,
        marginTop: 20,
      }}
      vertical={false}
      layout={'default'}
      useExperimentalSnap={true}
      data={contentCards}
      renderItem={renderOffer}
      sliderWidth={WIDTH}
      itemWidth={230}
      inactiveSlideScale={1}
      inactiveSlideOpacity={1}
    />
  );
};

export default memo(OffersCarousel);

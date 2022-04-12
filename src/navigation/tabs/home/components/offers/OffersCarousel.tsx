import React, {memo} from 'react';
import {ContentCard} from 'react-native-appboy-sdk';
import {Carousel} from 'react-native-snap-carousel';
import {WIDTH} from '../../../../../components/styled/Containers';
import OfferCard from './OfferCard';
import {CarouselItemContainer} from '../Styled';

interface OfferSlidesProps {
  contentCards: ContentCard[];
}

const renderOffer = ({item}: {item: ContentCard}) => (
  <CarouselItemContainer>
    <OfferCard contentCard={item} />
  </CarouselItemContainer>
);

const OffersCarousel: React.FC<OfferSlidesProps> = props => {
  const {contentCards} = props;

  return (
    <Carousel<ContentCard>
      containerCustomStyle={{
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

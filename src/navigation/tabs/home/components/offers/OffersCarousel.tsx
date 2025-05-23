import React, {memo} from 'react';
import {ContentCard} from '@braze/react-native-sdk';
import Carousel from 'react-native-reanimated-carousel';
import {WIDTH} from '../../../../../components/styled/Containers';
import OfferCard from './OfferCard';
import {CarouselItemContainer} from '../Styled';

interface OfferSlidesProps {
  contentCards: ContentCard[];
}
const itemWidth = 230;

const renderOffer = ({item}: {item: ContentCard}) => (
  <CarouselItemContainer>
    <OfferCard contentCard={item} />
  </CarouselItemContainer>
);

const OffersCarousel: React.FC<OfferSlidesProps> = props => {
  const {contentCards} = props;

  return (
    <Carousel
      loop={false}
      vertical={false}
      style={{width: WIDTH}}
      width={itemWidth}
      height={itemWidth / 2}
      autoPlay={false}
      data={contentCards}
      scrollAnimationDuration={1000}
      enabled={true}
      renderItem={renderOffer}
    />
  );
};

export default memo(OffersCarousel);

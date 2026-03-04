import React, {memo} from 'react';
import {ContentCard} from '@braze/react-native-sdk';
import Carousel from 'react-native-reanimated-carousel';
import {ScreenGutter, WIDTH} from '../../../../../components/styled/Containers';
import OfferCard from './OfferCard';
import styled from 'styled-components/native';

const horizontalPadding = Number(ScreenGutter.replace('px', ''));

const CarouselItemContainer = styled.View`
  padding-left: ${horizontalPadding}px;
  padding-right: 0;
  padding-top: 15px;
`;

interface OfferSlidesProps {
  contentCards: ContentCard[];
}
const itemWidth = 250;
const itemHeight = 280;

const renderOffer = ({item}: {item: ContentCard}) => (
  <CarouselItemContainer style={{height: itemHeight}}>
    <OfferCard contentCard={item} />
  </CarouselItemContainer>
);

const OffersCarousel: React.FC<OfferSlidesProps> = props => {
  const {contentCards} = props;

  return (
    <Carousel
      onConfigurePanGesture={gestureChain => {
        gestureChain.activeOffsetX([-10, 10]);
        gestureChain.failOffsetY([-10, 10]);
      }}
      loop={false}
      vertical={false}
      style={{width: WIDTH}}
      width={itemWidth + horizontalPadding * 2}
      height={itemHeight}
      autoPlay={false}
      data={contentCards}
      scrollAnimationDuration={1000}
      enabled={true}
      renderItem={renderOffer}
    />
  );
};

export default memo(OffersCarousel);

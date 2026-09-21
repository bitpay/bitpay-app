import React, {memo} from 'react';
import {ContentCard} from '@braze/react-native-sdk';
import {StyleSheet, View} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import {ScreenGutter, WIDTH} from '../../../../../components/styled/Containers';
import OfferCard from './OfferCard';

const horizontalPadding = Number(ScreenGutter.replace('px', ''));

const styles = StyleSheet.create({
  carouselItemContainer: {
    paddingLeft: horizontalPadding,
    paddingRight: 0,
    paddingTop: 15,
  },
});

const CarouselItemContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.carouselItemContainer, style]} {...rest} />;

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

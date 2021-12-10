import React from 'react';
import styled, {css} from 'styled-components/native';
import Carousel from 'react-native-snap-carousel';
import GiftCardCatalogItem from './GiftCardCatalogItem';
import haptic from '../../../../components/haptic-feedback/haptic';
import {CardConfig} from '../../../../store/shop/shop.models';

export default ({
  giftCards,
  screenWidth,
}: {
  giftCards: CardConfig[];
  screenWidth: number;
}) => {
  const maxGiftCardsPerColumn = 3;
  const nextColumnVisiblePixels = 100;
  const caurouselItemWidth = Math.round(screenWidth - nextColumnVisiblePixels);

  const giftCardSlides = giftCards.reduce((all, one, i) => {
    const ch = Math.floor(i / maxGiftCardsPerColumn);
    all[ch] = [].concat(all[ch] || [], one as any);
    return all;
  }, [] as any);

  const isSingleSlide = giftCardSlides.length === 1;
  interface SlideParams {
    inLastSlide: boolean;
  }

  const SlideContainer = styled.View<SlideParams>`
    ${({inLastSlide}) => css`
      padding-right: ${isSingleSlide ? 0 : nextColumnVisiblePixels / 2}px;
      margin-right: ${inLastSlide
        ? -nextColumnVisiblePixels * 2
        : -nextColumnVisiblePixels / 2}px;
    `}
  `;

  const ItemTouchableHighlight = styled.TouchableHighlight<SlideParams>`
    ${({inLastSlide}) => css`
      padding-left: 20px;
      width: ${inLastSlide ? screenWidth : caurouselItemWidth}px;
    `}
  `;

  return (
    <Carousel
      vertical={false}
      layout={'default'}
      useExperimentalSnap={false}
      data={giftCardSlides}
      inactiveSlideOpacity={1}
      inactiveSlideScale={1}
      activeSlideAlignment={'start'}
      sliderWidth={screenWidth}
      itemWidth={isSingleSlide ? screenWidth : caurouselItemWidth}
      scrollEnabled={!isSingleSlide}
      onScrollIndexChanged={() => haptic('impactLight')}
      // @ts-ignore
      disableIntervalMomentum={true}
      renderItem={(item: any) => (
        <SlideContainer
          inLastSlide={item.dataIndex === giftCardSlides.length - 1}>
          {item.item.map((cardConfig: CardConfig) => (
            <ItemTouchableHighlight
              inLastSlide={item.dataIndex === giftCardSlides.length - 1}
              key={cardConfig.name}
              onPress={() => console.log('press', cardConfig.displayName)}
              underlayColor={'#fbfbff'}>
              <GiftCardCatalogItem cardConfig={cardConfig} />
            </ItemTouchableHighlight>
          ))}
        </SlideContainer>
      )}
    />
  );
};

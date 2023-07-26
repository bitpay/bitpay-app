import React from 'react';
import styled, {css} from 'styled-components/native';
import Carousel from 'react-native-reanimated-carousel';
import {
  CardConfig,
  DirectIntegrationApiObject,
} from '../../../../store/shop/shop.models';
interface SlideContainerParams {
  inLastSlide: boolean;
  isSingleSlide: boolean;
  nextColumnVisiblePixels: number;
}

const SlideContainer = styled.View<SlideContainerParams>`
  ${({inLastSlide, isSingleSlide, nextColumnVisiblePixels}) => css`
    padding-right: ${isSingleSlide ? 0 : nextColumnVisiblePixels / 2}px;
    margin-right: ${inLastSlide
      ? -nextColumnVisiblePixels * 2
      : -nextColumnVisiblePixels / 2}px;
  `}
`;

interface TouchableHighlightParams {
  width: number;
}

const ItemTouchableHighlight = styled.TouchableHighlight<TouchableHighlightParams>`
  ${({width}) =>
    css`
      width: ${width}px;
    `}
`;

export type ShopCarouselItem = CardConfig | DirectIntegrationApiObject;

export default ({
  items,
  itemComponent,
  itemWidth,
  itemWidthInLastSlide,
  itemUnderlayColor,
  maxItemsPerColumn,
  screenWidth,
  onItemPress,
}: {
  items: ShopCarouselItem[];
  itemComponent: (item: ShopCarouselItem) => JSX.Element;
  itemWidth?: number;
  itemWidthInLastSlide?: number;
  itemUnderlayColor?: string;
  maxItemsPerColumn: number;
  screenWidth: number;
  onItemPress: (item: ShopCarouselItem) => any;
}) => {
  const nextColumnVisiblePixels = 100;
  const carouselItemWidth =
    itemWidth || Math.round(screenWidth - nextColumnVisiblePixels);
  const carouselItemWidthInLastSlide =
    itemWidthInLastSlide || carouselItemWidth;

  const slides = items.reduce((all, one, i) => {
    const ch = Math.floor(i / maxItemsPerColumn);
    all[ch] = [].concat(all[ch] || [], one as any);
    return all;
  }, [] as any);

  const isSingleSlide = slides.length === 1;

  return (
    <Carousel
      loop={false}
      autoFillData={false}
      vertical={false}
      style={{width: screenWidth}}
      width={isSingleSlide ? screenWidth : carouselItemWidth}
      height={isSingleSlide ? carouselItemWidth / 4 : carouselItemWidth * 1.3}
      autoPlay={false}
      data={slides}
      scrollAnimationDuration={1000}
      enabled={!isSingleSlide}
      renderItem={({
        item,
        index,
      }: {
        item: ShopCarouselItem[];
        index: number;
      }) => {
        return (
          <SlideContainer
            inLastSlide={index === slides.length - 1}
            isSingleSlide={isSingleSlide}
            nextColumnVisiblePixels={nextColumnVisiblePixels}>
            {item.map((listItem: ShopCarouselItem) => (
              <ItemTouchableHighlight
                width={
                  index === slides.length - 1
                    ? carouselItemWidthInLastSlide
                    : carouselItemWidth
                }
                key={listItem.displayName}
                onPress={() => {
                  console.log('press', listItem.displayName);
                  onItemPress(listItem);
                }}
                underlayColor={itemUnderlayColor || 'transparent'}>
                {itemComponent(listItem)}
              </ItemTouchableHighlight>
            ))}
          </SlideContainer>
        );
      }}
    />
  );
};

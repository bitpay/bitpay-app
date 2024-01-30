import React from 'react';
import styled, {css} from 'styled-components/native';
import {TouchableHighlight} from 'react-native-gesture-handler';
import Carousel from 'react-native-reanimated-carousel';
import {
  CardConfig,
  DirectIntegrationApiObject,
} from '../../../../store/shop/shop.models';
import {ActiveOpacity} from '../../../../components/styled/Containers';

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

const ItemTouchableHighlight = styled(
  TouchableHighlight,
)<TouchableHighlightParams>`
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
  itemHeight,
  itemWidthInLastSlide,
  itemUnderlayColor,
  maxItemsPerColumn,
  screenWidth,
  onItemPress,
}: {
  items: ShopCarouselItem[];
  itemComponent: (item: ShopCarouselItem) => JSX.Element;
  itemWidth?: number;
  itemHeight: number;
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
  const numRows = (slides[0] && slides[0].length) || 0;

  return (
    <Carousel
      loop={false}
      autoFillData={false}
      vertical={false}
      style={{width: screenWidth}}
      width={isSingleSlide ? screenWidth : carouselItemWidth}
      height={numRows * itemHeight}
      autoPlay={false}
      data={slides}
      scrollAnimationDuration={1000}
      panGestureHandlerProps={{
        activeOffsetX: [-10, 10],
      }}
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
                activeOpacity={ActiveOpacity}
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

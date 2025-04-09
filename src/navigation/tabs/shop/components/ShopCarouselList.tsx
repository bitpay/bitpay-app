import React from 'react';
import styled, {css} from 'styled-components/native';
import {TouchableHighlight} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import {
  CardConfig,
  DirectIntegrationApiObject,
} from '../../../../store/shop/shop.models';
import {ActiveOpacity} from '../../../../components/styled/Containers';

interface SlideContainerParams {
  inLastSlide: boolean;
  isSingleSlide: boolean;
  marginLeft?: number;
  nextColumnVisiblePixels: number;
}

const SlideContainer = styled.View<SlideContainerParams>`
  ${({inLastSlide, isSingleSlide, marginLeft, nextColumnVisiblePixels}) => css`
    ${marginLeft && `margin-left: ${marginLeft}px;`};
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
  marginLeft,
  maxItemsPerColumn,
  screenWidth,
  windowSize,
  onItemPress,
}: {
  items: ShopCarouselItem[];
  itemComponent: (item: ShopCarouselItem, index: number) => JSX.Element;
  itemWidth?: number;
  itemHeight: number;
  itemWidthInLastSlide?: number;
  itemUnderlayColor?: string;
  marginLeft?: number;
  maxItemsPerColumn: number;
  screenWidth: number;
  windowSize: number;
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
      onConfigurePanGesture={gestureChain => {
        gestureChain.activeOffsetX([-10, 10]);
        gestureChain.failOffsetY([-10, 10]);
      }}
      loop={false}
      autoFillData={false}
      vertical={false}
      style={{width: screenWidth}}
      width={isSingleSlide ? screenWidth : carouselItemWidth}
      height={numRows * itemHeight}
      autoPlay={false}
      data={slides}
      windowSize={windowSize}
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
            marginLeft={marginLeft}
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
                onPress={() => onItemPress(listItem)}
                underlayColor={itemUnderlayColor || 'transparent'}>
                {itemComponent(listItem, index)}
              </ItemTouchableHighlight>
            ))}
          </SlideContainer>
        );
      }}
    />
  );
};

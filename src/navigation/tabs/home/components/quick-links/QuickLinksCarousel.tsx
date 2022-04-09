import React from 'react';
import {ContentCard} from 'react-native-appboy-sdk';
import {Carousel} from 'react-native-snap-carousel';
import {WIDTH} from '../../../../../components/styled/Containers';
import QuickLinksCard from './QuickLinksCard';
import {CarouselItemContainer} from '../Styled';

interface QuickLinksCarouselProps {
  contentCards: ContentCard[];
}

const renderQuickLink = ({item}: {item: ContentCard}) => (
  <CarouselItemContainer>
    <QuickLinksCard contentCard={item} />
  </CarouselItemContainer>
);

const QuickLinksCarousel: React.FC<QuickLinksCarouselProps> = ({
  contentCards,
}) => {
  return (
    <Carousel<ContentCard>
      containerCustomStyle={{
        marginTop: 20,
      }}
      vertical={false}
      layout={'default'}
      useExperimentalSnap={true}
      data={contentCards}
      renderItem={renderQuickLink}
      sliderWidth={WIDTH}
      itemWidth={225}
      inactiveSlideScale={1}
      inactiveSlideOpacity={1}
    />
  );
};

export default QuickLinksCarousel;

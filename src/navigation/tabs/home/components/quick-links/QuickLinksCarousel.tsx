import React from 'react';
import {ContentCard} from 'react-native-appboy-sdk';
import {Carousel} from 'react-native-snap-carousel';
import {WIDTH} from '../../../../../components/styled/Containers';
import QuickLinksCard from './QuickLinksCard';

interface QuickLinksCarouselProps {
  contentCards: ContentCard[];
}

const renderQuickLink = ({item}: {item: ContentCard}) => (
  <QuickLinksCard contentCard={item} />
);

const QuickLinksCarousel: React.FC<QuickLinksCarouselProps> = ({
  contentCards,
}) => {
  return (
    <Carousel<ContentCard>
      vertical={false}
      layout={'default'}
      useExperimentalSnap={true}
      data={contentCards}
      renderItem={renderQuickLink}
      sliderWidth={WIDTH}
      itemWidth={212}
      inactiveSlideScale={1}
      inactiveSlideOpacity={1}
    />
  );
};

export default QuickLinksCarousel;

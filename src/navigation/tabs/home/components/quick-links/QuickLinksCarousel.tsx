import React from 'react';
import {Carousel} from 'react-native-snap-carousel';
import {WIDTH} from '../../../../../components/styled/Containers';
import QuickLinksCard, {QuickLink} from './QuickLinksCard';

interface QuickLinksCarouselProps {
  items: QuickLink[];
}

const renderQuickLink = ({item}: {item: QuickLink}) => (
  <QuickLinksCard quickLink={item} />
);

const QuickLinksCarousel: React.FC<QuickLinksCarouselProps> = ({items}) => {
  return (
    <Carousel<QuickLink>
      vertical={false}
      layout={'default'}
      useExperimentalSnap={true}
      data={items}
      renderItem={renderQuickLink}
      sliderWidth={WIDTH}
      itemWidth={212}
      inactiveSlideScale={1}
      inactiveSlideOpacity={1}
    />
  );
};

export default QuickLinksCarousel;

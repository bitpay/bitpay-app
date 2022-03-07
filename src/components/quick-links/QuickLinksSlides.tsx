import React, {ReactElement} from 'react';
import {Carousel} from 'react-native-snap-carousel';
import {WIDTH} from '../styled/Containers';
import QuickLinkCard from './QuickLinksCard';

export interface QuickLinkProps {
  id: string;
  img: ReactElement;
  title?: string;
  description?: string;
  link?: string;
  onPress: () => void;
}

interface QuickLinkSlide {
  items: Array<QuickLinkProps>;
}

const QuickLinksSlides = ({items}: QuickLinkSlide) => {
  return (
    <Carousel
      vertical={false}
      layout={'default'}
      useExperimentalSnap={true}
      data={items}
      renderItem={QuickLinkCard}
      sliderWidth={WIDTH}
      itemWidth={212}
      inactiveSlideScale={1}
      inactiveSlideOpacity={1}
    />
  );
};

export default QuickLinksSlides;

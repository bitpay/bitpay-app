import React, {ReactElement} from 'react';
import {Carousel} from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import haptic from '../haptic-feedback/haptic';
import {ScreenGutter, WIDTH} from '../styled/Containers';
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

const QuickLinksContainer = styled.View`
  flex: 1;
  margin: 10px 0 20px ${ScreenGutter};
`;

const QuickLinksSlides = ({items}: QuickLinkSlide) => {
  return (
    <QuickLinksContainer>
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
        onScrollIndexChanged={() => {
          haptic('impactLight');
        }}
      />
    </QuickLinksContainer>
  );
};

export default QuickLinksSlides;

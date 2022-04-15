import React from 'react';
import Svg, {Defs, RadialGradient, Rect, Stop} from 'react-native-svg';
import {CARD_HEIGHT, CARD_WIDTH} from '../../../constants/config.card';

const CardOverlayBackground: React.FC = () => {
  return (
    <Svg height={CARD_HEIGHT} width={CARD_WIDTH}>
      <Defs>
        <RadialGradient
          id="overlay-bg"
          // inner circle
          r={'50%'}
          cx={'50%'}
          cy={'50%'}
          // outer circle
          fx={'50%'}
          fy={'50%'}
          gradientUnits="userSpaceOnUse">
          <Stop offset={0} stopColor={'#000'} stopOpacity={0.85} />
          <Stop offset={1} stopColor={'#000'} stopOpacity={0.7} />
        </RadialGradient>
      </Defs>
      <Rect fill={'url(#overlay-bg)'} height={'100%'} width={'100%'} />
    </Svg>
  );
};

export default CardOverlayBackground;

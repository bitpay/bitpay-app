import React from 'react';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import styled, {useTheme} from 'styled-components/native';

interface ScrollHintProps {
  height: number;
  offset?: number;
}

export const ScrollHintContainer = styled.View`
  bottom: 0;
  position: absolute;
  width: 100%;
`;

const ScrollHint: React.FC<ScrollHintProps> = props => {
  const {height, offset = 0.25} = props;
  const theme = useTheme();

  return (
    <Svg height={height} width={'100%'}>
      <Defs>
        <LinearGradient
          id="overlay-bg"
          x1={0}
          x2={0}
          y1={'0%'}
          y2={'100%'}
          gradientUnits="userSpaceOnUse">
          <Stop
            offset={0}
            stopColor={theme.colors.background}
            stopOpacity={0}
          />
          <Stop
            offset={offset}
            stopColor={theme.colors.background}
            stopOpacity={1}
          />
        </LinearGradient>
      </Defs>

      <Rect fill={'url(#overlay-bg)'} height={'100%'} width={'100%'} />
    </Svg>
  );
};

export default ScrollHint;

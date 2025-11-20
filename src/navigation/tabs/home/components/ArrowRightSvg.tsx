import React from 'react';
import {Ellipse, G, Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {LinkBlue, Midnight, Action, LightBlue} from '../../../../styles/colors';

const ArrowRightSvg: React.FC<{
  width?: number;
  height?: number;
}> = ({width = 30, height = 30}) => {
  const theme = useTheme();
  const circleColor = theme.dark ? Midnight : LightBlue;
  const arrowColor = theme.dark ? LinkBlue : Action;

  const baseArrowWidth = 11.25;
  const targetArrowWidth = 15;
  const arrowScale = targetArrowWidth / baseArrowWidth;
  const centerX = 20;
  const centerY = 20;
  const arrowOriginX = 6;
  const arrowOriginY = 6.5;

  return (
    <Svg width={width} height={height} viewBox="0 0 40 40" fill="none">
      <Ellipse cx="20" cy="20" rx="20" ry="20" fill={circleColor} />
      <G
        transform={`translate(${centerX} ${centerY}) scale(${arrowScale}) translate(${-arrowOriginX} ${-arrowOriginY})`}>
        <Path
          d="M9.47025 7.0625L0.375 7.0625L0.375 5.9375L9.47025 5.9375L5.19806 1.66531L6 0.875L11.625 6.5L6 12.125L5.19806 11.3347L9.47025 7.0625Z"
          fill={arrowColor}
        />
      </G>
    </Svg>
  );
};

export default ArrowRightSvg;

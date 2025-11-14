import React from 'react';
import {useTheme} from 'styled-components/native';
import Svg, {Rect, Path} from 'react-native-svg';
import type {SvgProps} from 'react-native-svg';
import {Success50, White} from '../../../styles/colors';

export interface TrendArrowProps extends SvgProps {
  backgroundColor?: string;
  arrowColor?: string;
}

const IncrementArrow: React.FC<TrendArrowProps> = ({
  backgroundColor,
  arrowColor,
  width = 20,
  height = 20,
  ...rest
}) => {
  const theme = useTheme();
  const defaultBackground =
    backgroundColor ?? (theme.dark ? '#00954F' : '#0B5135');
  const defaultArrowColor = arrowColor ?? (theme.dark ? White : White);

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      {...rest}>
      <Rect
        width="20"
        height="20"
        rx="6"
        transform="matrix(1 0 0 -1 0 20)"
        fill={defaultBackground}
      />
      <Path
        d="M1.70379 0.132585L1.67609 1.34232L5.3917 1.25723L7.2415e-06 6.64892L0.844314 7.49322L6.236 2.10153L6.15091 5.81714L7.36065 5.78944L7.49323 3.02961e-06L1.70379 0.132585Z"
        fill={defaultArrowColor}
        transform="translate(6 6)"
      />
    </Svg>
  );
};

export default IncrementArrow;

import React from 'react';
import * as Svg from 'react-native-svg';

interface CheckIconProps {
  color?: Svg.Color;
}

const CheckIcon: React.FC<CheckIconProps> = props => {
  const {color = '#083574'} = props;

  return (
    <Svg.Svg
      id="check-icon"
      height="30"
      width="30"
      viewBox="0 0 30 30"
      fill="none">
      <Svg.Circle cx="15" cy="15" r="15" fill={color} />
      <Svg.Path
        transform="translate(5, 7)"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.50682 12.0639L2.24653 7.72917L0.639893 9.36387L5.69447 14.5067C5.92012 14.7363 6.22701 14.92 6.49779 14.92C6.76857 14.92 7.06643 14.7363 7.29208 14.5159L19.3599 2.17305L17.7713 0.519989L6.50682 12.0639Z"
        fill="#fff"
      />
    </Svg.Svg>
  );
};

export default CheckIcon;

import React from 'react';
import {Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {Slate, SlateDark} from '../../../../styles/colors';

const ChevronDown: React.FC<{width?: number; height?: number}> = ({
  width = 9,
  height = 5,
}) => {
  const theme = useTheme();
  const fillColor = theme.dark ? Slate : SlateDark;

  return (
    <Svg width={width} height={height} viewBox="0 0 9 5" fill="none">
      <Path
        d="M4.95592e-06 0.63083L4.29056 4.92139L8.58112 0.630831L7.95034 5.29014e-05L4.29056 3.65994L0.630783 5.25814e-05L4.95592e-06 0.63083Z"
        fill={fillColor}
      />
    </Svg>
  );
};

export default ChevronDown;

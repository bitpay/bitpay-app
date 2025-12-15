import React from 'react';
import {Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {Action, LinkBlue} from '../../../../styles/colors';

const ChevronRightSvg: React.FC<{width?: number; height?: number}> = ({
  width = 6,
  height = 10,
}) => {
  const theme = useTheme();
  const fillColor = theme.dark ? LinkBlue : Action;

  return (
    <Svg width={width} height={height} viewBox="0 0 6 10" fill="none">
      <Path
        d="M1.66693 0.872441L5.79443 4.99994L1.66693 9.12744L0.6061 8.06661L3.67277 4.99994L0.606099 1.93327L1.66693 0.872441Z"
        fill={fillColor}
      />
    </Svg>
  );
};

export default ChevronRightSvg;

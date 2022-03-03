import React from 'react';
import {useTheme} from 'styled-components/native';
import {Path, Svg, G} from 'react-native-svg';
import {NotificationPrimary, White} from '../../../styles/colors';

interface SwapProps {
  isDark: boolean;
}

const SwapSvg: React.FC<SwapProps> = ({isDark}) => {
  return (
    <Svg width="16" height="14" viewBox="0 0 16 14" fill="none">
      <G opacity="0.5">
        <Path
          d="M3.5 0.5L0.5 3.5L3.5 6.5"
          stroke={isDark ? White : NotificationPrimary}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <Path
          d="M12.5 3.5H0.5"
          stroke={isDark ? White : NotificationPrimary}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <Path
          d="M12.5 7.5L15.5 10.5L12.5 13.5"
          stroke={isDark ? White : NotificationPrimary}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <Path
          d="M3.5 10.5H15.5"
          stroke={isDark ? White : NotificationPrimary}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </G>
    </Svg>
  );
};
const SwapHorizontal = () => {
  const theme = useTheme();

  return <SwapSvg isDark={theme.dark} />;
};

export default SwapHorizontal;

import React from 'react';
import {Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {SlateDark, White} from '../../../styles/colors';

interface RefreshSvgProps {
  isDark: boolean;
}

const RefreshSvg: React.FC<RefreshSvgProps> = ({isDark}) => {
  return (
    <Svg width="16" height="17" viewBox="0 0 16 17" fill="none">
      <Path
        d="M15.8152 6.94684L14.7619 0.624878L12.5873 2.79952C11.3157 1.86996 9.79042 1.35996 8.18834 1.35996C4.06414 1.35996 0.708336 4.71576 0.708336 8.83996C0.708336 12.9642 4.06414 16.32 8.18834 16.32C11.1627 16.32 13.8541 14.5588 15.0455 11.8326C15.1957 11.4886 15.0387 11.0874 14.6946 10.9371C14.3512 10.7882 13.95 10.9439 13.799 11.288C12.8246 13.5184 10.6221 14.96 8.18834 14.96C4.81418 14.96 2.06834 12.2141 2.06834 8.83996C2.06834 5.4658 4.81418 2.71996 8.18834 2.71996C9.42662 2.71996 10.6105 3.08988 11.6149 3.77192L9.49326 5.89352L15.8152 6.94684Z"
        fill={isDark ? White : SlateDark}
      />
    </Svg>
  );
};

const RefreshIcon = () => {
  const theme = useTheme();

  return <RefreshSvg isDark={theme.dark} />;
};

export default RefreshIcon;

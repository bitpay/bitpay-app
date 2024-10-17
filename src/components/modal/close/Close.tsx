import React from 'react';
import {Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {LightBlack, White} from '../../../styles/colors';

const CloseIcon: React.FC = () => {
  const theme = useTheme();
  return (
    <Svg height={20} width={20} viewBox="0 0 1024 1024">
      <Path
        fill={theme.dark ? White : LightBlack}
        d="M810 273.596L750.404 214 512 452.404 273.596 214 214 273.596 452.404 512 214 750.404 273.596 810 512 571.596 750.404 810 810 750.404 571.596 512z"
      />
    </Svg>
  );
};

export default CloseIcon;

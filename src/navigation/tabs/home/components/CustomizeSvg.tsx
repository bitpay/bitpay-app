import React from 'react';
import {Circle, Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {Action, LinkBlue} from '../../../../styles/colors';

const CustomizeSvg: React.FC<{
  width: number;
  height: number;
}> = ({width = 35, height = 35}) => {
  const theme = useTheme();
  return (
    <Svg width={width} height={height} viewBox="0 0 35 35" fill="none">
      <Circle
        cx="17.5"
        cy="17.5"
        r="17.5"
        fill={theme.dark ? '#0C204E' : '#ECEFFD'}
      />
      <Path
        d="M15 15V11C15 10.4 14.6 10 14 10C13.4 10 13 10.4 13 11V15C13 15.6 13.4 16 14 16C14.6 16 15 15.6 15 15Z"
        fill={theme.dark ? LinkBlue : Action}
      />
      <Path
        d="M11 21C11 22.3 11.9 23.4 13 23.8C13 23.9 13 23.9 13 24V25C13 25.6 13.4 26 14 26C14.6 26 15 25.6 15 25V24C15 23.9 15 23.9 15 23.8C16.2 23.4 17 22.3 17 21C17 19.3 15.7 18 14 18C12.3 18 11 19.3 11 21Z"
        fill={theme.dark ? LinkBlue : Action}
      />
      <Path
        d="M21 21V25C21 25.6 21.4 26 22 26C22.6 26 23 25.6 23 25V21C23 20.4 22.6 20 22 20C21.4 20 21 20.4 21 21Z"
        fill={theme.dark ? LinkBlue : Action}
      />
      <Path
        d="M19 15C19 16.7 20.3 18 22 18C23.7 18 25 16.7 25 15C25 13.7 24.1 12.6 23 12.2C23 12.1 23 12.1 23 12V11C23 10.4 22.6 10 22 10C21.4 10 21 10.4 21 11V12C21 12.1 21 12.1 21 12.2C19.9 12.6 19 13.7 19 15Z"
        fill={theme.dark ? LinkBlue : Action}
      />
    </Svg>
  );
};

export default CustomizeSvg;

import React from 'react';
import {Circle, Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {Action, LightBlue, LinkBlue, Midnight} from '../../../../styles/colors';

const CustomizeSvg: React.FC<{
  width: number;
  height: number;
}> = ({width = 40, height = 40}) => {
  const theme = useTheme();
  return (
    <Svg width={width} height={height} viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="20" r="20" fill={theme.dark ? Midnight : LightBlue} />
      <Path
        d="M5.17285 19.75V12.6923H3.17285V11.1923H8.67285V12.6923H6.67285V19.75H5.17285ZM5.17285 8.80775V4.25H6.67285V8.80775H5.17285ZM9.24985 8.80775V7.30775H11.2499V4.25H12.7499V7.30775H14.7499V8.80775H9.24985ZM11.2499 19.75V11.1923H12.7499V19.75H11.2499ZM17.3269 19.75V16.6923H15.3269V15.1923H20.8269V16.6923H18.8269V19.75H17.3269ZM17.3269 12.8077V4.25H18.8269V12.8077H17.3269Z"
        fill={theme.dark ? LinkBlue : Action}
        transform="translate(8 8)"
      />
    </Svg>
  );
};

export default CustomizeSvg;

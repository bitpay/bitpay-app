import React from 'react';
import {Circle, Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {Action, LightBlue, LinkBlue, Midnight} from '../../../../styles/colors';

const AddSvg: React.FC<{
  width: number;
  height: number;
}> = ({width = 40, height = 40}) => {
  const theme = useTheme();
  return (
    <Svg width={width} height={height} viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="20" r="20" fill={theme.dark ? Midnight : LightBlue} />
      <Path
        d="M4.3055 13.7157L4.3055 12.2255H12.2251L12.2251 4.30591L13.7153 4.3059L13.7153 12.2255H21.6349L21.6349 13.7157L13.7153 13.7157L13.7153 21.6353L12.2251 21.6353L12.2251 13.7157L4.3055 13.7157Z"
        fill={theme.dark ? LinkBlue : Action}
        transform="translate(7.5 7.5)"
      />
    </Svg>
  );
};

export default AddSvg;

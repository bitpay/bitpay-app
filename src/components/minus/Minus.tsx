import React from 'react';
import {Color, Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {Action, SlateDark, White} from '../../styles/colors';

interface MinusProps {
  color: Color | null | undefined;
  opacity: number | undefined;
}

interface Props {
  color?: Color | undefined;
  opacity?: number | undefined;
}

const Minus: React.FC<MinusProps> = ({color}) => {
  const fill = color || SlateDark;
  return (
    <Svg width="10px" height="1px" viewBox="0 0 16 2">
      <Path stroke={fill} strokeWidth={3} d="M16,0 L0,0" />
    </Svg>
  );
};

const MinusIcon = ({color, opacity}: Props) => {
  const theme = useTheme();
  const themedColor = theme.dark ? White : Action;

  return <Minus color={color || themedColor} opacity={opacity} />;
};

export default MinusIcon;

import React from 'react';
import {Color, Path, Svg} from 'react-native-svg';
import {useTheme} from '../../contexts';
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
    <Svg width="10px" height="10px" viewBox="0 0 16 16">
      <Path stroke={fill} strokeWidth={3} d="M16,8 L0,8" />
    </Svg>
  );
};

const MinusIcon = ({color, opacity}: Props) => {
  const theme = useTheme();
  const themedColor = theme.dark ? White : Action;

  return <Minus color={color || themedColor} opacity={opacity} />;
};

export default MinusIcon;

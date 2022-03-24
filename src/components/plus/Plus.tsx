import React from 'react';
import {Color, Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {White, Action} from '../../styles/colors';

interface PlusProps {
  color: Color | null | undefined;
  opacity: number | undefined;
}

interface Props {
  color?: Color | undefined;
  opacity?: number | undefined;
}

const Plus: React.FC<PlusProps> = ({color}) => {
  const fill = color || '#434D5A';
  return (
    <Svg width="10px" height="10px" viewBox="0 0 16 16">
      <Path stroke={fill} strokeWidth={1} d="M16,8 L0,8" id="Shape" />
      <Path stroke={fill} strokeWidth={1} d="M8,0 L8,16" id="Shape" />
    </Svg>
  );
};

const PlusIcon = ({color, opacity}: Props) => {
  const theme = useTheme();
  const themedColor = theme.dark ? White : Action;

  return <Plus color={color || themedColor} opacity={opacity} />;
};

export default PlusIcon;

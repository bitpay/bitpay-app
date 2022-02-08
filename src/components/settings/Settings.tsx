import React from 'react';
import {Color, Rect, Svg, Ellipse, Circle} from 'react-native-svg';
import styled, {useTheme} from 'styled-components/native';
import {LightBlack, NeutralSlate, SlateDark, White} from '../../styles/colors';

interface SettingsSvgProps {
  color: Color | undefined;
  background: Color | undefined;
}

const SettingsSvg: React.FC<SettingsSvgProps> = ({color, background}) => {
  return (
    <Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <Rect width="40" height="40" rx="20" fill={background} />
      <Ellipse cx="12" cy="20" rx="2" ry="2" fill={color} />
      <Circle cx="20" cy="20" r="2" fill={color} />
      <Ellipse cx="28" cy="20" rx="2" ry="2" fill={color} />
    </Svg>
  );
};

const SettingsSvgContainer = styled.TouchableOpacity`
  padding-top: 10px;
  transform: scale(1.1);
  padding-right: 15px;
`;

const Settings = ({onPress}: {onPress: () => void}) => {
  const theme = useTheme();
  const color = theme.dark ? White : SlateDark;
  const background = theme.dark ? LightBlack : NeutralSlate;

  return (
    <SettingsSvgContainer activeOpacity={0.75} onPress={onPress}>
      <SettingsSvg color={color} background={background} />
    </SettingsSvgContainer>
  );
};

export default Settings;

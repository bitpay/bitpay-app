import React from 'react';
import {Rect, Svg, Path} from 'react-native-svg';
import styled, {useTheme} from 'styled-components/native';
import {LightBlack, NeutralSlate, Slate, SlateDark} from '../../styles/colors';
import {ActiveOpacity, HeaderRightContainer} from '../styled/Containers';
import {TouchableOpacity} from 'react-native-gesture-handler';

interface SettingsSvgProps {
  color: string;
  background: string;
}

const SettingsSvg: React.FC<SettingsSvgProps> = ({color, background}) => {
  return (
    <Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <Rect width="40" height="40" rx="20" fill={background} />
      <Path
        d="M1.5 3C1.0875 3 0.734417 2.85308 0.44075 2.55925C0.146917 2.26558 0 1.9125 0 1.5C0 1.0875 0.146917 0.734417 0.44075 0.44075C0.734417 0.146917 1.0875 0 1.5 0C1.9125 0 2.26567 0.146917 2.5595 0.44075C2.85317 0.734417 3 1.0875 3 1.5C3 1.9125 2.85317 2.26558 2.5595 2.55925C2.26567 2.85308 1.9125 3 1.5 3ZM7.26925 3C6.85675 3 6.50367 2.85308 6.21 2.55925C5.91617 2.26558 5.76925 1.9125 5.76925 1.5C5.76925 1.0875 5.91617 0.734417 6.21 0.44075C6.50367 0.146917 6.85675 0 7.26925 0C7.68175 0 8.03483 0.146917 8.3285 0.44075C8.62233 0.734417 8.76925 1.0875 8.76925 1.5C8.76925 1.9125 8.62233 2.26558 8.3285 2.55925C8.03483 2.85308 7.68175 3 7.26925 3ZM13.0385 3C12.626 3 12.2728 2.85308 11.979 2.55925C11.6853 2.26558 11.5385 1.9125 11.5385 1.5C11.5385 1.0875 11.6853 0.734417 11.979 0.44075C12.2728 0.146917 12.626 0 13.0385 0C13.451 0 13.8041 0.146917 14.0978 0.44075C14.3916 0.734417 14.5385 1.0875 14.5385 1.5C14.5385 1.9125 14.3916 2.26558 14.0978 2.55925C13.8041 2.85308 13.451 3 13.0385 3Z"
        fill={color}
        transform="translate(12.5 18.5)"
      />
    </Svg>
  );
};

const SettingsSvgContainer = styled(TouchableOpacity)``;

const Settings = ({onPress}: {onPress: () => void}) => {
  const theme = useTheme();
  const color = theme.dark ? Slate : SlateDark;
  const background = theme.dark ? LightBlack : NeutralSlate;

  return (
    <HeaderRightContainer>
      <SettingsSvgContainer activeOpacity={ActiveOpacity} onPress={onPress}>
        <SettingsSvg color={color} background={background} />
      </SettingsSvgContainer>
    </HeaderRightContainer>
  );
};

export default Settings;

import React from 'react';
import styled from 'styled-components/native';
import {LightBlack, White, Cloud} from '../../../styles/colors';
import {ActiveOpacity} from '../../../components/styled/Containers';
import {Theme} from '@react-navigation/native';
import Svg, {Path} from 'react-native-svg';
import {TouchableOpacity} from 'react-native-gesture-handler';

const SettingsSvgContainer = styled(TouchableOpacity)`
  margin: 0;
  padding: 8px;
  border-radius: 30px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Cloud)};
`;

const CogSvg = ({theme}: {theme: Theme}) => {
  const cogColor = theme.dark ? White : LightBlack;
  return (
    <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.5 10C17.4972 10.4058 17.4615 10.8108 17.3934 11.2108L19.1425 12.9C19.4175 13.1658 19.4763 13.5846 19.285 13.9158L18.035 16.0825C17.886 16.3406 17.6106 16.4995 17.3125 16.4992C17.2351 16.4988 17.158 16.4882 17.0834 16.4675L14.75 15.8008C14.1193 16.3151 13.4092 16.7235 12.6475 17.01L12.0584 19.3683C11.9658 19.7394 11.6325 19.9999 11.25 20H8.75005C8.36875 19.9988 8.03687 19.739 7.94421 19.3692L7.35505 17.0108C6.59219 16.7246 5.88096 16.3162 5.24921 15.8017L2.91588 16.4683C2.84123 16.489 2.76417 16.4997 2.68671 16.5C2.3887 16.5003 2.11322 16.3414 1.96421 16.0833L0.714212 13.9167C0.523432 13.5857 0.582164 13.1673 0.856712 12.9017L2.60671 11.2108C2.53857 10.8108 2.5029 10.4058 2.50005 10C2.50295 9.59445 2.53862 9.1898 2.60671 8.79L0.856712 7.09917C0.581746 6.83337 0.522992 6.41453 0.714212 6.08333L1.96421 3.91667C2.15773 3.58729 2.54882 3.42955 2.91671 3.5325L5.25005 4.19917C5.88078 3.68492 6.59086 3.27654 7.35255 2.99L7.94171 0.631667C8.03427 0.26056 8.36757 0.000105662 8.75005 0H11.25C11.6325 0.000105662 11.9658 0.26056 12.0584 0.631667L12.6442 2.99C13.4071 3.27622 14.1183 3.68461 14.75 4.19917L17.0834 3.5325C17.4513 3.42924 17.8426 3.58705 18.0359 3.91667L19.2859 6.08333C19.4767 6.41433 19.4179 6.83266 19.1434 7.09833L17.3934 8.78917C17.4615 9.18924 17.4972 9.59417 17.5 10ZM6.66671 10C6.66671 11.8409 8.1591 13.3333 10 13.3333C10.8841 13.3333 11.7319 12.9821 12.3571 12.357C12.9822 11.7319 13.3334 10.8841 13.3334 10C13.3334 8.15905 11.841 6.66667 10 6.66667C8.1591 6.66667 6.66671 8.15905 6.66671 10Z"
        fill={cogColor}
      />
    </Svg>
  );
};

const CoinbaseSettingsOption = ({
  onPress,
  theme,
}: {
  onPress: () => void;
  theme: Theme;
}) => {
  return (
    <SettingsSvgContainer activeOpacity={ActiveOpacity} onPress={onPress}>
      <CogSvg theme={theme} />
    </SettingsSvgContainer>
  );
};

export default CoinbaseSettingsOption;

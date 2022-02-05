import React from 'react';
import {useTheme} from '@react-navigation/native';
import {Svg, Path} from 'react-native-svg';
import {
  White,
  SlateDark,
  LightBlack,
  NeutralSlate,
} from '../../../styles/colors';
import styled from 'styled-components/native';

const ShareSvg: React.FC<{isDark: boolean}> = ({isDark}) => {
  return (
    <Svg width="14" height="16" viewBox="0 0 14 16" fill="none">
      <Path
        d="M11 6C12.654 6 14 4.654 14 3C14 1.346 12.654 0 11 0C9.346 0 8 1.346 8 3C8 3.223 8.029 3.439 8.075 3.649L4.855 5.661C4.343 5.254 3.704 5 3 5C1.346 5 0 6.346 0 8C0 9.654 1.346 11 3 11C3.704 11 4.343 10.746 4.855 10.339L8.075 12.351C8.029 12.561 8 12.777 8 13C8 14.654 9.346 16 11 16C12.654 16 14 14.654 14 13C14 11.346 12.654 10 11 10C10.296 10 9.657 10.254 9.145 10.661L5.925 8.649C5.971 8.439 6 8.223 6 8C6 7.777 5.971 7.561 5.925 7.351L9.145 5.339C9.657 5.746 10.296 6 11 6Z"
        fill={isDark ? White : SlateDark}
      />
    </Svg>
  );
};

const ShareContainer = styled.View`
  height: 40px;
  width: 40px;
  border-radius: 50px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  align-items: center;
  justify-content: center;
`;

const ShareIcon = () => {
  const theme = useTheme();

  return (
    <ShareContainer>
      <ShareSvg isDark={theme.dark} />
    </ShareContainer>
  );
};

export default ShareIcon;

import styled from 'styled-components/native';
import {BaseText, H3} from '../../../../components/styled/Text';
import FastImage from 'react-native-fast-image';

export const BackgroundImage = styled(FastImage)`
  width: 100%;
  height: 100%;
  margin-top: 10%;
  position: absolute;
`;

export const Overlay = styled.View`
  background: black;
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  z-index: 1;
  opacity: 0.8;
`;

export const Body = styled.View`
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  z-index: 2;
`;

export const IntroText = styled(BaseText)`
  font-size: 25px;
  font-style: normal;
  font-weight: 400;
  line-height: 34px;
  letter-spacing: 0;
  text-align: center;
  color: white;
`;

export const IntroTextBold = styled(H3)`
  color: white;
`;

export const ButtonContainer = styled.View`
  position: absolute;
  bottom: 15%;
  right: 5%;
`;

export const TopNavFill = styled.View`
  background: ${({theme}) => theme.colors.background};
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  z-index: 3;
`;

export const TopNavFillOverlay = styled(Overlay)`
  height: 70px;
  z-index: 3;
`;

export const BodyContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const IntroBackgroundImage = styled(BackgroundImage)`
  margin-top: 0;
  z-index: 2;
`;

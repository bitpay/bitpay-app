import styled, {css} from 'styled-components/native';
import {Dimensions} from 'react-native';
import {NeutralSlate, SlateDark} from '../../styles/colors';
import {BaseText} from './Text';

export const {height: HEIGHT, width: WIDTH} = Dimensions.get('window');

export const ScreenGutter = '15px';

// Nav
export const HeaderRightContainer = styled.View`
  height: 50px;
  margin-right: 10px;
`;

export const ImageContainer = styled.View`
  margin: 10px 0;
  height: 200px;
  display: flex;
  justify-content: center;
`;

export const HeaderTitleContainer = styled.View`
  margin-top: 10px;
  padding: 10px;
`;

export const TitleContainer = styled.View`
  width: ${WIDTH * 0.75}px;
`;

export const TextContainer = styled.View`
  margin-top: 10px;
  padding: 10px;
  width: ${WIDTH * 0.9}px;
`;

export const SubTextContainer = styled.View`
  width: ${WIDTH * 0.8}px;
  margin-top: 10px;
`;

export const CtaContainer = styled.View`
  padding: 10px;
  align-self: stretch;
  flex-direction: column;
  margin-top: 30px;
`;

export const CtaContainerAbsolute = styled.View<{background?: boolean}>`
  padding: 15px;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  ${({background}) =>
    background &&
    css`
      background: white;
    `};
`;

export const Hr = styled.View`
  border-bottom-color: ${({theme: {dark}}) => (dark ? SlateDark : '#ebecee')};
  border-bottom-width: 1px;
`;

export const Column = styled.View`
  flex: 1;
  flex-direction: column;
`;

// LIST
export const ListContainer = styled.View`
  flex: 1;
`;

export const RowContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  margin: 10px 0;
  padding: 0 10px 0 10px;
`;

export const AssetColumn = styled(Column)`
  margin-left: 10px;
`;

export const AssetImageContainer = styled.View`
  height: 50px;
  width: 50px;
  display: flex;
  justify-content: center;
  align-self: center;
  border-radius: 8px;
`;

// Card
export const CardGutter = '15px';

interface CardContainerProps {
  minHeight?: string;
  width?: string;
  backgroundColor?: string;
}
export const CardContainer = styled.View<CardContainerProps>`
  width: ${({width}: CardContainerProps) => width || '215px'};
  min-height: ${({minHeight}: CardContainerProps) => minHeight || '250px'};
  background: ${({backgroundColor}: CardContainerProps) =>
    backgroundColor || NeutralSlate};
  border-radius: 21px;
`;

// Bottom Modal
export const ModalContainer = styled.View`
  padding: 30px;
  min-height: 300px;
  background: white;
  justify-content: center;
  align-content: center;
  border-top-left-radius: 17px;
  border-top-right-radius: 17px;
`;

// Settings List
export const Setting = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 58px;
`;

export const SettingTitle = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
  text-align: left;
`;

export const SettingView = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 58px;
`;

// Info
export const Info = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? SlateDark : '#f8f9fe')};
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
`;

export const InfoTriangle = styled.View`
  width: 12px;
  height: 12px;
  position: absolute;
  top: -12px;
  left: 20px;
  border-left-width: 12px;
  border-left-color: transparent;
  border-right-width: 12px;
  border-right-color: transparent;
  border-bottom-width: 12px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? SlateDark : '#f8f9fe')};
`;

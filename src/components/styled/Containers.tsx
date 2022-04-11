import React from 'react';
import {Dimensions, Text} from 'react-native';
import styled, {css} from 'styled-components/native';
import {
  Feather,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
  Slate,
  NotificationPrimary,
} from '../../styles/colors';
import {BaseText} from './Text';

export const {height: HEIGHT, width: WIDTH} = Dimensions.get('window');

export const ScreenGutter = '15px';
export const ActiveOpacity = 0.75;
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
      background: ${({theme}) => theme.colors.background};
    `};
`;

export const Br: React.FC = () => <Text />;

export const Hr = styled.View`
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ebecee')};
  border-bottom-width: 1px;
`;

export const Column = styled.View`
  flex: 1;
  flex-direction: column;
`;

export const Row = styled.View`
  flex: 1;
  flex-direction: row;
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

export const CurrencyColumn = styled(Column)`
  margin-left: 10px;
`;

export const CurrencyImageContainer = styled.View`
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
  backgroundColor?: string;
}
export const CardContainer = styled.View<CardContainerProps>`
  width: 170px;
  height: 200px;
  background: ${({backgroundColor}: CardContainerProps) =>
    backgroundColor || NeutralSlate};
  border-radius: 21px;
`;

export interface SheetParams {
  placement?: 'top' | 'bottom';
}

export const SheetContainer = styled.View<SheetParams>`
  padding: 30px;
  background-color: ${({theme}) => (theme.dark ? LightBlack : White)};
  justify-content: center;
  align-content: center;
  border-${({placement}: SheetParams) =>
    placement === 'top' ? 'bottom' : 'top'}-left-radius: 17px;
  border-${({placement}: SheetParams) =>
    placement === 'top' ? 'bottom' : 'top'}-right-radius: 17px;
`;

// Settings List
export const Setting = styled.TouchableOpacity`
  align-items: center;
  flex-direction: row;
  flex-wrap: nowrap;
  height: 58px;
`;

export const SettingTitle = styled(BaseText)`
  color: ${({theme}) => theme.colors.text};
  flex-grow: 1;
  flex-shrink: 1;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
  text-align: left;
  margin-right: 5px;
`;

interface SettingIconProps {
  prefix?: boolean;
  suffix?: boolean;
}

export const SettingIcon = styled.View<SettingIconProps>`
  ${({prefix = false}) =>
    prefix &&
    css`
      margin-right: ${ScreenGutter};
    `}
  ${({suffix = false}) =>
    suffix &&
    css`
      margin-left: ${ScreenGutter};
    `}
`;

export const SettingView = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 58px;
`;

export const ActionContainer = styled.View`
  margin: 5px 0;
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

export const AdvancedOptionsContainer = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : Feather)};
  border-radius: 6px;
  margin-bottom: 20px;
`;

export const AdvancedOptionsButton = styled.TouchableOpacity`
  height: 60px;
  background-color: ${({theme}) => (theme.dark ? LightBlack : Feather)};
  padding: 18px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px;
`;

export const AdvancedOptionsButtonText = styled(BaseText)`
  font-size: 16px;
  line-height: 25px;
  color: ${({theme: {dark}}) => (dark ? White : NotificationPrimary)};
`;

export const AdvancedOptions = styled.View`
  border-style: solid;
  border-top-width: 1px;
  border-top-color: ${({theme}) => (theme.dark ? '#434D5A' : '#E1E4E7')};
`;

const Gutter = '10px';
export const ImportContainer = styled.View`
  padding: ${Gutter} 0;
`;

export const ImportTextInput = styled.TextInput`
  height: 100px;
  color: ${({theme}) => theme.colors.text};
  background: ${({theme}) => theme.colors.background};
  border: 0.75px solid ${Slate};
  border-top-right-radius: 4px;
  border-top-left-radius: 4px;
  text-align-vertical: top;
  padding: 5px;
`;

export const InfoImageContainer = styled.View<{infoMargin: string}>`
  margin: ${({infoMargin}) => infoMargin};
`;

export const ScanContainer = styled.TouchableOpacity`
  height: 25px;
  width: 25px;
  align-items: center;
  justify-content: center;
`;

export const HeaderContainer = styled.View`
  padding: 20px 0px 10px 0px;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
`;

// creation and add wallet
export const OptionContainer = styled.SafeAreaView`
  flex: 1;
`;

export const OptionListContainer = styled.View`
  flex: 1;
  padding: 0 ${ScreenGutter};
  margin-top: 30px;
`;

export const OptionList = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  height: 100px;
  border-radius: 12px;
  margin-bottom: ${ScreenGutter};
  flex-direction: row;
  overflow: hidden;
`;

export const OptionInfoContainer = styled.View`
  padding: 20px;
  justify-content: center;
  flex: 1;
`;

// Search

export const SearchInput = styled.TextInput`
  flex: 1;
  padding: 0 10px;
  border-right-width: 1px;
  border-right-color: ${({theme: {dark}}) => (dark ? '#45484E' : '#ECEFFD')};
  height: 32px;
  color: ${({theme}) => theme.colors.text};
  background-color: transparent;
`;

// Hidden label

export const HiddenContainer = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  padding: 5px 10px;
  border-radius: 40px;
`;

import React from 'react';
import {Dimensions, StatusBar, Text} from 'react-native';
import styled, {css} from 'styled-components/native';
import {
  NeutralSlate,
  SlateDark,
  White,
  LightBlack,
  LuckySevens,
  Black,
  Slate30,
} from '../../styles/colors';

export const fontFamily = 'Heebo';

export const BaseText = styled.Text`
  color: ${({theme}) => theme.colors.text};
  font-family: '${fontFamily}';
`;

interface HeadingProps {
  bold?: boolean;
  medium?: boolean;
}

export const H1 = styled(BaseText)<HeadingProps>`
  font-size: 50px;
  font-style: normal;
  font-weight: ${({medium = false}) => (medium ? 500 : 700)};
  letter-spacing: 0;
`;

export const H2 = styled(BaseText)<HeadingProps>`
  font-size: 38px;
  font-style: normal;
  font-weight: ${({medium = false}) => (medium ? 500 : 700)};
  letter-spacing: 0;
`;

export const H3 = styled(BaseText)<HeadingProps>`
  font-size: 25px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0;
`;

export const H4 = styled(BaseText)<HeadingProps>`
  font-size: 20px;
  font-style: normal;
  font-weight: 500;
  letter-spacing: 0;
`;

export const H5 = styled(BaseText)<HeadingProps>`
  font-size: 18px;
  font-style: normal;
  font-weight: ${({bold = false}) => (bold ? 700 : 500)};
  letter-spacing: 0;
`;

export const H6 = styled(BaseText)<HeadingProps>`
  font-size: 16px;
  font-style: normal;
  font-weight: ${({medium}) => (medium ? 400 : 500)};
`;

export const H7 = styled(BaseText)<HeadingProps>`
  font-size: 14px;
  font-style: normal;
  font-weight: ${({medium = false}) => (medium ? 500 : 400)};
  letter-spacing: 0;
`;

export const SubText = styled(H7)`
  color: ${({theme}) => theme.colors.description};
`;

export const ListItemSubText = styled(H7)<{
  textAlign?: 'right' | 'left' | 'center';
}>`
  margin-top: 2px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
  text-align: ${({textAlign}) => textAlign || 'left'};
`;

export const Small = styled(BaseText)`
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
`;

export const Smallest = styled(BaseText)`
  font-size: 12px;
  font-weight: 400;
  line-height: 15px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : Black)};
`;

export const Paragraph = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  line-height: 25px;
  letter-spacing: 0;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

export const Disclaimer = styled(BaseText)`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 19px;
  letter-spacing: 0;
`;

interface ExponentProps {
  i: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

const EXPONENT_UNICODE_MAP: {
  [k in 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9]: string;
} = {
  0: '\u2070',
  1: '\u00B9',
  2: '\u00B2',
  3: '\u00B3',
  4: '\u2074',
  5: '\u2075',
  6: '\u2076',
  7: '\u2077',
  8: '\u2078',
  9: '\u2079',
};

/**
 * Renders a number 0-9 as a unicode exponent in a Text element.
 * @param i The number 0-9 to use as the exponent.
 */
export const Exp = (props: ExponentProps) => {
  return <Text>{EXPONENT_UNICODE_MAP[props.i]}</Text>;
};

// Nav
/**
 * Intended to be used with translucent StatusBar (Android) when no header is desired but still want to clear the StatusBar height.
 */
export const ZeroHeightHeader = styled.View`
  background-color: ${({theme}) => theme.colors.background};
  height: ${StatusBar.currentHeight || 0}px;
`;

export const HeaderTitle = styled(H5).attrs(() => ({
  bold: true,
  numberOfLines: 1,
}))`
  max-width: ${Dimensions.get('window').width - 150}px;
`;

export const HeaderSubtitle = styled(BaseText)`
  font-size: 16px;
  line-height: 25px;
`;

interface TextAlignProps {
  align: 'center' | 'left' | 'right' | 'justify';
}

export const TextAlign = styled(BaseText)<TextAlignProps>`
  ${props =>
    css`
      text-align: ${props.align};
    `}
`;

export const Link = styled(BaseText)`
  color: ${({theme}) => theme.colors.link};
`;

export const UnderlineLink = styled(BaseText)`
  color: ${({theme}) => theme.colors.text};
  text-decoration: underline;
  text-decoration-color: ${({theme}) => theme.colors.text};
  font-weight: bold;
`;

// WALLET
export const Balance = styled(BaseText)<{scale: boolean}>`
  font-size: ${({scale}) => (scale ? 26 : 36)}px;
  font-style: normal;
  font-weight: 700;
  line-height: 53px;
  letter-spacing: 0;
`;

export const Badge = styled(BaseText)`
  font-size: 10px;
  font-style: normal;
  font-weight: 400;
  text-align: center;
  line-height: 12px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  padding-top: 1px;
`;

export const ProposalBadge = styled(BaseText)`
  color: white;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
`;

export const ImportTitle = styled(BaseText)`
  font-weight: 500;
  font-size: 13px;
  line-height: 18px;
  opacity: 0.75;
  text-transform: uppercase;
`;

export const InfoTitle = styled(BaseText)`
  font-size: 16px;
  color: ${({theme}) => theme.colors.text};
`;

export const InfoHeader = styled.View`
  flex-direction: row;
  margin-bottom: 10px;
`;

export const InfoDescription = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

// creation and add wallet
export const OptionTitle = styled(H6)`
  font-weight: 700;
  margin-bottom: 5px;
  color: ${({theme}) => theme.colors.text};
`;

export const OptionDescription = styled(BaseText)`
  font-size: 14px;
  line-height: 18px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

export const Type = styled(BaseText)<{noAutoMarginLeft?: boolean}>`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#E1E4E7')};
  padding: 2px 4px;
  border-radius: 3px;
  margin-left: ${({noAutoMarginLeft}) => (noAutoMarginLeft ? 0 : 'auto')};
`;

export const CopyToClipboardText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : '#6F7782')};
  padding: 0 20px 0 10px;
`;

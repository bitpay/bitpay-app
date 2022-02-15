import React from 'react';
import {Text} from 'react-native';
import styled, {css} from 'styled-components/native';
import {SlateDark, White} from '../../styles/colors';

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
  font-weight: 500;
`;

export const H7 = styled(BaseText)<HeadingProps>`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
`;

export const SubText = styled(H7)`
  color: ${({theme}) => theme.colors.description};
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
`;

export const Paragraph = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  line-height: 25px;
  letter-spacing: 0;
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
export const HeaderTitle = styled(BaseText)`
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 30px;
  letter-spacing: 0;
`;

export const HeaderSubtitle = styled(BaseText)`
  font-size: 16px;
  line-height: 25px;
`;

interface TextAlignProps {
  align: 'center' | 'left' | 'right';
}

export const TextAlign = styled(BaseText)<TextAlignProps>`
  ${props =>
    css`
      text-align: ${props.align};
    `}
`;

export const Link = styled(BaseText)`
  color: ${({theme}) => theme.colors.link};
  text-decoration: ${({theme}) => (theme.dark ? 'underline' : 'none')};
  text-decoration-color: ${({theme}) => theme.colors.link};
`;

// WALLET
export const Balance = styled(BaseText)`
  font-size: 36px;
  font-style: normal;
  font-weight: 700;
  line-height: 53px;
  letter-spacing: 0;
`;

export const Badge = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  text-align: center;
  line-height: 19px;
  padding: 2px 5px;
  border-radius: 3px;
  border: 1px solid #e1e4e7;
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

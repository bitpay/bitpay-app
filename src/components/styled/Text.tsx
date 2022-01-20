import styled, {css} from 'styled-components/native';
import {Action, SlateDark, White} from '../../styles/colors';

export const BaseText = styled.Text`
  font-family: 'Heebo';
`;

export const H2 = styled(BaseText)`
  font-size: 38px;
  font-style: normal;
  font-weight: 500;
  letter-spacing: 0;
  text-align: center;
  color: ${({theme}) => theme.colors.text};
`;

export const H3 = styled(BaseText)`
  font-size: 25px;
  font-style: normal;
  font-weight: 700;
  line-height: 34px;
  letter-spacing: 0;
  color: ${({theme}) => theme.colors.text};
`;

export const H4 = styled(BaseText)`
  font-size: 20px;
  font-style: normal;
  font-weight: 500;
  line-height: 30px;
  letter-spacing: 0;
  color: ${({theme}) => theme.colors.text};
`;

export const H5 = styled(BaseText)`
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 25px;
  letter-spacing: 0;
  color: ${({theme}) => theme.colors.text};
`;

export const H6 = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  color: ${({theme}) => theme.colors.text};
`;

export const H7 = styled(BaseText)`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 18px;
  letter-spacing: 0;
  color: ${props => props.theme.colors.text};
`;

export const SubText = styled(H7)`
  color: ${SlateDark};
`;

export const Paragraph = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 25px;
  letter-spacing: 0;
  color: ${props => props.theme.colors.text};
`;

export const Disclaimer = styled(BaseText)`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 19px;
  letter-spacing: 0;
`;

// Nav
export const HeaderTitle = styled(BaseText)`
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 30px;
  letter-spacing: 0;
  color: ${({theme}) => theme.colors.text};
`;

export const HeaderSubtitle = styled(BaseText)`
  font-size: 16px;
  line-height: 25px;
`;

interface TextAlignProps {
  align: 'center' | 'left' | 'right';
}

export const TextAlign = styled.Text<TextAlignProps>`
  ${props =>
    css`
      text-align: ${props.align};
    `}
`;

export const Link = styled(BaseText)`
  font-size: 16px;
  line-height: 25px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? White : Action)};
  text-decoration: ${({theme: {dark}}) => (dark ? 'underline' : 'none')};
  text-decoration-color: ${White};
`;

// WALLET
export const Balance = styled(BaseText)`
  font-size: 36px;
  font-style: normal;
  font-weight: 700;
  line-height: 53px;
  letter-spacing: 0;
`;

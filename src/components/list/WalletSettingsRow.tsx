import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';
import {useTheme} from '@react-navigation/native';
import {StyleProp, TextStyle} from 'react-native';

export interface WalletSettingsRowProps {
  id: string;
  img: () => ReactElement;
  currencyName: string;
}

const Row = styled.View`
  flex-direction: row;
  padding: 8px 0;
  align-items: center;
`;

const CurrencyName = styled(BaseText)`
  font-weight: 500;
  font-size: 18px;
  margin-left: 15px;
`;
const WalletSettingsRow = ({img, currencyName}: WalletSettingsRowProps) => {
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};

  return (
    <Row>
      {img()}
      <CurrencyName style={textStyle}>{currencyName}</CurrencyName>
    </Row>
  );
};

export default WalletSettingsRow;

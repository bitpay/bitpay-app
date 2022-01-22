import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';
import {useTheme} from '@react-navigation/native';
import {StyleProp, TextStyle} from 'react-native';
import NestedArrow from '../../../assets/img/nested-arrow.svg';

export interface WalletSettingsRowProps {
  id: string;
  img: () => ReactElement;
  currencyName: string;
  isToken?: boolean;
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

const NestedArrowContainer = styled.View`
  align-items: center;
  justify-content: center;
  margin-right: 15px;
`;

const WalletSettingsRow = ({
  img,
  currencyName,
  isToken,
}: WalletSettingsRowProps) => {
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  return (
    <Row>
      {isToken && (
        <NestedArrowContainer>
          <NestedArrow />
        </NestedArrowContainer>
      )}
      {img()}
      <CurrencyName style={textStyle}>
        {currencyName} {isToken}
      </CurrencyName>
    </Row>
  );
};

export default WalletSettingsRow;

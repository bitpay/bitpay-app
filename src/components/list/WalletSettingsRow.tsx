import React, {memo, ReactElement} from 'react';
import styled, {useTheme} from 'styled-components/native';
import {BaseText} from '../styled/Text';
import {StyleProp, TextStyle} from 'react-native';
import NestedArrow from '../../../assets/img/nested-arrow.svg';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {buildTestBadge} from './WalletRow';

export interface WalletSettingsRowProps {
  id: string;
  img: string | ((props: any) => ReactElement);
  currencyName: string;
  isToken?: boolean;
  network: string;
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
  network,
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
      <CurrencyImage img={img} size={45} />
      <CurrencyName style={textStyle}>
        {currencyName} {isToken}
      </CurrencyName>
      {buildTestBadge(network, currencyName, isToken)}
    </Row>
  );
};

export default memo(WalletSettingsRow);

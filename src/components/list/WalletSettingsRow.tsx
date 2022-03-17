import React, {memo, ReactElement} from 'react';
import styled, {useTheme} from 'styled-components/native';
import {BaseText, H7} from '../styled/Text';
import {StyleProp, TextStyle} from 'react-native';
import NestedArrow from '../../../assets/img/nested-arrow.svg';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {buildTestBadge} from './WalletRow';
import {Column} from '../styled/Containers';
import {LightBlack, NeutralSlate} from '../../styles/colors';

export interface WalletSettingsRowProps {
  id: string;
  img: string | ((props: any) => ReactElement);
  currencyName: string;
  isToken?: boolean;
  network: string;
  hideWallet?: boolean;
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

const HiddenColumn = styled(Column)`
  align-items: flex-end;
`;

const HiddenContainer = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  padding: 5px 10px;
  border-radius: 40px;
`;

const WalletSettingsRow = ({
  img,
  currencyName,
  isToken,
  network,
  hideWallet,
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

      {hideWallet ? (
        <HiddenColumn>
          <HiddenContainer>
            <H7>Hidden</H7>
          </HiddenContainer>
        </HiddenColumn>
      ) : null}
    </Row>
  );
};

export default memo(WalletSettingsRow);

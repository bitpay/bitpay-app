import React, {memo, ReactElement} from 'react';
import styled, {useTheme} from 'styled-components/native';
import {BaseText, H7} from '../styled/Text';
import {StyleProp, TextStyle} from 'react-native';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {buildTestBadge} from './WalletRow';
import {Column, HiddenContainer} from '../styled/Containers';
import NestedArrowIcon from '../nested-arrow/NestedArrow';
import {useTranslation} from 'react-i18next';

export interface WalletSettingsRowProps {
  id: string;
  img: string | ((props: any) => ReactElement);
  currencyName: string;
  isToken?: boolean;
  network: string;
  hideWallet?: boolean;
  walletName?: string;
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

const WalletSettingsRow = ({
  img,
  currencyName,
  isToken,
  network,
  hideWallet,
  walletName,
}: WalletSettingsRowProps) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  return (
    <Row>
      {isToken && (
        <NestedArrowContainer>
          <NestedArrowIcon />
        </NestedArrowContainer>
      )}
      <CurrencyImage img={img} size={40} />
      <CurrencyName style={textStyle}>
        {walletName || currencyName} {isToken}
      </CurrencyName>
      {buildTestBadge(network, currencyName, isToken)}

      {hideWallet ? (
        <HiddenColumn>
          <HiddenContainer>
            <H7>{t('Hidden')}</H7>
          </HiddenContainer>
        </HiddenColumn>
      ) : null}
    </Row>
  );
};

export default memo(WalletSettingsRow);

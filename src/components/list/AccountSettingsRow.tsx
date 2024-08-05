import React, {memo, ReactElement} from 'react';
import styled, {useTheme} from 'styled-components/native';
import {BaseText, H7} from '../styled/Text';
import {StyleProp, TextStyle} from 'react-native';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {buildTestBadge, buildUncompleteBadge} from './WalletRow';
import {Column, HiddenContainer} from '../styled/Containers';
import NestedArrowIcon from '../nested-arrow/NestedArrow';
import {useTranslation} from 'react-i18next';

export interface AccountSettingsRowProps {
  id: string;
  key: string;
  img: string | ((props: any) => ReactElement);
  badgeImg: string | ((props: any) => ReactElement) | undefined;
  currencyName: string;
  chain: string;
  isToken?: boolean;
  network: string;
  hideWallet?: boolean;
  walletName?: string;
  isComplete?: boolean;
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
  margin-left: 10px;
  margin-right: 15px;
`;

const HiddenColumn = styled(Column)`
  align-items: flex-end;
`;

const CurrencyContainer = styled.View`
  flex-direction: column;
  width: 55%;
`;

const BadgeContainer = styled.View`
  flex-direction: row;
  margin-left: 10px;
`;

const AccountSettingsRow = ({
  img,
  badgeImg,
  currencyName,
  chain,
  isToken,
  network,
  hideWallet,
  walletName,
  isComplete,
}: AccountSettingsRowProps) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  return (
    <Row>
      <CurrencyImage img={img} badgeUri={badgeImg} size={40} />
      <CurrencyContainer>
        <CurrencyName style={textStyle} numberOfLines={1} ellipsizeMode="tail">
          {walletName || currencyName} {isToken}
        </CurrencyName>
        <BadgeContainer>
          {buildTestBadge(network, chain, isToken)}
          {buildUncompleteBadge(isComplete)}
        </BadgeContainer>
      </CurrencyContainer>

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

export default memo(AccountSettingsRow);

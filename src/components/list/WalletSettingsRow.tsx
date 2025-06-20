import React, {memo, ReactElement} from 'react';
import styled from 'styled-components/native';
import {H5, H7} from '../styled/Text';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {
  ActiveOpacity,
  Column,
  CurrencyImageContainer,
  HiddenContainer,
} from '../styled/Containers';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from 'react-native-gesture-handler';

export interface WalletSettingsRowProps {
  img: string | ((props: any) => ReactElement);
  badgeImg: string | ((props: any) => ReactElement) | undefined;
  currencyName: string;
  isToken?: boolean;
  hideWallet?: boolean;
  hideWalletByAccount?: boolean;
  walletName?: string;
  onPress: () => void;
}

const HiddenColumn = styled(Column)`
  align-items: flex-end;
`;

const WalletSettingsContainer = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  display: flex;
  padding: 8px 0px;
  gap: 8px;
`;

const WalletSettingsRow = ({
  img,
  badgeImg,
  currencyName,
  isToken,
  hideWallet,
  hideWalletByAccount,
  walletName,
  onPress,
}: WalletSettingsRowProps) => {
  const {t} = useTranslation();
  return (
    <WalletSettingsContainer
      onPress={() => onPress()}
      activeOpacity={ActiveOpacity}>
      <CurrencyImageContainer style={{height: 40, width: 40}}>
        <CurrencyImage img={img} badgeUri={badgeImg} size={40} />
      </CurrencyImageContainer>
      <H5 ellipsizeMode="tail" numberOfLines={1}>
        {walletName || currencyName} {isToken}
      </H5>

      {hideWallet || hideWalletByAccount ? (
        <HiddenColumn>
          <HiddenContainer>
            <H7>{t('Hidden')}</H7>
          </HiddenContainer>
        </HiddenColumn>
      ) : null}
    </WalletSettingsContainer>
  );
};

export default memo(WalletSettingsRow);

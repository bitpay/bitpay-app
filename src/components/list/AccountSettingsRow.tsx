import React, {memo} from 'react';
import {
  CurrencyImageContainer,
  ActiveOpacity,
  Column,
  HiddenContainer,
} from '../styled/Containers';
import {H5, H7} from '../styled/Text';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import Blockie from '../blockie/Blockie';
import styled from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {AccountRowProps} from './AccountListRow';
import {IsVMChain} from '../../store/wallet/utils/currency';
import {TouchableOpacity} from 'react-native-gesture-handler';

interface Props {
  id: string;
  accountItem: AccountRowProps;
  onPress: () => void;
  accountInfo?: {[key: string]: {hideAccount: boolean; name: string}};
}

const HiddenColumn = styled(Column)`
  align-items: flex-end;
`;

const AccountSettingsContainer = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  display: flex;
  padding: 8px 0px;
  gap: 8px;
`;

const AccountSettingsRow = ({accountItem, accountInfo, onPress}: Props) => {
  const {accountName, receiveAddress, wallets, isMultiNetworkSupported} =
    accountItem;
  const {t} = useTranslation();

  const hideAccount = accountInfo?.[accountItem.receiveAddress]?.hideAccount;
  const isHidden = IsVMChain(wallets[0].chain)
    ? hideAccount
    : wallets[0].hideWallet;

  return (
    <AccountSettingsContainer
      activeOpacity={ActiveOpacity}
      onPress={() => onPress()}>
      <CurrencyImageContainer style={{height: 40, width: 40}}>
        {isMultiNetworkSupported ? (
          <Blockie size={40} seed={receiveAddress} />
        ) : (
          <CurrencyImage
            img={wallets[0].img}
            badgeUri={wallets[0].badgeImg}
            size={40}
          />
        )}
      </CurrencyImageContainer>
      <Column>
        <H5 ellipsizeMode="tail" numberOfLines={1}>
          {accountName}
        </H5>
      </Column>

      {isHidden ? (
        <HiddenColumn>
          <HiddenContainer>
            <H7>{t('Hidden')}</H7>
          </HiddenContainer>
        </HiddenColumn>
      ) : null}
    </AccountSettingsContainer>
  );
};

export default memo(AccountSettingsRow);

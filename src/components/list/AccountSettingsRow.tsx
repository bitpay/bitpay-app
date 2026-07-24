import React, {memo} from 'react';
import {StyleSheet} from 'react-native';
import {
  CurrencyImageContainer,
  ActiveOpacity,
  Column,
  HiddenContainer,
} from '../styled/Containers';
import {H5, H7} from '../styled/Text';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import Blockie from '../blockie/Blockie';
import {useTranslation} from 'react-i18next';
import {AccountRowProps} from './AccountListRow';
import {IsVMChain} from '../../store/wallet/utils/currency';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

interface Props {
  id: string;
  accountItem: AccountRowProps;
  onPress: () => void;
  accountInfo?: {[key: string]: {hideAccount: boolean; name: string}};
}

const styles = StyleSheet.create({
  hiddenColumn: {
    alignItems: 'flex-end',
  },
  accountSettingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    display: 'flex',
    paddingVertical: 8,
    paddingHorizontal: 0,
    gap: 8,
  },
});

const AccountSettingsRow = ({accountItem, accountInfo, onPress}: Props) => {
  const {accountName, receiveAddress, wallets, isMultiNetworkSupported} =
    accountItem;
  const {t} = useTranslation();

  const hideAccount = accountInfo?.[accountItem.receiveAddress]?.hideAccount;
  const isHidden = IsVMChain(wallets[0].chain)
    ? hideAccount
    : wallets[0].hideWallet;

  return (
    <TouchableOpacity
      style={styles.accountSettingsContainer}
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
          {accountName || t('[Account Name]')}
        </H5>
      </Column>

      {isHidden ? (
        <Column style={styles.hiddenColumn}>
          <HiddenContainer>
            <H7>{t('Hidden')}</H7>
          </HiddenContainer>
        </Column>
      ) : null}
    </TouchableOpacity>
  );
};

export default memo(AccountSettingsRow);

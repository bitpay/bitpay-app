import React, {memo, ReactElement} from 'react';
import {StyleSheet} from 'react-native';
import {H5, H7} from '../styled/Text';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {
  ActiveOpacity,
  Column,
  CurrencyImageContainer,
  HiddenContainer,
} from '../styled/Containers';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

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

const styles = StyleSheet.create({
  hiddenColumn: {
    alignItems: 'flex-end',
  },
  walletSettingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    display: 'flex',
    paddingVertical: 8,
    paddingHorizontal: 0,
    gap: 8,
  },
});

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
    <TouchableOpacity
      style={styles.walletSettingsContainer}
      onPress={() => onPress()}
      activeOpacity={ActiveOpacity}>
      <CurrencyImageContainer style={{height: 40, width: 40}}>
        <CurrencyImage img={img} badgeUri={badgeImg} size={40} />
      </CurrencyImageContainer>
      <H5 ellipsizeMode="tail" numberOfLines={1}>
        {walletName || currencyName} {isToken}
      </H5>

      {hideWallet || hideWalletByAccount ? (
        <Column style={styles.hiddenColumn}>
          <HiddenContainer>
            <H7>{t('Hidden')}</H7>
          </HiddenContainer>
        </Column>
      ) : null}
    </TouchableOpacity>
  );
};

export default memo(WalletSettingsRow);

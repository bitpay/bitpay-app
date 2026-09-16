import React from 'react';
import {H5, TextAlign} from '../../../components/styled/Text';
import {WalletSelectMenuHeaderContainer} from '../../wallet/screens/GlobalSelect';
import ZenLedgerKeyWalletsRow from './ZenLedgerKeyWalletsRow';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet} from 'react-native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {
  ZenLedgerKey,
  ZenLedgerWalletObj,
} from '../../../store/zenledger/zenledger.models';
import {useAppSelector} from '../../../utils/hooks';

const screenGutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  zenLedgerKeyRowContainer: {
    paddingHorizontal: screenGutter,
    paddingTop: 0,
    paddingBottom: 2,
  },
});

export const ZenLedgerKeyRowContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => <View style={styles.zenLedgerKeyRowContainer}>{children}</View>;

export default ({
  keys,
  onPress,
  onDropdownPress,
}: {
  keys: ZenLedgerKey[];
  onPress: (keyId: string, wallet?: ZenLedgerWalletObj) => void;
  onDropdownPress: (keyId: string) => void;
}) => {
  const {t} = useTranslation();
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  return (
    <View style={{marginTop: 12, marginBottom: 100}}>
      {keys && keys.length ? (
        <ZenLedgerKeyRowContainer>
          <ZenLedgerKeyWalletsRow
            keys={keys}
            onPress={onPress}
            onDropdownPress={onDropdownPress}
            hideBalance={hideAllBalances}
          />
        </ZenLedgerKeyRowContainer>
      ) : (
        <WalletSelectMenuHeaderContainer>
          <TextAlign align={'center'}>
            <H5>{t('No available wallets')}</H5>
          </TextAlign>
        </WalletSelectMenuHeaderContainer>
      )}
    </View>
  );
};

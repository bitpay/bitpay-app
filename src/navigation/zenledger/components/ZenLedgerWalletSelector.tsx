import React from 'react';
import {H5, TextAlign} from '../../../components/styled/Text';
import {WalletSelectMenuHeaderContainer} from '../../wallet/screens/GlobalSelect';
import ZenLedgerKeyWalletsRow from './ZenLedgerKeyWalletsRow';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {
  ZenLedgerKey,
  ZenLedgerWalletObj,
} from '../../../store/zenledger/zenledger.models';

export const ZenLedgerKeyRowContainer = styled.View`
  padding: 0 ${ScreenGutter} 2px;
`;

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
  return (
    <View style={{marginTop: 12, marginBottom: 100}}>
      {keys && keys.length ? (
        <ZenLedgerKeyRowContainer>
          <ZenLedgerKeyWalletsRow
            keys={keys}
            onPress={onPress}
            onDropdownPress={onDropdownPress}
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

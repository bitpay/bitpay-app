import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Check} from '../../../../components/icons/check/Check';
import {H3} from '../../../../components/styled/Text';
import {Success} from '../../../../styles/colors';
import {
  Header,
  Wrapper,
} from '../../import-ledger-wallet/import-ledger-wallet.styled';

const styles = StyleSheet.create({
  iconWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 4,
    paddingTop: 28,
  },
});

export const ConfirmLedgerComplete: React.FC = () => {
  return (
    <Wrapper
      style={{
        minHeight: 0,
      }}>
      <View style={styles.iconWrapper}>
        <Check size={40} color={Success} />
      </View>

      <Header
        style={{
          marginBottom: 24,
        }}>
        <H3>Approved!</H3>
      </Header>
    </Wrapper>
  );
};

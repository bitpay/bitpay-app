import React, {memo} from 'react';
import {
  CurrencyColumn,
  ActiveOpacity,
  RowContainer,
} from '../styled/Containers';
import {H5} from '../styled/Text';
import styled from 'styled-components/native';
import {formatCryptoAddress} from '../../utils/helper-methods';
import {SendToPillContainer} from '../../navigation/wallet/screens/send/confirm/Shared';
import {
  PillContainer,
  PillText,
} from '../../navigation/wallet/components/SendToPill';
import {useTheme} from 'styled-components/native';
import {View} from 'react-native';
import {SlateDark} from '../../styles/colors';

const AddressView = styled(View)`
  align-items: flex-end;
  margin: 10px;
`;
interface Props {
  account: {receiveAddress: string; accountNumber: number};
  onPress: () => void;
}

const AccountRow = ({account, onPress}: Props) => {
  const theme = useTheme();
  return (
    <RowContainer
      activeOpacity={ActiveOpacity}
      onPress={onPress}
      style={{
        borderBottomWidth: 1,
        borderBottomColor: theme.dark ? SlateDark : '#ECEFFD',
        justifyContent: 'space-around',
      }}>
      <CurrencyColumn>
        <H5 ellipsizeMode="tail" numberOfLines={1}>
          Account {account.accountNumber}
        </H5>
      </CurrencyColumn>
      <CurrencyColumn>
        <AddressView>
          <SendToPillContainer>
            <PillContainer>
              <PillText accent={'action'}>
                {formatCryptoAddress(account.receiveAddress)}
              </PillText>
            </PillContainer>
          </SendToPillContainer>
        </AddressView>
      </CurrencyColumn>
    </RowContainer>
  );
};

export default memo(AccountRow);

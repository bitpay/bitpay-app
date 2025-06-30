import React, {memo} from 'react';
import {CurrencyColumn, ActiveOpacity} from '../styled/Containers';
import {H5, Badge} from '../styled/Text';
import styled from 'styled-components/native';
import {formatCryptoAddress} from '../../utils/helper-methods';
import {SendToPillContainer} from '../../navigation/wallet/screens/send/confirm/Shared';
import {PillText} from '../../navigation/wallet/components/SendToPill';
import {View} from 'react-native';
import {Action} from '../../styles/colors';
import {css} from 'styled-components/native';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {CurrencyListIcons} from '../../constants/SupportedCurrencyOptions';
import {AddPillContainer} from '../../navigation/wallet/screens/AddCustomToken';
import {TouchableOpacity} from 'react-native-gesture-handler';

const AddressView = styled(View)`
  align-items: flex-end;
  margin: 10px;
`;

const RowContainer = styled(TouchableOpacity)<{selected: boolean}>`
  flex-direction: row;
  align-items: center;
  padding: 10px 4px;
  margin: 0 6px;
  justify-content: space-around;
  ${({selected}) =>
    selected &&
    css`
      background: ${({theme: {dark}}) => (dark ? '#2240C440' : '#ECEFFD')};
      border-color: ${({theme: {dark}}) => (dark ? Action : Action)};
      border-width: 1px;
      border-radius: 12px;
    `};
`;

const BadgeContainer = styled.View`
  align-items: flex-start;
`;

export interface AccountSelectorProps {
  id: string;
  network: string;
  receiveAddress: string;
  accountNumber: number;
}

interface Props {
  account: AccountSelectorProps;
  chain: string;
  selected: boolean;
  onPress: () => void;
}

const AccountRow = ({account, chain, selected, onPress}: Props) => {
  return (
    <RowContainer
      activeOpacity={ActiveOpacity}
      onPress={onPress}
      selected={selected}>
      <CurrencyColumn>
        <H5 ellipsizeMode="tail" numberOfLines={1}>
          Account {account.accountNumber}
        </H5>
        {account.network !== 'livenet' && (
          <BadgeContainer>
            <Badge>{account.network}</Badge>
          </BadgeContainer>
        )}
      </CurrencyColumn>
      <CurrencyColumn>
        <AddressView>
          <SendToPillContainer>
            <AddPillContainer>
              <CurrencyImage img={CurrencyListIcons[chain]} size={20} />
              <PillText accent={'action'}>
                {formatCryptoAddress(account.receiveAddress)}
              </PillText>
            </AddPillContainer>
          </SendToPillContainer>
        </AddressView>
      </CurrencyColumn>
    </RowContainer>
  );
};

export default memo(AccountRow);

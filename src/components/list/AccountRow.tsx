import React, {memo} from 'react';
import {CurrencyColumn, ActiveOpacity} from '../styled/Containers';
import {H5, Badge} from '../styled/Text';
import {useTheme} from '../../contexts';
import {formatCryptoAddress} from '../../utils/helper-methods';
import {SendToPillContainer} from '../../navigation/wallet/screens/send/confirm/Shared';
import {PillText} from '../../navigation/wallet/components/SendToPill';
import {StyleSheet, View} from 'react-native';
import {Action, LightBlue} from '../../styles/colors';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {CurrencyListIcons} from '../../constants/SupportedCurrencyOptions';
import {AddPillContainer} from '../../navigation/wallet/screens/AddCustomToken';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  addressView: {
    alignItems: 'flex-end',
    margin: 10,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginVertical: 0,
    marginHorizontal: 6,
    justifyContent: 'space-around',
  },
  rowContainerSelected: {
    borderColor: Action,
    borderWidth: 1,
    borderRadius: 12,
  },
  badgeContainer: {
    alignItems: 'flex-start',
  },
});

const RowContainer: React.FC<
  {selected: boolean} & React.ComponentProps<typeof TouchableOpacity>
> = ({selected, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.rowContainer,
        selected
          ? [
              {backgroundColor: theme.dark ? '#2240C440' : LightBlue},
              styles.rowContainerSelected,
            ]
          : null,
        style,
      ]}
      {...rest}
    />
  );
};

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
          <View style={styles.badgeContainer}>
            <Badge>{account.network}</Badge>
          </View>
        )}
      </CurrencyColumn>
      <CurrencyColumn>
        <View style={styles.addressView}>
          <SendToPillContainer>
            <AddPillContainer>
              <CurrencyImage img={CurrencyListIcons[chain]} size={20} />
              <PillText accent={'action'}>
                {formatCryptoAddress(account.receiveAddress)}
              </PillText>
            </AddPillContainer>
          </SendToPillContainer>
        </View>
      </CurrencyColumn>
    </RowContainer>
  );
};

export default memo(AccountRow);

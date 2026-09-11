import React, {memo} from 'react';
import {useTranslation} from 'react-i18next';
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
import {useIsLargeFont} from '../../utils/hooks/useFontScale';

const styles = StyleSheet.create({
  addressView: {
    alignItems: 'flex-end',
    margin: 10,
  },
  addressViewStacked: {
    alignItems: 'flex-start',
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
  rowContainerStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
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
  {selected: boolean; stacked?: boolean} & React.ComponentProps<
    typeof TouchableOpacity
  >
> = ({selected, stacked, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.rowContainer,
        stacked ? styles.rowContainerStacked : null,
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
  const {t} = useTranslation();
  const stacked = useIsLargeFont();
  return (
    <RowContainer
      activeOpacity={ActiveOpacity}
      onPress={onPress}
      stacked={stacked}
      selected={selected}>
      <CurrencyColumn>
        <H5 ellipsizeMode="tail" numberOfLines={stacked ? 2 : 1}>
          {t('Account {{number}}', {number: account.accountNumber})}
        </H5>
        {account.network !== 'livenet' && (
          <View style={styles.badgeContainer}>
            <Badge>{account.network}</Badge>
          </View>
        )}
      </CurrencyColumn>
      <CurrencyColumn>
        <View
          style={[styles.addressView, stacked && styles.addressViewStacked]}>
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

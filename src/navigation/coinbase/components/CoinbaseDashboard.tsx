import React, {useLayoutEffect} from 'react';
import {useAppDispatch} from '../../../utils/hooks';
import {FlatList} from 'react-native';
import styled from 'styled-components/native';
import WalletRow from '../../../components/list/WalletRow';
import {BaseText, H5} from '../../../components/styled/Text';
import {Hr} from '../../../components/styled/Containers';
import haptic from '../../../components/haptic-feedback/haptic';

import {CoinbaseEffects} from '../../../store/coinbase';
import {CoinbaseTokenProps} from '../../../api/coinbase/coinbase.types';
import {useNavigation} from '@react-navigation/native';
import CoinbaseSettingsOption from './CoinbaseSettingsOption';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {formatFiatAmount} from '../../../utils/helper-methods';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {getCoinbaseExchangeRate} from '../../../store/coinbase/coinbase.effects';

interface CoinbaseDashboardProps {
  token: CoinbaseTokenProps | null;
}

const OverviewContainer = styled.View`
  flex: 1;
`;

const BalanceContainer = styled.View`
  height: 15%;
  margin-top: 20px;
  padding: 10px 15px;
`;

const Balance = styled(BaseText)`
  font-size: 36px;
  font-style: normal;
  font-weight: 700;
  line-height: 53px;
  letter-spacing: 0;
`;

const WalletListHeader = styled.View`
  padding: 10px;
  margin-top: 10px;
`;

const CoinbaseDashboard: React.FC<CoinbaseDashboardProps> = props => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {token} = props || {};

  const exchangeRates = useSelector(
    ({COINBASE}: RootState) => COINBASE.exchangeRates,
  );
  const accounts = useSelector(({COINBASE}: RootState) => COINBASE.accounts);
  const balance =
    useSelector(({COINBASE}: RootState) => COINBASE.balance) || 0.0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Coinbase',
      headerRight: () => (
        <CoinbaseSettingsOption
          onPress={() => {
            navigation.navigate('Coinbase', {
              screen: 'CoinbaseSettings',
              params: {token},
            });
            dispatch(CoinbaseEffects.getUser());
          }}
        />
      ),
    });
  }, [navigation]);

  const renderItem = ({item}: any) => {
    const fiatAmount = getCoinbaseExchangeRate(
      item.balance.amount,
      item.balance.currency,
      exchangeRates,
    );
    const walletItem = {
      id: item.id,
      currencyName: item.currency.name,
      currencyAbbreviation: item.currency.code,
      walletName: item.currency.name,
      img: CurrencyListIcons[item.currency.code.toLowerCase()],
      cryptoBalance: item.balance.amount,
      fiatBalance: formatFiatAmount(fiatAmount, 'usd'),
      isToken: false,
      network: 'livenet',
    };
    return (
      <WalletRow
        id={walletItem.id}
        wallet={walletItem}
        onPress={() => {
          haptic('impactLight');
          // TODO redirect to new view
          navigation.navigate('Coinbase', {
            screen: 'CoinbaseAccount',
            params: {id: item.id},
          });
          dispatch(CoinbaseEffects.getTransactionsByAccount(item.id));
        }}
      />
    );
  };

  return (
    <OverviewContainer>
      <BalanceContainer>
        <Balance>{formatFiatAmount(balance, 'usd')} USD</Balance>
      </BalanceContainer>
      <Hr />
      <FlatList
        ListHeaderComponent={() => {
          return (
            <WalletListHeader>
              <H5>My Wallets</H5>
            </WalletListHeader>
          );
        }}
        data={accounts}
        renderItem={renderItem}
      />
    </OverviewContainer>
  );
};

export default CoinbaseDashboard;

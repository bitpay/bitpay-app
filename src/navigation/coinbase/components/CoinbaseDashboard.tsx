import React, {useLayoutEffect, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {FlatList, RefreshControl} from 'react-native';
import styled from 'styled-components/native';
import WalletRow from '../../../components/list/WalletRow';
import {BaseText, H5} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {Black, SlateDark, White} from '../../../styles/colors';

import {showBottomNotificationModal} from '../../../store/app/app.actions';

import {CoinbaseEffects} from '../../../store/coinbase';
import {CoinbaseErrorsProps} from '../../../api/coinbase/coinbase.types';
import {useNavigation, useTheme} from '@react-navigation/native';
import CoinbaseSettingsOption from './CoinbaseSettingsOption';
import {RootState} from '../../../store';
import {formatFiatAmount, sleep} from '../../../utils/helper-methods';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {getCoinbaseExchangeRate} from '../../../store/coinbase/coinbase.effects';
import {Network} from '../../../constants';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';

const OverviewContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) =>
    dark ? Black : 'rgb(245, 246, 248)'};
`;

const BalanceContainer = styled.View`
  height: 17%;
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

const SkeletonContainer = styled.View`
  margin-bottom: 20px;
`;

const CoinbaseDashboard = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();

  const [refreshing, setRefreshing] = useState(false);

  const isLoadingAccounts = useAppSelector(
    ({COINBASE}: RootState) => COINBASE.isApiLoading,
  );
  const exchangeRates = useAppSelector(
    ({COINBASE}: RootState) => COINBASE.exchangeRates,
  );
  const user = useAppSelector(
    ({COINBASE}: RootState) => COINBASE.user[COINBASE_ENV],
  );
  const accounts = useAppSelector(
    ({COINBASE}: RootState) => COINBASE.accounts[COINBASE_ENV],
  );
  const balance =
    useAppSelector(({COINBASE}: RootState) => COINBASE.balance[COINBASE_ENV]) ||
    0.0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <CoinbaseSettingsOption
          onPress={() => {
            navigation.navigate('Coinbase', {
              screen: 'CoinbaseSettings',
            });
          }}
          theme={theme}
        />
      ),
    });
  }, [navigation, theme]);

  const listFooterComponent = () => {
    return (
      <>
        {isLoadingAccounts && !accounts ? (
          <SkeletonContainer>
            <WalletTransactionSkeletonRow />
          </SkeletonContainer>
        ) : null}
      </>
    );
  };

  const renderItem = ({item}: any) => {
    const fiatAmount = getCoinbaseExchangeRate(
      item.balance.amount,
      item.balance.currency,
      exchangeRates,
    );
    const cryptoAmount = Number(item.balance.amount)
      ? item.balance.amount
      : '0';

    const walletItem = {
      id: item.id,
      currencyName: item.currency.name,
      currencyAbbreviation: item.currency.code,
      walletName: item.currency.name,
      img: CurrencyListIcons[item.currency.code.toLowerCase()],
      cryptoBalance: cryptoAmount,
      cryptoLockedBalance: '',
      fiatBalance: formatFiatAmount(fiatAmount, 'usd'),
      fiatLockedBalance: '',
      isToken: false,
      network: Network.mainnet,
    };
    return (
      <WalletRow
        id={walletItem.id}
        wallet={walletItem}
        onPress={() => {
          haptic('impactLight');
          navigation.navigate('Coinbase', {
            screen: 'CoinbaseAccount',
            params: {accountId: item.id},
          });
          dispatch(CoinbaseEffects.getTransactionsByAccount(item.id));
        }}
      />
    );
  };

  const showError = async (error: CoinbaseErrorsProps) => {
    const errMsg = CoinbaseEffects.parseErrorToString(error);
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: 'Coinbase Error',
        message: errMsg,
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'OK',
            action: () => {
              navigation.navigate('Tabs', {screen: 'Home'});
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000);

    try {
      await dispatch(CoinbaseEffects.getAccountsAndBalance());
    } catch (err: CoinbaseErrorsProps | any) {
      setRefreshing(false);
      showError(err);
    }
    setRefreshing(false);
  };

  return (
    <OverviewContainer>
      <BalanceContainer>
        <Balance>
          {formatFiatAmount(
            balance,
            user?.data.native_currency.toLowerCase() || 'usd',
          )}{' '}
          {user?.data.native_currency}
        </Balance>
      </BalanceContainer>
      <FlatList
        contentContainerStyle={{
          paddingBottom: 50,
          marginTop: 5,
          backgroundColor: theme.dark ? 'rgb(37, 37, 37)' : White,
        }}
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={() => {
          return (
            <WalletListHeader>
              <H5>My Wallets</H5>
            </WalletListHeader>
          );
        }}
        data={accounts}
        renderItem={renderItem}
        ListFooterComponent={listFooterComponent}
      />
    </OverviewContainer>
  );
};

export default CoinbaseDashboard;

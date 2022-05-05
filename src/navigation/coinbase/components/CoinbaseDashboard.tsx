import React, {useCallback, useLayoutEffect, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {FlatList, RefreshControl} from 'react-native';
import styled from 'styled-components/native';
import WalletRow from '../../../components/list/WalletRow';
import {BaseText, H5} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {SlateDark, White} from '../../../styles/colors';

import {showBottomNotificationModal} from '../../../store/app/app.actions';

import {
  coinbaseGetFiatAmount,
  coinbaseGetTransactionsByAccount,
  coinbaseParseErrorToString,
  coinbaseGetAccountsAndBalance,
} from '../../../store/coinbase';
import {CoinbaseErrorsProps} from '../../../api/coinbase/coinbase.types';
import {useNavigation, useTheme} from '@react-navigation/native';
import CoinbaseSettingsOption from './CoinbaseSettingsOption';
import {formatFiatAmount, sleep} from '../../../utils/helper-methods';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {Network} from '../../../constants';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {Hr} from '../../../components/styled/Containers';
import Animated, {FadeInLeft} from 'react-native-reanimated';

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

const SkeletonContainer = styled.View`
  margin-bottom: 20px;
`;

const CoinbaseDashboard = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();

  const [refreshing, setRefreshing] = useState(false);

  const isLoadingAccounts = useAppSelector(
    ({COINBASE}) => COINBASE.isApiLoading,
  );
  const exchangeRates = useAppSelector(({COINBASE}) => COINBASE.exchangeRates);
  const user = useAppSelector(({COINBASE}) => COINBASE.user[COINBASE_ENV]);
  const accounts = useAppSelector(
    ({COINBASE}) => COINBASE.accounts[COINBASE_ENV],
  );
  const balance =
    useAppSelector(({COINBASE}) => COINBASE.balance[COINBASE_ENV]) || 0.0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <CoinbaseSettingsOption
          onPress={() => {
            navigation.navigate('Coinbase', {
              screen: 'CoinbaseSettings',
              params: {fromScreen: 'CoinbaseDashboard'},
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

  const renderItem = useCallback(
    ({item}: any) => {
      const fiatAmount = coinbaseGetFiatAmount(
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
        pendingTxps: [],
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
            dispatch(coinbaseGetTransactionsByAccount(item.id));
          }}
        />
      );
    },
    [dispatch, navigation, exchangeRates],
  );

  const showError = async (error: CoinbaseErrorsProps) => {
    const errMsg = coinbaseParseErrorToString(error);
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: 'Coinbase error',
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
      await dispatch(coinbaseGetAccountsAndBalance());
    } catch (err: CoinbaseErrorsProps | any) {
      setRefreshing(false);
      showError(err);
    }
    setRefreshing(false);
  };

  return (
    <OverviewContainer>
      <BalanceContainer>
        {!isLoadingAccounts && (
          <Animated.View entering={FadeInLeft}>
            <Balance>
              {formatFiatAmount(
                balance,
                user?.data?.native_currency?.toLowerCase() || 'usd',
              )}{' '}
              {user?.data?.native_currency}
            </Balance>
          </Animated.View>
        )}
      </BalanceContainer>
      <Hr />
      <FlatList
        contentContainerStyle={{
          paddingBottom: 50,
          marginTop: 5,
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

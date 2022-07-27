import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {FlatList, RefreshControl, View} from 'react-native';
import styled from 'styled-components/native';
import WalletRow from '../../../components/list/WalletRow';
import {BaseText, H2, H5, HeaderTitle} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {SlateDark, White, LightBlack} from '../../../styles/colors';

import {showBottomNotificationModal} from '../../../store/app/app.actions';

import {
  coinbaseGetTransactionsByAccount,
  coinbaseParseErrorToString,
  coinbaseGetAccountsAndBalance,
  coinbaseDisconnectAccount,
  isInvalidTokenError,
} from '../../../store/coinbase';
import {CoinbaseErrorsProps} from '../../../api/coinbase/coinbase.types';
import {useNavigation, useTheme} from '@react-navigation/native';
import CoinbaseSettingsOption from './CoinbaseSettingsOption';
import {
  formatFiatAmount,
  shouldScale,
  sleep,
} from '../../../utils/helper-methods';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {Hr} from '../../../components/styled/Containers';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import CoinbaseSvg from '../../../../assets/img/logos/coinbase.svg';
import {coinbaseAccountToWalletRow} from '../../../store/wallet/utils/wallet';
import {useTranslation} from 'react-i18next';

const OverviewContainer = styled.View`
  flex: 1;
`;

const BalanceContainer = styled.View`
  height: 15%;
  margin-top: 20px;
  padding: 10px 15px;
`;

const Balance = styled(BaseText)<{scale: boolean}>`
  font-size: ${({scale}) => (scale ? 25 : 35)}px;
  font-style: normal;
  font-weight: 700;
  line-height: 53px;
  letter-spacing: 0;
  text-align: center;
`;

const WalletListHeader = styled.View`
  padding: 10px;
  margin-top: 10px;
`;

const SkeletonContainer = styled.View`
  margin-bottom: 20px;
`;

const HeaderTitleContainer = styled.View`
  flex: 1;
  flex-direction: row;
  justify-content: center;
  padding-top: 13px;
`;

const CoinbaseDashboard = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();

  const [refreshing, setRefreshing] = useState(false);

  const isLoadingAccounts = useAppSelector(
    ({COINBASE}) => COINBASE.isApiLoading,
  );
  const exchangeRates = useAppSelector(({COINBASE}) => COINBASE.exchangeRates);
  const accounts = useAppSelector(
    ({COINBASE}) => COINBASE.accounts[COINBASE_ENV],
  );
  const accountsError = useAppSelector(
    ({COINBASE}) => COINBASE.getAccountsError,
  );
  const balance =
    useAppSelector(({COINBASE}) => COINBASE.balance[COINBASE_ENV]) || 0.0;
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const hideTotalBalance = useAppSelector(
    ({COINBASE}) => COINBASE.hideTotalBalance,
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitleContainer>
          <CoinbaseSvg style={{marginRight: 8, marginTop: 2}} />
          <HeaderTitle style={{marginTop: 4}}>{'Coinbase'}</HeaderTitle>
        </HeaderTitleContainer>
      ),
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
      const walletItem = coinbaseAccountToWalletRow(
        item,
        exchangeRates,
        defaultAltCurrency.isoCode,
      );
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
    [dispatch, navigation, exchangeRates, defaultAltCurrency.isoCode],
  );

  const showError = useCallback(
    (error: CoinbaseErrorsProps) => {
      const errMsg = coinbaseParseErrorToString(error);
      if (errMsg === 'Network Error') {
        return;
      }
      const isInvalidToken = isInvalidTokenError(error);
      const textAction = isInvalidToken ? t('Re-Connect') : t('OK');
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Coinbase error'),
          message: errMsg,
          enableBackdropDismiss: false,
          actions: [
            {
              text: textAction,
              action: async () => {
                if (isInvalidToken) {
                  await dispatch(coinbaseDisconnectAccount());
                  navigation.goBack();
                } else {
                  navigation.navigate('Tabs', {screen: 'Home'});
                }
              },
              primary: true,
            },
            {
              text: t('Back'),
              action: () => {
                navigation.goBack();
              },
            },
          ],
        }),
      );
    },
    [dispatch, navigation, t],
  );

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

  useEffect(() => {
    if (accountsError) {
      showError(accountsError);
    }
  }, [accountsError, showError]);

  return (
    <OverviewContainer>
      <BalanceContainer>
        {balance !== null ? (
          <>
            {!hideTotalBalance ? (
              <Balance scale={shouldScale(balance)}>
                {formatFiatAmount(balance, defaultAltCurrency.isoCode)}
              </Balance>
            ) : (
              <H2 style={{textAlign: 'center'}}>****</H2>
            )}
          </>
        ) : (
          <SkeletonPlaceholder
            backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
            highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
            <View
              style={{
                flexDirection: 'column',
                alignItems: 'center',
              }}>
              <View style={{width: 220, height: 50, borderRadius: 4}} />
            </View>
          </SkeletonPlaceholder>
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
              <H5>{t('My Wallets')}</H5>
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

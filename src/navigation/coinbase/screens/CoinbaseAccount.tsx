import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import styled from 'styled-components/native';
import {FlatList} from 'react-native';
import {find} from 'lodash';
import moment from 'moment';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {formatFiatAmount, shouldScale} from '../../../utils/helper-methods';
import {Hr} from '../../../components/styled/Containers';
import {BaseText, Balance, H5} from '../../../components/styled/Text';
import {Air, LightBlack, SlateDark, White} from '../../../styles/colors';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';

import TransactionRow from '../../../components/list/TransactionRow';

import {getCoinbaseExchangeRate} from '../../../store/coinbase/coinbase.effects';
import {StackScreenProps} from '@react-navigation/stack';
import {CoinbaseStackParamList} from '../CoinbaseStack';
import {CoinbaseTransactionProps} from '../../../api/coinbase/coinbase.types';
import CoinbaseIcon from '../components/CoinbaseIcon';

const AccountContainer = styled.View`
  flex: 1;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
`;

const BalanceContainer = styled.View`
  margin: 20px 0;
  padding: 0 15px 10px;
  flex-direction: column;
`;

const Type = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#E1E4E7')};
  padding: 2px 4px;
  border-radius: 3px;
  margin-bottom: 7px;
`;

const TransactionListHeader = styled.View`
  padding: 10px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#F5F6F7')};
`;

const BorderBottom = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : Air)};
`;

const EmptyListContainer = styled.View`
  justify-content: space-between;
  align-items: center;
  margin-top: 50px;
`;

const SkeletonContainer = styled.View`
  margin-bottom: 20px;
`;

export type CoinbaseAccountScreenParamList = {
  id: string;
};

const CoinbaseAccount = ({
  route,
}: StackScreenProps<CoinbaseStackParamList, 'CoinbaseAccount'>) => {
  const navigation = useNavigation();
  const {id} = route.params;

  const [fiatAmount, setFiatAmount] = useState(0);
  const [txs, setTxs] = useState([] as CoinbaseTransactionProps[]);

  const exchangeRates = useSelector(
    ({COINBASE}: RootState) => COINBASE.exchangeRates,
  );
  const user = useSelector(({COINBASE}: RootState) => COINBASE.user);
  const transactions = useSelector(
    ({COINBASE}: RootState) => COINBASE.transactions,
  );
  const account = useSelector(({COINBASE}: RootState) => {
    return find(COINBASE.accounts, {id});
  });

  const txsStatus = useSelector<RootState, 'success' | 'failed' | null>(
    ({COINBASE}) => COINBASE.getTransactionsStatus,
  );

  const txsLoading = useSelector<RootState, boolean>(
    ({COINBASE}) => COINBASE.isApiLoading,
  );

  const [isLoading, setIsLoading] = useState<boolean>();
  const [errorLoadingTxs, setErrorLoadingTxs] = useState<boolean>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: account?.name,
    });
  }, [navigation]);

  const parseTime = (timestamp?: string) => {
    if (!timestamp) return '';
    return moment(timestamp).format('MMM D, YYYY');
  };

  const parseAmount = (amount?: string, coin?: string) => {
    if (!amount || !coin) return '';
    return amount + ' ' + coin;
  };

  const getIcon = (coinbaseTx: CoinbaseTransactionProps) => {
    return CoinbaseIcon(coinbaseTx);
  };

  const onPressTransaction = useMemo(
    () => (transaction: any) => {
      navigation.navigate('Coinbase', {
        screen: 'CoinbaseTransaction',
        params: {tx: transaction},
      });
    },
    [],
  );

  const renderItem = useCallback(
    ({item}) => (
      <TransactionRow
        icon={getIcon(item)}
        description={item.details.title}
        details={item.details.subtitle}
        time={parseTime(item.created_at)}
        value={parseAmount(item.amount.amount, item.amount.currency)}
        onPressTransaction={() => onPressTransaction(item)}
      />
    ),
    [],
  );

  const listFooterComponent = () => {
    return (
      <>
        {isLoading ? (
          <SkeletonContainer>
            <WalletTransactionSkeletonRow />
          </SkeletonContainer>
        ) : null}
      </>
    );
  };

  const listEmptyComponent = () => {
    return (
      <>
        {!isLoading && !errorLoadingTxs && (
          <EmptyListContainer>
            <H5>It's a ghost town in here</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}

        {!isLoading && errorLoadingTxs && (
          <EmptyListContainer>
            <H5>Could not update transaction history</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}
      </>
    );
  };

  useEffect(() => {
    if (account && account.balance) {
      const fa = getCoinbaseExchangeRate(
        account.balance.amount,
        account.balance.currency,
        exchangeRates,
      );
      setFiatAmount(fa);
    }

    if (transactions && transactions[id]) {
      const tx = transactions[id].data;
      setTxs(tx);
    }

    if (txsLoading) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }

    if (txsStatus && txsStatus === 'failed') {
      setErrorLoadingTxs(true);
    }
  }, [account, transactions, txsLoading]);

  return (
    <AccountContainer>
      <BalanceContainer>
        <Row>
          <Balance scale={shouldScale(account?.balance.amount)}>
            {account?.balance.amount} {account?.balance.currency}
          </Balance>
        </Row>
        <Row>
          <H5>
            {fiatAmount
              ? formatFiatAmount(
                  fiatAmount,
                  user?.data.native_currency.toLowerCase() || 'usd',
                )
              : '...'}{' '}
            {user?.data.native_currency}
          </H5>
          {account?.primary && <Type>Primary</Type>}
        </Row>
      </BalanceContainer>
      <Hr />
      <FlatList
        ListHeaderComponent={() => {
          return (
            <TransactionListHeader>
              <H5>Transactions</H5>
            </TransactionListHeader>
          );
        }}
        data={txs}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <BorderBottom />}
        ListFooterComponent={listFooterComponent}
        ListEmptyComponent={listEmptyComponent}
      />
    </AccountContainer>
  );
};

export default CoinbaseAccount;

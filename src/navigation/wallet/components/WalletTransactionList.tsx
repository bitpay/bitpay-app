import React, {useEffect, useState} from 'react';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {BaseText} from '../../../components/styled/Text';
import {
  GroupTransactionHistory,
  UpdateTransactionsHistory,
} from '../../../store/wallet/effects/transactions/transactions';
import {useDispatch} from 'react-redux';
import styled from 'styled-components/native';

const HISTORY_SHOW_LIMIT = 10;
const MIN_UPDATE_TIME = 2000;
const TIMEOUT_FOR_REFRESHER = 1000;

const TransactionsContainer = styled.View``;

const TxsSectionList = styled.SectionList``;
const WalletTransactionList = ({
  wallet,
  currentKey: key,
}: {
  wallet: Wallet;
  currentKey: Key;
}) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!wallet.transactionHistoryOnProgress) {
      dispatch(UpdateTransactionsHistory({wallet}));
    }
  }, [wallet]);

  const [history, setHistory] = useState<any[]>();
  const [currentPage, setCurrentPage] = useState(0);
  const [groupedHistory, setGroupedHistory] = useState<any[]>();

  const showHistory = (loading?: boolean) => {
    if (!wallet.transactionHistory) {
      return;
    }

    const _history = wallet.transactionHistory.slice(
      0,
      (currentPage + 1) * HISTORY_SHOW_LIMIT,
    );
    setHistory(_history);

    const grouped = GroupTransactionHistory(_history);

    setGroupedHistory(grouped);

    if (loading) {
      setCurrentPage(currentPage + 1);
    }
  };

  useEffect(() => {
    showHistory();
  }, [wallet?.transactionHistory]);
  return (
    <TransactionsContainer>
      {groupedHistory?.length ? (
        <TxsSectionList
          sections={groupedHistory}
          keyExtractor={(item, index) => item + index}
          renderItem={({item}) => (
            <BaseText numberOfLines={1}>{item.txid}</BaseText>
          )}
          renderSectionHeader={({section: {title}}) => (
            <BaseText>{title}</BaseText>
          )}
        />
      ) : null}
    </TransactionsContainer>
  );
};

export default WalletTransactionList;

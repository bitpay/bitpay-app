import React from 'react';
import {View} from 'react-native';
import styled from 'styled-components/native';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import {ScreenGutter} from '../../../components/styled/Containers';
import {H5} from '../../../components/styled/Text';
import {Transaction, Currency} from '../../../store/card/card.models';
import {Air, NeutralSlate} from '../../../styles/colors';
import TransactionRow from './CardTransactionRow';

interface TransactionsListProps {
  settledTxList: Transaction[];
  pendingTxList: Transaction[];
  currency: Currency;
}

const TransactionsHeader = styled.View`
  background-color: ${NeutralSlate};
  flex-direction: row;
  min-height: 50px;
  align-items: center;
  padding: ${ScreenGutter}
  border-bottom-width: 1px;
  border-color: ${Air};
`;

const TransactionsHeading = styled(H5)`
  flex: 1;
`;

const TransactionsHeaderIcon = styled.TouchableOpacity`
  flex-grow: 0;
  margin-left: ${ScreenGutter};
`;

const TransactionsList: React.FC<TransactionsListProps> = props => {
  const {currency, pendingTxList, settledTxList} = props;

  const onRefresh = () => {
    // TODO
  };

  return (
    <View>
      <TransactionsHeader>
        <TransactionsHeading>Recent Activity</TransactionsHeading>

        <TransactionsHeaderIcon onPress={() => onRefresh()}>
          <RefreshIcon />
        </TransactionsHeaderIcon>
      </TransactionsHeader>

      {pendingTxList.map(tx => (
        <TransactionRow
          key={tx.id}
          tx={tx}
          currency={currency}
          settled={false}
        />
      ))}

      {settledTxList.map(tx => (
        <TransactionRow
          key={tx.id}
          tx={tx}
          currency={currency}
          settled={true}
        />
      ))}
    </View>
  );
};

export default TransactionsList;

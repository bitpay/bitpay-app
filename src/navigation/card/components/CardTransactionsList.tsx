import React from 'react';
import {useDispatch} from 'react-redux';
import styled from 'styled-components/native';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import {ScreenGutter} from '../../../components/styled/Containers';
import {H5} from '../../../components/styled/Text';
import {CardEffects} from '../../../store/card';
import {Card, Transaction} from '../../../store/card/card.models';
import {Air, LightBlack, NeutralSlate} from '../../../styles/colors';
import TransactionRow from './CardTransactionRow';

interface TransactionsListProps {
  settledTxList: Transaction[];
  pendingTxList: Transaction[];
  card: Card;
}

const TransactionstContainer = styled.View`
  background-color: ${({theme}) => theme.colors.background};
`;

const TransactionsHeader = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  flex-direction: row;
  min-height: 50px;
  align-items: center;
  padding: ${ScreenGutter}
  border-bottom-width: 1px;
  border-color: ${({theme}) => (theme.dark ? LightBlack : Air)};
`;

const TransactionsHeading = styled(H5)`
  flex: 1;
`;

const TransactionsHeaderIcon = styled.TouchableOpacity`
  flex-grow: 0;
  margin-left: ${ScreenGutter};
`;

const TransactionsList: React.FC<TransactionsListProps> = props => {
  const {card, pendingTxList, settledTxList} = props;
  const dispatch = useDispatch();

  const onRefresh = () => {
    dispatch(CardEffects.startFetchOverview(card.id));
  };

  return (
    <TransactionstContainer>
      <TransactionsHeader>
        <TransactionsHeading>Recent Activity</TransactionsHeading>

        <TransactionsHeaderIcon onPress={() => onRefresh()}>
          <RefreshIcon />
        </TransactionsHeaderIcon>
      </TransactionsHeader>

      {pendingTxList.map(tx => (
        <TransactionRow key={tx.id} tx={tx} card={card} settled={false} />
      ))}

      {settledTxList.map(tx => (
        <TransactionRow key={tx.id} tx={tx} card={card} settled={true} />
      ))}
    </TransactionstContainer>
  );
};

export default TransactionsList;

import React from 'react';
import {useDispatch} from 'react-redux';
import styled from 'styled-components/native';
import GhostImg from '../../../../assets/img/ghost-cheeky.svg';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import {ScreenGutter} from '../../../components/styled/Containers';
import {H5, H7} from '../../../components/styled/Text';
import {CardEffects} from '../../../store/card';
import {Card, Transaction} from '../../../store/card/card.models';
import {
  Air,
  LightBlack,
  NeutralSlate,
  Slate,
  SlateDark,
} from '../../../styles/colors';
import TransactionRow from './CardTransactionRow';

interface TransactionsListProps {
  settledTxList: Transaction[];
  pendingTxList: Transaction[];
  card: Card;
}

const TransactionsContainer = styled.View`
  background-color: ${({theme}) => theme.colors.background};
`;

const EmptyListContainer = styled.View`
  align-items: center;
  padding: ${ScreenGutter};
  margin: ${ScreenGutter};
`;

const EmptyGhostContainer = styled.View`
  margin-bottom: 28px;
`;

const EmptyListTitle = styled(H5)`
  margin-bottom: 16px;
`;

const EmptyListDescription = styled(H7)`
  color: ${({theme}) => (theme.dark ? Slate : SlateDark)};
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
  const isEmpty = pendingTxList.length + settledTxList.length === 0;

  const onRefresh = () => {
    dispatch(CardEffects.startFetchOverview(card.id));
  };

  return (
    <TransactionsContainer>
      <TransactionsHeader>
        <TransactionsHeading>
          {isEmpty ? null : 'Recent Activity'}
        </TransactionsHeading>

        <TransactionsHeaderIcon onPress={() => onRefresh()}>
          <RefreshIcon />
        </TransactionsHeaderIcon>
      </TransactionsHeader>

      {isEmpty ? (
        <EmptyListContainer>
          <EmptyGhostContainer>
            <GhostImg />
          </EmptyGhostContainer>
          <EmptyListTitle>Uh oh, it's a ghost town in here!</EmptyListTitle>
          <EmptyListDescription>
            Looks like you don't have any transactions. Check back here when you
            make a transaction to see your history.
          </EmptyListDescription>
        </EmptyListContainer>
      ) : null}

      {pendingTxList.map(tx => (
        <TransactionRow key={tx.id} tx={tx} card={card} settled={false} />
      ))}

      {settledTxList.map(tx => (
        <TransactionRow key={tx.id} tx={tx} card={card} settled={true} />
      ))}
    </TransactionsContainer>
  );
};

export default TransactionsList;

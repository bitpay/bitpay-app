import React from 'react';
import {useDispatch} from 'react-redux';
import styled from 'styled-components/native';
import GhostImg from '../../../../assets/img/ghost-cheeky.svg';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, H5} from '../../../components/styled/Text';
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
  margin: 40px ${ScreenGutter} 108px;
`;

const EmptyGhostContainer = styled.View`
  margin-bottom: 32px;
`;

const EmptyListDescription = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? Slate : SlateDark)};
  font-size: 16px;
  line-height: 25px;
  text-align: center;
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
          <EmptyListDescription>
            Load your cash account and get instant access to spending at
            thousands of merchants.
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

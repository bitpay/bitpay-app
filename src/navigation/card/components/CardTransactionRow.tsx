import React from 'react';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, H7} from '../../../components/styled/Text';
import {Currency, Transaction} from '../../../store/card/card.models';
import {Air, SlateDark} from '../../../styles/colors';

interface TransactionRowProps {
  tx: Transaction;
  settled: boolean;
  topUp?: boolean;
  currency: Currency;
}

const TxRowContainer = styled.View`
  border-color: ${Air};
  border-bottom-width: 1px;
  flex-direction: row;
  min-height: 72px;
`;

const TxIconContainer = styled.View`
  flex-grow: 0;
  justify-content: center;
  padding: ${ScreenGutter};
`;

const TxContentContainer = styled.View`
  flex-grow: 1;
  padding: ${ScreenGutter};
`;

const TxContentRow = styled.View`
  flex-direction: row;
`;

const TxTitle = styled(H7)`
  flex-grow: 1;
  font-weight: bold;
`;

const TxPrice = styled(BaseText)`
  flex-grow: 0;
  font-weight: bold;
`;

const TxSubtitle = styled(BaseText)`
  color: ${SlateDark};
  flex-grow: 1;
`;

const TxTimestamp = styled(BaseText)`
  color: ${SlateDark};
`;

// TODO: update when moment.js gets merged
const getTxTimestamp = (tx: Transaction, settled: boolean) => {
  const datestring = settled ? tx.dates.post : tx.dates.auth;

  return new Date(+datestring).toLocaleDateString();
};

const getTxTitle = (tx: Transaction) => {
  return tx.displayMerchant || tx.description || '--';
};

const getTxSubtitle = (tx: Transaction, settled: boolean, topUp?: boolean) => {
  if (!settled && topUp) {
    return 'Waiting for confirmation';
  }

  const {merchantCity, merchantState} = tx.merchant || {};
  const zwsp = '\u200b'; // using a zero-width space as a default to avoid weird spacing if location is empty
  let location;

  if (merchantCity && merchantState) {
    location = `${merchantCity}, ${merchantState}`;
  } else {
    location = merchantCity || merchantState || zwsp;
  }

  // Provided casing is inconsistent, just normalize it
  return location.toUpperCase();
};

const getTxAmount = (tx: Transaction, currency: Currency) => {
  const sign = tx.displayPrice < 0 ? '-' : '';
  const symbol = currency ? currency.symbol : '';
  const amount = Math.abs(tx.displayPrice).toFixed(2); // TODO: use currency formatter

  return `${sign}${symbol}${amount}`;
};

const TransactionRow: React.FC<TransactionRowProps> = props => {
  const {tx, settled, topUp, currency} = props;

  const formattedTimestamp = getTxTimestamp(tx, settled);
  const formattedTitle = getTxTitle(tx);
  const formattedSubtitle = getTxSubtitle(tx, settled, topUp);
  const formattedAmount = getTxAmount(tx, currency);

  return (
    <TxRowContainer>
      <TxIconContainer />

      <TxContentContainer>
        <TxContentRow>
          <TxTitle>{formattedTitle}</TxTitle>
          <TxPrice>{formattedAmount}</TxPrice>
        </TxContentRow>

        <TxContentRow>
          <TxSubtitle>{formattedSubtitle}</TxSubtitle>
          <TxTimestamp>{formattedTimestamp}</TxTimestamp>
        </TxContentRow>
      </TxContentContainer>
    </TxRowContainer>
  );
};

export default TransactionRow;

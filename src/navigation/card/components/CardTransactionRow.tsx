import React from 'react';
import styled from 'styled-components/native';
import ArrowDownIcon from '../../../../assets/img/card/icons/arrow-down.svg';
import ArrowUpIcon from '../../../../assets/img/card/icons/arrow-up.svg';
import FeeIcon from '../../../../assets/img/card/icons/fee.svg';
import PendingIcon from '../../../../assets/img/card/icons/pending.svg';
import RewardIcon from '../../../../assets/img/card/icons/reward.svg';
import TopUpIcon from '../../../../assets/img/card/icons/topup.svg';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, H7} from '../../../components/styled/Text';
import {Card, Transaction} from '../../../store/card/card.models';
import {Air, SlateDark} from '../../../styles/colors';
import {format} from '../../../utils/currency';

interface TransactionRowProps {
  tx: Transaction;
  settled: boolean;
  card: Card;
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

const isTopUp = (tx: Transaction) => tx.displayMerchant === 'BitPay Load';

const isBitPayReward = (tx: Transaction) =>
  tx.displayMerchant === 'Referral Reward';

const isFee = (tx: Transaction, provider: string) => {
  switch (provider) {
    case 'firstView':
      return ['10036 = INACTIVITY'].includes(tx.type);

    case 'galileo':
      return ['FE'].includes(tx.type);

    default:
      return false;
  }
};

const getTxIcon = (tx: Transaction, settled: boolean, provider: string) => {
  if (isFee(tx, provider)) {
    return FeeIcon;
  }

  if (!settled) {
    return PendingIcon;
  }

  if (isTopUp(tx)) {
    return TopUpIcon;
  }

  if (tx.displayPrice < 0) {
    return ArrowUpIcon;
  }

  if (isBitPayReward(tx)) {
    return RewardIcon;
  }

  return ArrowDownIcon;
};

// TODO: update when moment.js gets merged
const getTxTimestamp = (tx: Transaction, settled: boolean) => {
  const datestring = settled ? tx.dates.post : tx.dates.auth;

  return new Date(+datestring).toLocaleDateString();
};

const getTxTitle = (tx: Transaction) => {
  return tx.displayMerchant || tx.description || '--';
};

const getTxSubtitle = (tx: Transaction, settled: boolean) => {
  if (!settled && isTopUp(tx)) {
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

const TransactionRow: React.FC<TransactionRowProps> = props => {
  const {tx, settled, card} = props;

  const Icon = getTxIcon(tx, settled, card.provider);
  const formattedTimestamp = getTxTimestamp(tx, settled);
  const formattedTitle = getTxTitle(tx);
  const formattedSubtitle = getTxSubtitle(tx, settled);
  const formattedAmount = format(+tx.displayPrice, card.currency.code);

  return (
    <TxRowContainer>
      <TxIconContainer>
        <Icon />
      </TxIconContainer>

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

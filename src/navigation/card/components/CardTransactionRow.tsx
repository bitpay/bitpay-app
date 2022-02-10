import moment from 'moment';
import React from 'react';
import styled, {css} from 'styled-components/native';
import ArrowDownIcon from '../../../../assets/img/card/icons/arrow-down.svg';
import ArrowUpIcon from '../../../../assets/img/card/icons/arrow-up.svg';
import FeeIcon from '../../../../assets/img/card/icons/fee.svg';
import PendingIcon from '../../../../assets/img/card/icons/pending.svg';
import RewardIcon from '../../../../assets/img/card/icons/reward.svg';
import TopUpIcon from '../../../../assets/img/card/icons/topup.svg';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, H7} from '../../../components/styled/Text';
import {Card, Transaction} from '../../../store/card/card.models';
import {Air, LightBlack, SlateDark, White} from '../../../styles/colors';
import {format} from '../../../utils/currency';

interface TransactionRowProps {
  tx: Transaction;
  settled: boolean;
  card: Card;
}

const TxRowContainer = styled.View`
  border-color: ${({theme}) => (theme.dark ? LightBlack : Air)};
  border-bottom-width: 1px;
  flex-direction: row;
  min-height: 72px;
`;

const TxColumn = styled.View<{stretch?: boolean}>`
  flex-grow: ${({stretch}) => (stretch ? 1 : 0)};
  padding: ${ScreenGutter};
  justify-content: center;
`;

const FlexRow = styled.View`
  flex-direction: row;
`;

const TxTitle = styled(H7)`
  flex-grow: 1;
`;

const TxText = styled(BaseText)<{
  bold?: boolean;
  stretch?: boolean;
  light?: boolean;
}>`
  ${({bold}) =>
    bold &&
    css`
      font-weight: 700;
    `}
  ${({light}) =>
    light &&
    css`
      color: ${({theme}) => (theme.dark ? White : SlateDark)};
    `}
  flex-grow: ${({stretch}) => (stretch ? 1 : 0)};
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

const withinPastDay = (timeMs: number) => {
  const date = new Date(timeMs);

  return Date.now() - date.getTime() < 1000 * 60 * 60 * 24;
};

const getTxTimestamp = (tx: Transaction, settled: boolean) => {
  const {dates, status} = tx;
  const timestamp = Number(settled ? dates.post : dates.auth);

  if (status === 'paid') {
    return 'Pending...';
  } else if (status === 'invalid') {
    return 'Invalid';
  }

  if (withinPastDay(timestamp)) {
    return moment(timestamp).fromNow();
  }

  return moment(timestamp).format('MMM D, YYYY');
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
  const amount = format(+tx.displayPrice, card.currency.code);
  const title = getTxTitle(tx);
  const subtitle = getTxSubtitle(tx, settled);
  const timestamp = getTxTimestamp(tx, settled);

  return (
    <TxRowContainer>
      <TxColumn>
        <Icon />
      </TxColumn>

      <TxColumn stretch>
        <FlexRow>
          <TxTitle>{title}</TxTitle>
          <TxText bold>{amount}</TxText>
        </FlexRow>

        <FlexRow>
          <TxText light stretch>
            {subtitle}
          </TxText>
          <TxText light>{timestamp}</TxText>
        </FlexRow>
      </TxColumn>
    </TxRowContainer>
  );
};

export default TransactionRow;

import moment from 'moment';
import React, {memo} from 'react';
import styled, {css} from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, H7} from '../../../components/styled/Text';
import {CardProvider} from '../../../constants/card';
import {Card, UiTransaction} from '../../../store/card/card.models';
import {Air, LightBlack, LuckySevens, SlateDark} from '../../../styles/colors';
import {format} from '../../../utils/currency';
import {
  TxCardLoadIcon,
  TxConfirmingIcon,
  TxFeeIcon,
  TxReceivedIcon,
  TxReferralRewardsIcon,
  TxSentIcon,
} from '../../../constants/TransactionIcons';

interface TransactionRowProps {
  tx: UiTransaction;
  card: Card;
}

const TxRowContainer = styled.View`
  border-color: ${({theme}) => (theme.dark ? LightBlack : Air)};
  border-bottom-width: 1px;
  flex-direction: row;
  min-height: 72px;
`;

const TxColumn = styled.View`
  padding: ${ScreenGutter} 8px ${ScreenGutter} ${ScreenGutter};
  justify-content: center;
`;

const DescriptionColumn = styled.View`
  justify-content: center;
  padding: ${ScreenGutter} 0;
  flex: 1;
`;

const PriceColumn = styled.View`
  padding: ${ScreenGutter};
  align-items: flex-end;
  justify-content: center;
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
      color: ${({theme}) => (theme.dark ? LuckySevens : SlateDark)};
      font-size: 12px;
    `}
`;

const isTopUp = (tx: UiTransaction) => tx.displayMerchant === 'BitPay Load';

const isBitPayReward = (tx: UiTransaction) =>
  tx.displayMerchant === 'Referral Reward';

const isFee = (tx: UiTransaction, provider: CardProvider) => {
  switch (provider) {
    case CardProvider.firstView:
      return ['10036 = INACTIVITY'].includes(tx.type);

    case CardProvider.galileo:
      return ['FE'].includes(tx.type);

    default:
      return false;
  }
};

const getTxIcon = (tx: UiTransaction, provider: CardProvider) => {
  if (isFee(tx, provider)) {
    return TxFeeIcon;
  }

  if (!tx.settled) {
    return TxConfirmingIcon;
  }

  if (isTopUp(tx)) {
    return TxCardLoadIcon;
  }

  if (tx.displayPrice < 0) {
    return TxSentIcon;
  }

  if (isBitPayReward(tx)) {
    return TxReferralRewardsIcon;
  }

  return TxReceivedIcon;
};

const withinPastDay = (timeMs: number) => {
  const date = new Date(timeMs);

  return Date.now() - date.getTime() < 1000 * 60 * 60 * 24;
};

const getTxTimestamp = (tx: UiTransaction) => {
  const {dates, status} = tx;
  const timestamp = Number(tx.settled ? dates.post : dates.auth);

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

const getTxTitle = (tx: UiTransaction) => {
  return tx.displayMerchant || tx.description || '--';
};

const getTxSubtitle = (tx: UiTransaction) => {
  if (!tx.settled && isTopUp(tx)) {
    return 'Waiting for confirmation';
  }

  const {merchantCity, merchantState} = tx.merchant || {};
  let location;

  if (merchantCity && merchantState) {
    location = `${merchantCity}, ${merchantState}`;
  } else {
    location = merchantCity || merchantState || '';
  }

  // Provided casing is inconsistent, just normalize it
  return location.toUpperCase();
};

const TransactionRow: React.FC<TransactionRowProps> = props => {
  const {tx, card} = props;

  const Icon = getTxIcon(tx, card.provider);
  const amount = format(+tx.displayPrice, card.currency.code);
  const title = getTxTitle(tx);
  const subtitle = getTxSubtitle(tx);
  const timestamp = getTxTimestamp(tx);

  return (
    <TxRowContainer>
      <TxColumn>
        <Icon size={40} />
      </TxColumn>

      <DescriptionColumn>
        <H7>{title}</H7>

        {subtitle ? (
          <TxText light stretch>
            {subtitle}
          </TxText>
        ) : null}
      </DescriptionColumn>

      <PriceColumn>
        <TxText bold>{amount}</TxText>
        <TxText light>{timestamp}</TxText>
      </PriceColumn>
    </TxRowContainer>
  );
};

export default memo(TransactionRow, (prevProps, nextProps) => {
  const differentCard = prevProps.card.id !== nextProps.card.id;
  const differentTx = prevProps.tx.id !== nextProps.tx.id;

  return differentCard || differentTx;
});

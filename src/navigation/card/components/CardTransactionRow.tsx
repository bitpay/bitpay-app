import moment from 'moment';
import React, {memo} from 'react';
import {View, ViewProps, Text, TextProps, StyleSheet} from 'react-native';
import {useTheme} from '../../../contexts';
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

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  txRowContainer: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 72,
  },
  txColumn: {
    paddingTop: gutter,
    paddingRight: 8,
    paddingBottom: gutter,
    paddingLeft: gutter,
    justifyContent: 'center',
  },
  descriptionColumn: {
    justifyContent: 'center',
    paddingVertical: gutter,
    paddingHorizontal: 0,
    flex: 1,
  },
  priceColumn: {
    padding: gutter,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  txTextBold: {
    fontWeight: '700',
  },
  txTextLight: {
    fontSize: 12,
  },
});

const TxRowContainer = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.txRowContainer,
        {borderColor: theme.dark ? LightBlack : Air},
        style,
      ]}
      {...rest}
    />
  );
};

const TxColumn = ({style, ...rest}: ViewProps) => (
  <View style={[styles.txColumn, style]} {...rest} />
);

const DescriptionColumn = ({style, ...rest}: ViewProps) => (
  <View style={[styles.descriptionColumn, style]} {...rest} />
);

const PriceColumn = ({style, ...rest}: ViewProps) => (
  <View style={[styles.priceColumn, style]} {...rest} />
);

const TxText = React.forwardRef<
  Text,
  TextProps & {bold?: boolean; stretch?: boolean; light?: boolean}
>(({bold, stretch: _stretch, light, style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        bold ? styles.txTextBold : null,
        light
          ? [styles.txTextLight, {color: theme.dark ? LuckySevens : SlateDark}]
          : null,
        style,
      ]}
      {...rest}
    />
  );
});

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

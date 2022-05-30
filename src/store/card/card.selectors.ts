import {createSelector} from 'reselect';
import {CardProvider} from '../../constants/card';
import {ProviderConfig} from '../../constants/config.card';
import {AppSelector} from '..';
import {
  Card,
  PagedTransactionData,
  TopUp,
  Transaction,
  UiTransaction,
} from './card.models';

class CardGroup {
  readonly provider: CardProvider;
  readonly cards: Card[] = [];

  constructor(card: Card) {
    this.provider = card.provider;
    this.cards.push(card);
  }
}

const toUiTransaction = (tx: Transaction, settled: boolean) => {
  const uiTx: UiTransaction = {
    ...tx,
    settled,
  };

  return uiTx;
};

const topUpToUiTopUp = (topUp: TopUp) => {
  const uiTx: UiTransaction = {
    id: topUp.id,
    displayMerchant: 'BitPay Load',
    settled: false,
    displayPrice: Number(topUp.amount),
    merchant: topUp.displayMerchant,
    provider: topUp.provider,
    status: 'pending',
    dates: {
      auth: topUp.invoice.invoiceTime as string,
      post: topUp.invoice.invoiceTime as string,
    },

    // unused
    type: '',
    description: '',
  };

  return uiTx;
};

const sortPendingTxByTimestamp = (
  a: Pick<UiTransaction, 'dates'>,
  b: Pick<UiTransaction, 'dates'>,
) => {
  const timestampA = a.dates.auth;
  const timestampB = b.dates.auth;

  if (timestampA > timestampB) {
    return -1;
  }
  if (timestampA < timestampB) {
    return 1;
  }
  return 0;
};

export const selectCards: AppSelector<Card[]> = ({APP, CARD}) =>
  CARD.cards[APP.network];

/**
 * Sort order is determined by galileo before firstView, then virtual before physical.
 */
export const selectSortedCards = createSelector([selectCards], cards => {
  const sortedCards = cards.sort((a, b) => {
    if (
      a.provider === CardProvider.galileo &&
      b.provider === CardProvider.firstView
    ) {
      return -1;
    }
    if (
      a.provider === CardProvider.firstView &&
      b.provider === CardProvider.galileo
    ) {
      return 1;
    }

    if (a.cardType === 'virtual' && b.cardType === 'physical') {
      return -1;
    }
    if (a.cardType === 'physical' && b.cardType === 'virtual') {
      return 1;
    }
    return 0;
  });

  return sortedCards;
});

export const selectCardGroups = createSelector(
  [selectSortedCards],
  sortedCards => {
    const groups = sortedCards.reduce((groupList, card) => {
      if (!ProviderConfig[card.provider].groupEnabled) {
        groupList.push(new CardGroup(card));

        return groupList;
      }

      const group = groupList.find(g => g.provider === card.provider);

      if (group) {
        group.cards.push(card);
      } else {
        groupList.push(new CardGroup(card));
      }

      return groupList;
    }, [] as CardGroup[]);

    return groups.map(g => g.cards);
  },
);

export const selectSettledTransactions: AppSelector<
  Record<string, PagedTransactionData | undefined>
> = ({CARD}) => {
  return CARD.settledTransactions;
};

export const selectPendingTransactions: AppSelector<
  Record<string, Transaction[] | undefined>
> = ({CARD}) => {
  return CARD.pendingTransactions;
};

export const selectTopUpHistory: AppSelector<
  Record<string, TopUp[] | undefined>
> = ({CARD}) => {
  return CARD.topUpHistory;
};

export const selectDashboardTransactions = createSelector(
  [
    (_, id: string) => {
      return id;
    },
    selectCards,
    selectSettledTransactions,
    selectPendingTransactions,
    selectTopUpHistory,
  ],
  (id, cards, settledTx, pendingTx, topUpHistory) => {
    const card = cards.find(c => c.id === id);

    if (!card) {
      return [];
    }

    const {filters} = ProviderConfig[card.provider];
    const rawSettledTx = settledTx[id]?.transactionList;
    const rawPendingTx = pendingTx[id];
    const rawTopUpList = topUpHistory[id];

    const uiPendingTx = [
      ...(rawPendingTx || []).map(tx => toUiTransaction(tx, false)),
      ...(rawTopUpList || []).map(tu => topUpToUiTopUp(tu)),
    ].sort(sortPendingTxByTimestamp);

    const uiSettledTx = (rawSettledTx || [])
      .filter(filters.settledTx)
      .map(tx => toUiTransaction(tx, true));

    return [...uiPendingTx, ...uiSettledTx];
  },
);

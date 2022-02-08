import {Network} from '../../constants';
import {Card, PagedTransactionData, Transaction} from './card.models';
import {FetchCardsStatus, FetchOverviewStatus} from './card.reducer';
import {
  CardActionType,
  CardActionTypes,
  VirtualDesignCurrency,
} from './card.types';

export const successFetchCards = (
  network: Network,
  cards: Card[],
): CardActionType => ({
  type: CardActionTypes.SUCCESS_FETCH_CARDS,
  payload: {network, cards},
});

export const failedFetchCards = (): CardActionType => ({
  type: CardActionTypes.FAILED_FETCH_CARDS,
});

export const updateFetchCardsStatus = (
  status: FetchCardsStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_FETCH_CARDS_STATUS,
  payload: status,
});

export const virtualDesignCurrencyUpdated = (
  currency: VirtualDesignCurrency,
): CardActionType => ({
  type: CardActionTypes.VIRTUAL_DESIGN_CURRENCY_UPDATED,
  payload: currency,
});

export const successFetchOverview = ({
  id,
  balance,
  settledTransactions,
  pendingTransactions,
}: {
  id: string;
  balance: number;
  settledTransactions: PagedTransactionData;
  pendingTransactions: Transaction[];
}): CardActionType => ({
  type: CardActionTypes.SUCCESS_FETCH_OVERVIEW,
  payload: {id, balance, settledTransactions, pendingTransactions},
});

export const failedFetchOverview = (id: string): CardActionType => ({
  type: CardActionTypes.FAILED_FETCH_OVERVIEW,
  payload: {id},
});

export const updateFetchOverviewStatus = (
  id: string,
  status: FetchOverviewStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_FETCH_OVERVIEW_STATUS,
  payload: {id, status},
});

import {InitialUserData} from '../../api/user/user.types';
import {Network} from '../../constants';
import {Card, PagedTransactionData, TopUp, Transaction} from './card.models';
import {
  ActivateCardStatus,
  FetchCardsStatus,
  FetchOverviewStatus,
  FetchSettledTransactionsStatus,
  FetchVirtualCardImageUrlsStatus,
} from './card.reducer';
import {
  CardActionType,
  CardActionTypes,
  VirtualDesignCurrency,
} from './card.types';

export const successInitializeStore = (
  network: Network,
  data: InitialUserData,
): CardActionType => ({
  type: CardActionTypes.SUCCESS_INITIALIZE_STORE,
  payload: {
    network,
    cards: data.cards || [],
    balances: data.cardBalances || [],
  },
});

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
  topUpHistory,
}: {
  id: string;
  balance: number;
  settledTransactions: PagedTransactionData;
  pendingTransactions: Transaction[];
  topUpHistory: TopUp[];
}): CardActionType => ({
  type: CardActionTypes.SUCCESS_FETCH_OVERVIEW,
  payload: {
    id,
    balance,
    settledTransactions,
    pendingTransactions,
    topUpHistory,
  },
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

export const successFetchSettledTransactions = (
  id: string,
  transactions: PagedTransactionData,
): CardActionType => ({
  type: CardActionTypes.SUCCESS_FETCH_SETTLED_TRANSACTIONS,
  payload: {id, transactions},
});

export const failedFetchSettledTransactions = (id: string): CardActionType => ({
  type: CardActionTypes.FAILED_FETCH_SETTLED_TRANSACTIONS,
  payload: {id},
});

export const updateFetchSettledTransactionsStatus = (
  id: string,
  status: FetchSettledTransactionsStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS,
  payload: {id, status},
});

export const successFetchVirtualImageUrls = (
  payload: {id: string; virtualCardImage: string}[],
): CardActionType => ({
  type: CardActionTypes.SUCCESS_FETCH_VIRTUAL_IMAGE_URLS,
  payload,
});

export const failedFetchVirtualImageUrls = (): CardActionType => ({
  type: CardActionTypes.FAILED_FETCH_VIRTUAL_IMAGE_URLS,
});

export const updateFetchVirtualImageUrlsStatus = (
  status: FetchVirtualCardImageUrlsStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS,
  payload: status,
});

export const successActivateCard = (): CardActionType => ({
  type: CardActionTypes.SUCCESS_ACTIVATE_CARD,
  payload: undefined,
});

export const failedActivateCard = (error?: string): CardActionType => ({
  type: CardActionTypes.FAILED_ACTIVATE_CARD,
  payload: error,
});

export const updateActivateCardStatus = (
  status: ActivateCardStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_ACTIVATE_CARD_STATUS,
  payload: status,
});

export const isJoinedWaitlist = (
  isJoinedWaitlist: boolean,
): CardActionType => ({
  type: CardActionTypes.IS_JOINED_WAITLIST,
  payload: {isJoinedWaitlist},
});

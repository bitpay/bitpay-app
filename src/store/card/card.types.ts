import {Network} from '../../constants';
import {Card, PagedTransactionData, Transaction} from './card.models';
import {
  FetchCardsStatus,
  FetchOverviewStatus,
  FetchSettledTransactionsStatus,
  FetchVirtualCardImageUrlsStatus,
} from './card.reducer';

export const TTL = {
  fetchOverview: 1000 * 10,
};

export type SupportedCurrencies =
  | 'BTC'
  | 'BCH'
  | 'ETH'
  | 'GUSD'
  | 'USDP'
  | 'BUSD'
  | 'USDC'
  | 'XRP'
  | 'DOGE'
  | 'DAI'
  | 'WBTC';

export type VirtualDesignCurrency = SupportedCurrencies | 'bitpay-b';

export enum CardActionTypes {
  SUCCESS_INITIALIZE_STORE = 'CARD/SUCCESS_INITIALIZE_STORE',
  SUCCESS_FETCH_CARDS = 'CARD/SUCCESS_FETCH_CARDS',
  FAILED_FETCH_CARDS = 'CARD/FAILED_FETCH_CARDS',
  UPDATE_FETCH_CARDS_STATUS = 'CARD/UPDATE_FETCH_CARDS_STATUS',
  VIRTUAL_DESIGN_CURRENCY_UPDATED = 'CARD/VIRTUAL_DESIGN_CURRENCY_UPDATED',
  SUCCESS_FETCH_OVERVIEW = 'CARD/SUCCESS_FETCH_OVERVIEW',
  FAILED_FETCH_OVERVIEW = 'CARD/FAILED_FETCH_OVERVIEW',
  UPDATE_FETCH_OVERVIEW_STATUS = 'CARD/UPDATE_FETCH_OVERVIEW_STATUS',
  SUCCESS_FETCH_SETTLED_TRANSACTIONS = 'CARD/SUCCESS_FETCH_SETTLED_TRANSACTIONS',
  FAILED_FETCH_SETTLED_TRANSACTIONS = 'CARD/FAILED_FETCH_SETTLED_TRANSACTIONS',
  UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS = 'CARD/UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS',
  SUCCESS_FETCH_VIRTUAL_IMAGE_URLS = 'CARD/SUCCESS_FETCH_VIRTUAL_IMAGE_URLS',
  FAILED_FETCH_VIRTUAL_IMAGE_URLS = 'CARD/FAILED_FETCH_VIRTUAL_IMAGE_URLS',
  UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS = 'CARD/UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS',
}

interface SuccessInitializeStore {
  type: CardActionTypes.SUCCESS_INITIALIZE_STORE;
  payload: {
    network: Network;
    cards: Card[];
    balances: {id: string; balance: number}[];
  };
}

interface SuccessFetchCards {
  type: CardActionTypes.SUCCESS_FETCH_CARDS;
  payload: {network: Network; cards: Card[]};
}

interface FailedFetchCards {
  type: CardActionTypes.FAILED_FETCH_CARDS;
}

interface UpdateFetchCardsStatus {
  type: CardActionTypes.UPDATE_FETCH_CARDS_STATUS;
  payload: FetchCardsStatus;
}

interface VirtualDesignCurrencyUpdated {
  type: CardActionTypes.VIRTUAL_DESIGN_CURRENCY_UPDATED;
  payload: VirtualDesignCurrency;
}

interface SuccessFetchOverview {
  type: CardActionTypes.SUCCESS_FETCH_OVERVIEW;
  payload: {
    id: string;
    balance: number;
    settledTransactions: PagedTransactionData;
    pendingTransactions: Transaction[];
  };
}

interface FailedFetchOverview {
  type: CardActionTypes.FAILED_FETCH_OVERVIEW;
  payload: {id: string};
}

interface UpdateFetchOverviewStatus {
  type: CardActionTypes.UPDATE_FETCH_OVERVIEW_STATUS;
  payload: {id: string; status: FetchOverviewStatus};
}

interface SuccessFetchSettledTransactions {
  type: CardActionTypes.SUCCESS_FETCH_SETTLED_TRANSACTIONS;
  payload: {id: string; transactions: PagedTransactionData};
}

interface FailedFetchSettledTransactions {
  type: CardActionTypes.FAILED_FETCH_SETTLED_TRANSACTIONS;
  payload: {id: string};
}

interface UpdateFetchSettledTransactionsStatus {
  type: CardActionTypes.UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS;
  payload: {id: string; status: FetchSettledTransactionsStatus};
}

interface SuccessFetchVirtualImageUrls {
  type: CardActionTypes.SUCCESS_FETCH_VIRTUAL_IMAGE_URLS;
  payload: {id: string; virtualCardImage: string}[];
}

interface FailedFetchVirtualImageUrls {
  type: CardActionTypes.FAILED_FETCH_VIRTUAL_IMAGE_URLS;
}

interface UpdateFetchVirtualImageUrlsStatus {
  type: CardActionTypes.UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS;
  payload: FetchVirtualCardImageUrlsStatus;
}

export type CardActionType =
  | SuccessInitializeStore
  | SuccessFetchCards
  | FailedFetchCards
  | UpdateFetchCardsStatus
  | VirtualDesignCurrencyUpdated
  | SuccessFetchOverview
  | FailedFetchOverview
  | UpdateFetchOverviewStatus
  | SuccessFetchSettledTransactions
  | FailedFetchSettledTransactions
  | UpdateFetchSettledTransactionsStatus
  | SuccessFetchVirtualImageUrls
  | FailedFetchVirtualImageUrls
  | UpdateFetchVirtualImageUrlsStatus;

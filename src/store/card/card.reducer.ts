import {Network} from '../../constants';
import {
  BitPayIdActionType,
  BitPayIdActionTypes,
} from '../bitpay-id/bitpay-id.types';
import {Card, PagedTransactionData, Transaction} from './card.models';
import {
  CardActionType,
  CardActionTypes,
  TTL,
  VirtualDesignCurrency,
} from './card.types';

export const cardReduxPersistBlacklist: Array<keyof CardState> = [
  'fetchCardsStatus',
  'balances',
  'settledTransactions',
  'pendingTransactions',
];

export type FetchCardsStatus = 'success' | 'failed' | null;
export type FetchOverviewStatus = 'success' | 'failed' | null;
export type FetchSettledTransactionsStatus = 'success' | 'failed' | null;
export type FetchVirtualCardImageUrlsStatus = 'success' | 'failed' | null;
export interface CardState {
  lastUpdates: {
    [key in keyof typeof TTL]: number;
  };
  cards: {
    [key in Network]: Card[];
  };
  balances: {
    [id: string]: number;
  };
  virtualCardImages: {
    [id: string]: string;
  };
  fetchCardsStatus: FetchCardsStatus;
  fetchOverviewStatus: {
    [id: string]: FetchOverviewStatus;
  };
  fetchSettledTransactionsStatus: {
    [id: string]: FetchSettledTransactionsStatus;
  };
  fetchVirtualCardImageUrlsStatus: FetchVirtualCardImageUrlsStatus;
  virtualDesignCurrency: VirtualDesignCurrency;
  overview: any;
  settledTransactions: {
    [id: string]: PagedTransactionData | undefined;
  };
  pendingTransactions: {
    [id: string]: Transaction[] | undefined;
  };
}

const initialState: CardState = {
  lastUpdates: {
    fetchOverview: Date.now(),
  },
  cards: {
    [Network.mainnet]: [],
    [Network.testnet]: [],
  },
  balances: {},
  virtualCardImages: {},
  fetchCardsStatus: null,
  fetchOverviewStatus: {},
  fetchSettledTransactionsStatus: {},
  fetchVirtualCardImageUrlsStatus: null,
  virtualDesignCurrency: 'bitpay-b',
  overview: null,
  settledTransactions: {},
  pendingTransactions: {},
};

export const cardReducer = (
  state: CardState = initialState,
  action: CardActionType | BitPayIdActionType,
): CardState => {
  switch (action.type) {
    case BitPayIdActionTypes.BITPAY_ID_DISCONNECTED:
      return {
        ...state,
        cards: {
          ...state.cards,
          [action.payload.network]: [],
        },
        balances: {},
      };
    case CardActionTypes.SUCCESS_INITIALIZE_STORE:
      const payloadBalances = action.payload.balances.reduce(
        (list, {id, balance}) => {
          list[id] = balance;

          return list;
        },
        {} as {[id: string]: number},
      );

      return {
        ...state,
        cards: {
          ...state.cards,
          [action.payload.network]: action.payload.cards || [],
        },
        balances: {
          ...state.balances,
          ...payloadBalances,
        },
      };
    case CardActionTypes.SUCCESS_FETCH_CARDS:
      return {
        ...state,
        fetchCardsStatus: 'success',
        cards: {
          ...state.cards,
          [action.payload.network]: action.payload.cards || [],
        },
      };
    case CardActionTypes.FAILED_FETCH_CARDS:
      return {
        ...state,
        fetchCardsStatus: 'failed',
      };
    case CardActionTypes.UPDATE_FETCH_CARDS_STATUS:
      return {
        ...state,
        fetchCardsStatus: action.payload,
      };
    case CardActionTypes.VIRTUAL_DESIGN_CURRENCY_UPDATED:
      return {
        ...state,
        virtualDesignCurrency: action.payload,
      };
    case CardActionTypes.SUCCESS_FETCH_OVERVIEW:
      return {
        ...state,
        fetchOverviewStatus: {
          ...state.fetchOverviewStatus,
          [action.payload.id]: 'success',
        },
        lastUpdates: {
          ...state.lastUpdates,
          fetchOverview: Date.now(),
        },
        balances: {
          ...state.balances,
          [action.payload.id]: action.payload.balance,
        },
        settledTransactions: {
          ...state.settledTransactions,
          [action.payload.id]: action.payload.settledTransactions,
        },
        pendingTransactions: {
          ...state.pendingTransactions,
          [action.payload.id]: action.payload.pendingTransactions,
        },
      };
    case CardActionTypes.FAILED_FETCH_OVERVIEW:
      return {
        ...state,
        fetchOverviewStatus: {
          ...state.fetchOverviewStatus,
          [action.payload.id]: 'failed',
        },
      };
    case CardActionTypes.UPDATE_FETCH_OVERVIEW_STATUS:
      return {
        ...state,
        fetchOverviewStatus: {
          ...state.fetchOverviewStatus,
          [action.payload.id]: action.payload.status,
        },
      };
    case CardActionTypes.SUCCESS_FETCH_SETTLED_TRANSACTIONS:
      const currentTransactions = state.settledTransactions[action.payload.id];
      let newTransactionList = action.payload.transactions.transactionList;
      let append = false;

      if (currentTransactions) {
        append =
          action.payload.transactions.currentPageNumber >
          currentTransactions.currentPageNumber;

        if (append) {
          newTransactionList = [
            ...currentTransactions.transactionList,
            ...action.payload.transactions.transactionList,
          ];
        }
      }

      return {
        ...state,
        fetchSettledTransactionsStatus: {
          ...state.fetchSettledTransactionsStatus,
          [action.payload.id]: 'success',
        },
        settledTransactions: {
          ...state.settledTransactions,
          [action.payload.id]: {
            ...action.payload.transactions,
            transactionList: newTransactionList,
          },
        },
      };
    case CardActionTypes.FAILED_FETCH_SETTLED_TRANSACTIONS:
      return {
        ...state,
        fetchSettledTransactionsStatus: {
          ...state.fetchSettledTransactionsStatus,
          [action.payload.id]: 'failed',
        },
      };
    case CardActionTypes.UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS:
      return {
        ...state,
        fetchSettledTransactionsStatus: {
          ...state.fetchSettledTransactionsStatus,
          [action.payload.id]: action.payload.status,
        },
      };
    case CardActionTypes.SUCCESS_FETCH_VIRTUAL_IMAGE_URLS:
      const fetchedUrls = action.payload.reduce(
        (urls, {id, virtualCardImage}) => {
          urls[id] = virtualCardImage;
          return urls;
        },
        {} as {[id: string]: string},
      );

      return {
        ...state,
        fetchVirtualCardImageUrlsStatus: 'success',
        virtualCardImages: {
          ...state.virtualCardImages,
          ...fetchedUrls,
        },
      };
    case CardActionTypes.FAILED_FETCH_VIRTUAL_IMAGE_URLS:
      return {
        ...state,
        fetchVirtualCardImageUrlsStatus: 'failed',
      };
    case CardActionTypes.UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS:
      return {
        ...state,
        fetchVirtualCardImageUrlsStatus: action.payload,
      };
    default:
      return state;
  }
};

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
  fetchCardsStatus: FetchCardsStatus;
  fetchOverviewStatus: {
    [id: string]: FetchOverviewStatus;
  };
  virtualDesignCurrency: VirtualDesignCurrency;
  overview: any;
  settledTransactions: {
    [id: string]: PagedTransactionData;
  };
  pendingTransactions: {
    [id: string]: Transaction[];
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
  fetchCardsStatus: null,
  fetchOverviewStatus: {},
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
    default:
      return state;
  }
};

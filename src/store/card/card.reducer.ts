import {Network} from '../../constants';
import {
  BitPayIdActionType,
  BitPayIdActionTypes,
} from '../bitpay-id/bitpay-id.types';
import {Card} from './card.models';
import {
  CardActionType,
  CardActionTypes,
  VirtualDesignCurrency,
} from './card.types';

export const cardReduxPersistBlacklist: Array<keyof CardState> = [
  'fetchCardsStatus',
];

export type FetchCardsStatus = 'success' | 'failed' | null;
export type FetchOverviewStatus = 'success' | 'failed' | null;

export interface CardState {
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
}

const initialState: CardState = {
  cards: {
    [Network.mainnet]: [],
    [Network.testnet]: [],
  },
  balances: {},
  fetchCardsStatus: null,
  fetchOverviewStatus: {},
  virtualDesignCurrency: 'bitpay-b',
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
        balances: {
          ...state.balances,
          [action.payload.id]: action.payload.balance,
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

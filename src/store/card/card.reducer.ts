import {Card} from './card.models';
import {CardActionType, CardActionTypes} from './card.types';

export const cardReduxPersistBlacklist: Array<keyof CardState> = [
  'fetchCardsStatus',
];

export type FetchCardsStatus = 'success' | 'failed' | null;

export interface CardState {
  cards: Card[];
  fetchCardsStatus: FetchCardsStatus;
}

const initialState: CardState = {
  cards: [],
  fetchCardsStatus: null,
};

export const cardReducer = (
  state: CardState = initialState,
  action: CardActionType,
): CardState => {
  switch (action.type) {
    case CardActionTypes.SUCCESS_FETCH_CARDS:
      return {
        ...state,
        fetchCardsStatus: 'success',
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
    default:
      return state;
  }
};

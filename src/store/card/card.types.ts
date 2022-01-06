import {Network} from '../../constants';
import {Card} from './card.models';
import {FetchCardsStatus} from './card.reducer';

export type SupportedCurrencies =
  | 'BTC'
  | 'BCH'
  | 'ETH'
  | 'GUSD'
  | 'PAX'
  | 'BUSD'
  | 'USDC'
  | 'XRP'
  | 'DOGE'
  | 'DAI'
  | 'WBTC';

export type VirtualDesignCurrency = SupportedCurrencies | 'bitpay-b';

export enum CardActionTypes {
  SUCCESS_FETCH_CARDS = 'CARD/SUCCESS_FETCH_CARDS',
  FAILED_FETCH_CARDS = 'CARD/FAILED_FETCH_CARDS',
  UPDATE_FETCH_CARDS_STATUS = 'CARD/UPDATE_FETCH_CARDS_STATUS',
  VIRTUAL_DESIGN_CURRENCY_UPDATED = 'CARD/VIRTUAL_DESIGN_CURRENCY_UPDATED',
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

export type CardActionType =
  | SuccessFetchCards
  | FailedFetchCards
  | UpdateFetchCardsStatus
  | VirtualDesignCurrencyUpdated;

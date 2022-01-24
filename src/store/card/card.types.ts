import {Network} from '../../constants';
import {Card} from './card.models';
import {FetchCardsStatus, FetchOverviewStatus} from './card.reducer';

export type CardBrand = 'Mastercard' | 'Visa';
export type CardProvider = 'galileo' | 'firstView';

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
  SUCCESS_FETCH_OVERVIEW = 'CARD/SUCCESS_FETCH_OVERVIEW',
  FAILED_FETCH_OVERVIEW = 'CARD/FAILED_FETCH_OVERVIEW',
  UPDATE_FETCH_OVERVIEW_STATUS = 'CARD/UPDATE_FETCH_OVERVIEW_STATUS',
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
  payload: {id: string; balance: number};
}

interface FailedFetchOverview {
  type: CardActionTypes.FAILED_FETCH_OVERVIEW;
  payload: {id: string};
}

interface UpdateFetchOverviewStatus {
  type: CardActionTypes.UPDATE_FETCH_OVERVIEW_STATUS;
  payload: {id: string; status: FetchOverviewStatus};
}

export type CardActionType =
  | SuccessFetchCards
  | FailedFetchCards
  | UpdateFetchCardsStatus
  | VirtualDesignCurrencyUpdated
  | SuccessFetchOverview
  | FailedFetchOverview
  | UpdateFetchOverviewStatus;

import {batch} from 'react-redux';
import {CardActions} from '.';
import CardApi from '../../api/card';
import {Network} from '../../constants';
import {Effect} from '../index';
import {LogActions} from '../log';
import {Card} from './card.models';

interface CardStoreInitParams {
  cards?: Card[];
  cardBalances?: {
    id: string;
    balance: number;
  }[];
}

export const startCardStoreInit =
  (
    network: Network,
    {cards, cardBalances}: CardStoreInitParams,
  ): Effect<Promise<void>> =>
  async dispatch => {
    dispatch(CardActions.successInitializeStore(network, cards, cardBalances));
  };

export const startFetchAll =
  (token: string): Effect =>
  async (dispatch, getState) => {
    try {
      const {APP} = getState();
      const cards = await CardApi.fetchAll(token);

      dispatch(CardActions.successFetchCards(APP.network, cards));
    } catch (err) {
      dispatch(CardActions.failedFetchCards());
    }
  };

export const startFetchOverview =
  (id: string): Effect =>
  async (dispatch, getState) => {
    try {
      const {APP, BITPAY_ID} = getState();
      const res = await CardApi.fetchOverview(
        BITPAY_ID.apiToken[APP.network],
        id,
      );
      const {settledTransactions, pendingTransactions} = res.card.overview;

      dispatch(
        CardActions.successFetchOverview({
          id,
          balance: res.card.balance,
          settledTransactions,
          pendingTransactions,
        }),
      );
    } catch (err) {
      console.log(`Failed to fetch overview for card ${id}`);
      batch(() => {
        dispatch(LogActions.error(`Failed to fetch overview for card ${id}`));
        dispatch(LogActions.error(JSON.stringify(err)));
        dispatch(CardActions.failedFetchOverview(id));
      });
    }
  };

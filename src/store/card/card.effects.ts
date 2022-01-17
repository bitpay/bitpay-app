import {batch} from 'react-redux';
import {CardActions} from '.';
import CardApi from '../../api/card';
import {Network} from '../../constants';
import {Effect} from '../index';
import {LogActions} from '../log';
import {Card} from './card.models';

interface CardStoreInitParams {
  cards?: Card[];
}

export const startCardStoreInit =
  (network: Network, {cards}: CardStoreInitParams): Effect<Promise<void>> =>
  async dispatch => {
    if (cards) {
      dispatch(CardActions.successFetchCards(network, cards));
    }
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

      dispatch(
        CardActions.successFetchOverview({id, balance: res.card.balance}),
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

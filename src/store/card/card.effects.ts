import {CardActions} from '.';
import CardApi from '../../api/card';
import {Network} from '../../constants';
import {Effect} from '../index';
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

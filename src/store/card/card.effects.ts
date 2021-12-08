import {CardActions} from '.';
import CardApi from '../../api/card';
import {Effect} from '../index';

export const startFetchAll =
  (token: string): Effect =>
  async dispatch => {
    try {
      const cards = await CardApi.fetchAll(token);

      dispatch(CardActions.successFetchCards(cards));
    } catch (err) {
      dispatch(CardActions.failedFetchCards());
    }
  };

import {Card} from '../../store/card/card.models';
import GraphQlApi from '../graphql';
import CardQueries from './queries';

interface FetchAllCardsResponse {
  user: {
    cards: Card[];
  };
}

interface FetchCardResponse {
  user: {
    card: Card;
  };
}

const fetchAll = async (token: string) => {
  const query = CardQueries.FETCH_CARDS(token);
  const {data} = await GraphQlApi.getInstance().request<FetchAllCardsResponse>(
    query,
  );

  if (data.errors) {
    throw new Error(data.errors);
  }

  return data.data.user.cards;
};

const fetchOne = async (token: string, id: string) => {
  const query = CardQueries.FETCH_CARD(token, id);
  const {data} = await GraphQlApi.getInstance().request<FetchCardResponse>(
    query,
  );

  if (data.errors) {
    throw new Error(data.errors);
  }

  return data.data.user.card;
};

const CardApi = {
  fetchAll,
  fetchOne,
};

export default CardApi;

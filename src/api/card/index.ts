import GraphQlApi from '../graphql';
import {
  FetchAllCardsResponse,
  FetchCardResponse,
  FetchOverviewResponse,
} from './card.types';
import CardQueries from './card.queries';

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

const fetchOverview = async (token: string, id: string) => {
  const query = CardQueries.FETCH_OVERVIEW(token, id);
  const {data} = await GraphQlApi.getInstance().request<FetchOverviewResponse>(
    query,
  );

  if (data.errors) {
    throw new Error(data.errors);
  }

  return data.data.user;
};

const CardApi = {
  fetchAll,
  fetchOne,
  fetchOverview,
};

export default CardApi;

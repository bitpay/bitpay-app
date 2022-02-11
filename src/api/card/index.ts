import GraphQlApi from '../graphql';
import {
  FetchAllCardsResponse,
  FetchCardResponse,
  FetchOverviewResponse,
  FetchVirtualCardImageUrlsResponse,
} from './card.types';
import CardQueries from './card.queries';

const fetchAll = async (token: string) => {
  const query = CardQueries.FETCH_CARDS(token);
  const {data} = await GraphQlApi.getInstance().request<FetchAllCardsResponse>(
    query,
  );

  if (data.errors) {
    throw new Error(data.errors.join(', '));
  }

  return data.data.user.cards;
};

const fetchOne = async (token: string, id: string) => {
  const query = CardQueries.FETCH_CARD(token, id);
  const {data} = await GraphQlApi.getInstance().request<FetchCardResponse>(
    query,
  );

  if (data.errors) {
    throw new Error(data.errors.join(', '));
  }

  return data.data.user.card;
};

const fetchOverview = async (token: string, id: string) => {
  const pageNumber = 1;
  const pageSize = 100;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (1095 || 60));

  const query = CardQueries.FETCH_OVERVIEW(token, id, {
    pageNumber,
    pageSize,
    startDate,
  });
  const {data} = await GraphQlApi.getInstance().request<FetchOverviewResponse>(
    query,
  );

  if (data.errors) {
    throw new Error(data.errors.join(', '));
  }

  return data.data.user;
};

const fetchVirtualCardImageUrls = async (token: string, ids: string[]) => {
  if (!ids.length) {
    return [];
  }

  const query = CardQueries.FETCH_VIRTUAL_CARD_IMAGE_URLS(token, ids);

  const {data} =
    await GraphQlApi.getInstance().request<FetchVirtualCardImageUrlsResponse>(
      query,
    );

  if (data.errors) {
    throw new Error(data.errors.map(e => e.message).join(', '));
  }

  return Object.values(data.data.user);
};

const CardApi = {
  fetchAll,
  fetchOne,
  fetchOverview,
  fetchVirtualCardImageUrls,
};

export default CardApi;

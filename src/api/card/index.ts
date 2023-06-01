import {StartActivateCardParams} from '../../store/card/card.effects';
import GraphQlApi from '../graphql';
import CardMutations from './card.mutations';
import CardQueries from './card.queries';
import {
  ActivateCardResponse,
  FetchAllCardsResponse,
  FetchCardResponse,
  FetchOverviewResponse,
  FetchSettledTransactionsResponse,
  FetchVirtualCardImageUrlsResponse,
} from './card.types';

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

const fetchOverview = async (
  token: string,
  id: string,
  options?: {
    pageNumber?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
  },
) => {
  let {pageNumber = 1, pageSize = 100, startDate, endDate} = options || {};

  if (!startDate) {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);
  }

  const query = CardQueries.FETCH_OVERVIEW(token, id, {
    pageNumber,
    pageSize,
    startDate,
    endDate,
  });
  const {data} = await GraphQlApi.getInstance().request<FetchOverviewResponse>(
    query,
  );

  if (data.errors) {
    throw new Error(data.errors.join(', '));
  }

  return data.data.user;
};

const fetchSettledTransactions = async (
  token: string,
  id: string,
  options?: {
    pageSize?: number;
    pageNumber?: number;
    startDate?: Date;
    endDate?: Date;
  },
) => {
  let {pageSize = 100, pageNumber = 1, startDate, endDate} = options || {};

  if (!startDate) {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);
  }

  const query = CardQueries.FETCH_SETTLED_TRANSACTIONS(token, id, {
    pageSize,
    pageNumber,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
  });

  const response =
    await GraphQlApi.getInstance().request<FetchSettledTransactionsResponse>(
      query,
    );
  const {data, errors} = response.data;

  if (!data) {
    throw new Error(
      errors
        ?.map(e => `${e.path ? e.path.join('.') + ': ' : ''}${e.message}`)
        .join(', ') || `Failed to fetch settled transactions for ${id}`,
    );
  }

  return data.user.card.overview.settledTransactions;
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

const activateCard = async (
  token: string,
  id: string,
  payload: StartActivateCardParams,
) => {
  const query = CardMutations.ACTIVATE_CARD(token, id, payload);

  const {data} = await GraphQlApi.getInstance().request<ActivateCardResponse>(
    query,
  );

  return data;
};

const CardApi = {
  activateCard,
  fetchAll,
  fetchOne,
  fetchOverview,
  fetchSettledTransactions,
  fetchVirtualCardImageUrls,
};

export default CardApi;

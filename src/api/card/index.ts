import {
  AppleWalletProvisioningRequestParams,
  StartActivateCardParams,
} from '../../store/card/card.effects';
import GraphQlApi from '../graphql';
import CardMutations from './card.mutations';
import CardQueries from './card.queries';
import {
  ActivateCardResponse,
  FetchAllCardsResponse,
  FetchCardResponse,
  FetchOverviewResponse,
  FetchPinChangeRequestInfoResponse,
  FetchReferralCodeResponse,
  FetchReferredUsers,
  FetchSettledTransactionsResponse,
  FetchVirtualCardImageUrlsResponse,
  UpdateCardLockResponse,
  UpdateCardNameResponse,
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

const updateCardName = async (token: string, id: string, name: string) => {
  const query = CardMutations.NAME_CARD(token, id, name);

  const {data} = await GraphQlApi.getInstance().request<UpdateCardNameResponse>(
    query,
  );

  if (data.errors) {
    throw new Error(
      data.errors
        .map(e => `${e.path ? e.path.join('.') + ': ' : ''}${e.message}`)
        .join(',\n') || `Failed to update card name for ${id}`,
    );
  }

  return data.data;
};

const updateCardLock = async (token: string, id: string, locked: boolean) => {
  const query = CardMutations.LOCK_CARD(token, id, locked);

  const {data} = await GraphQlApi.getInstance().request<UpdateCardLockResponse>(
    query,
  );

  if (data.errors) {
    throw new Error(
      data.errors
        .map(e => `${e.path ? e.path.join('.') + ': ' : ''}${e.message}`)
        .join(',\n') || `Failed to update card lock status for ${id}`,
    );
  }

  return data.data;
};

const fetchReferralCode = async (token: string) => {
  const query = CardQueries.FETCH_REFERRAL_CODE(token);

  const {data} =
    await GraphQlApi.getInstance().request<FetchReferralCodeResponse>(query);

  if (data.errors) {
    throw new Error(data.errors.map(e => e.message).join(', '));
  }

  return data.data.user.referralCode;
};

const fetchReferredUsers = async (token: string) => {
  const query = CardQueries.FETCH_REFERRED_USERS(token);

  const {data} = await GraphQlApi.getInstance().request<FetchReferredUsers>(
    query,
  );

  if (data.errors) {
    throw new Error(data.errors.map(e => e.message).join(', '));
  }

  return data.data.user.referredUsers;
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

const startCreateAppleWalletProvisioningRequest = async (
  token: string,
  id: string,
  payload: AppleWalletProvisioningRequestParams,
) => {
  const query = CardMutations.START_CREATE_APPLE_WALLET_PROVISIONING_REQUEST(
    token,
    id,
    payload,
  );

  const {data} = await GraphQlApi.getInstance().request<any>(query);

  return data;
};

const startCreateGooglePayProvisioningRequest = async (
  token: string,
  id: string,
) => {
  const query = CardMutations.START_CREATE_GOOGLE_PAY_PROVISIONING_REQUEST(
    token,
    id,
  );

  const {data} = await GraphQlApi.getInstance().request<any>(query);

  return data;
};

const fetchPinChangeRequestInfo = async (token: string, id: string) => {
  const query = CardQueries.FETCH_PIN_CHANGE_REQUEST_INFO(token, id);

  const {data} =
    await GraphQlApi.getInstance().request<FetchPinChangeRequestInfoResponse>(
      query,
    );

  return data;
};

const startConfirmPinChange = async (token: string, id: string) => {
  const query = CardMutations.START_CONFIRM_PIN_CHANGE(token, id);

  const {data} = await GraphQlApi.getInstance().request(query);

  return data;
};

const CardApi = {
  activateCard,
  fetchAll,
  fetchOne,
  fetchOverview,
  fetchPinChangeRequestInfo,
  fetchReferralCode,
  fetchReferredUsers,
  fetchSettledTransactions,
  fetchVirtualCardImageUrls,
  startConfirmPinChange,
  startCreateAppleWalletProvisioningRequest,
  startCreateGooglePayProvisioningRequest,
  updateCardLock,
  updateCardName,
};

export default CardApi;

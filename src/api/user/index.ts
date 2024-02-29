import GraphQlApi from '../graphql';
import UserQueries from './user.queries';
import {
  FetchBasicInfoResponse,
  FetchDoshTokenResponse,
  FetchInitialUserDataResponse,
} from './user.types';

const fetchInitialUserData = async (token: string) => {
  const query = UserQueries.FETCH_ALL_USER_DATA(token);
  const response =
    await GraphQlApi.getInstance().request<FetchInitialUserDataResponse>(query);

  const {errors, data} = response.data;

  if (!data) {
    const msg = errors
      ? errors.map(e => e.message).join(', ')
      : 'An error occurred while fetching initial user data.';

    throw new Error(msg);
  }

  return response.data;
};

const fetchBasicInfo = async (
  token: string,
  params?: {includeExternalData?: boolean; includeMethodData?: boolean},
) => {
  const query = UserQueries.FETCH_BASIC_INFO(
    token,
    params || {includeExternalData: false, includeMethodData: false},
  );
  const {data} = await GraphQlApi.getInstance().request<FetchBasicInfoResponse>(
    query,
  );

  if (data.errors) {
    const msg = data.errors.map(e => e.message).join(', ');

    throw new Error(msg);
  }

  return data.data.user.basicInfo;
};

const fetchDoshToken = async (token: string) => {
  const query = UserQueries.FETCH_DOSH_TOKEN(token);
  const response =
    await GraphQlApi.getInstance().request<FetchDoshTokenResponse>(query);
  const {errors, data} = response.data;

  if (errors) {
    const msg = errors.map(e => e.message).join(', ');

    throw new Error(msg);
  }

  return data.user.doshToken;
};

const UserApi = {
  fetchBasicInfo,
  fetchDoshToken,
  fetchInitialUserData,
};

export default UserApi;

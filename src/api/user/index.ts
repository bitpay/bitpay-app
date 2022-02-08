import GraphQlApi from '../graphql';
import UserQueries from './user.queries';
import {FetchAllUserDataResponse, FetchBasicInfoResponse} from './user.types';

const fetchAllUserData = async (token: string) => {
  const query = UserQueries.FETCH_ALL_USER_DATA(token);
  const response =
    await GraphQlApi.getInstance().request<FetchAllUserDataResponse>(query);

  const {errors, data} = response.data;

  if (errors) {
    const msg = errors.map(e => e.message).join(', ');

    throw new Error(msg);
  }

  return data.user;
};

const fetchBasicInfo = async (token: string) => {
  const query = UserQueries.FETCH_BASIC_INFO(token);
  const {data} = await GraphQlApi.getInstance().request<FetchBasicInfoResponse>(
    query,
  );

  if (data.errors) {
    const msg = data.errors.map(e => e.message).join(', ');

    throw new Error(msg);
  }

  return data.data.user.basicInfo;
};

const UserApi = {
  fetchAllUserData,
  fetchBasicInfo,
};

export default UserApi;

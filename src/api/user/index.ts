import {Card} from '../../store/card/card.models';
import GraphQlApi from '../graphql';
import UserQueries from './queries';

interface BasicUserInfo {
  eid: string;
  email: string;
  experiments: string[];
  familyName: string;
  givenName: string;
  name: string;
  referralCode: string;
  userSettings: {
    agreedCardholderAgreement: boolean;
    acknowledgePrivacyNotice: boolean;
    optInEmailMarketing: boolean;
  };
}

interface FetchBasicInfoResponse {
  user: {
    basicInfo: BasicUserInfo;
  };
}

interface FetchAllUserDataResponse {
  user: {
    basicInfo: BasicUserInfo;
    cards: Card[];
  };
}

const fetchAllUserData = async (token: string) => {
  const query = UserQueries.FETCH_ALL_USER_DATA(token);
  const response =
    await GraphQlApi.getInstance().request<FetchAllUserDataResponse>(query);

  const {data} = response.data;

  return data.user;
};

const fetchBasicInfo = async (token: string) => {
  const query = UserQueries.FETCH_BASIC_INFO(token);
  const {data} = await GraphQlApi.getInstance().request<FetchBasicInfoResponse>(
    query,
  );

  if (data.errors) {
    throw new Error(data.errors);
  }

  return data.data.user.basicInfo;
};

const UserApi = {
  fetchAllUserData,
  fetchBasicInfo,
};

export default UserApi;

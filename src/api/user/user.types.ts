import {Card} from '../../store/card/card.models';

export interface BasicUserInfo {
  eid: string;
  email: string;
  experiments: string[];
  familyName: string;
  givenName: string;
  incentiveLevel?: string;
  incentiveLevelId?: string;
  name: string;
  referralCode: string;
  userSettings: {
    agreedCardholderAgreement: boolean;
    acknowledgePrivacyNotice: boolean;
    optInEmailMarketing: boolean;
  };
}

export interface FetchBasicInfoResponse {
  user: {
    basicInfo: BasicUserInfo;
  };
}

export interface InitialUserData {
  basicInfo: BasicUserInfo;
  cards: Card[];
  cardBalances: {
    id: string;
    balance: number;
  }[];
  doshToken: string;
}

export interface FetchInitialUserDataResponse {
  user: InitialUserData;
}

export interface FetchDoshTokenResponse {
  user: {
    doshToken: string;
  };
}

export interface FetchSupportedCurrenciesResponse {
  user: {
    currencies: string[];
  };
}

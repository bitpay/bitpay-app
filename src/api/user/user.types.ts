import {Card} from '../../store/card/card.models';

export interface BasicUserInfo {
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

export interface FetchBasicInfoResponse {
  user: {
    basicInfo: BasicUserInfo;
  };
}

export interface FetchAllUserDataResponse {
  user: {
    basicInfo: BasicUserInfo;
    cards: Card[];
  };
}

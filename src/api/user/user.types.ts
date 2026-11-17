export interface BasicUserInfo {
  country: string;
  eid: string;
  email: string;
  experiments: string[];
  familyName: string;
  givenName: string;
  incentiveLevel?: string;
  incentiveLevelId?: string;
  methodEntityId?: string;
  methodVerified?: boolean;
  name: string;
  phone?: string;
  referralCode: string;
  state: string;
  userSettings: {
    agreedCardholderAgreement: boolean;
    acknowledgePrivacyNotice: boolean;
    optInEmailMarketing: boolean;
  };
  verified: boolean;
  optInEmailMarketing: boolean;
}

export interface FetchBasicInfoResponse {
  user: {
    basicInfo: BasicUserInfo;
  };
}

export interface InitialUserData {
  basicInfo: BasicUserInfo;
}

export interface FetchInitialUserDataResponse {
  user: InitialUserData;
}

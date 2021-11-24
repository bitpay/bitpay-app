export interface Session {
  isAuthenticated: boolean;
  csrfToken: string;
}

export interface User {
  email: string;
  eid?: string;
  familyName?: string;
  givenName?: string;
  userSettings: {
    acknowledgePrivacyNotice?: boolean;
    agreedCardholderAgreement?: boolean;
    optInEmailMarketing?: boolean;
  };
}

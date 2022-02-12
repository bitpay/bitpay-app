export interface Session {
  isAuthenticated: boolean;
  csrfToken: string;

  /**
   * Nocaptcha (checkbox) site key.
   */
  noCaptchaKey: string;

  /**
   * Invisible recaptcha site key.
   */
  captchaKey: string;
  captchaDisabled?: boolean;
}

export interface User {
  email: string;
  eid: string;
  familyName?: string;
  givenName?: string;
  userSettings: {
    acknowledgePrivacyNotice?: boolean;
    agreedCardholderAgreement?: boolean;
    optInEmailMarketing?: boolean;
  };
}

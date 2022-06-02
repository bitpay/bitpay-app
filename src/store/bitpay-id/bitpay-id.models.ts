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

  /**
   * True if user is authenticated and has verified their email.
   */
  verified?: true | undefined;
}

export interface User {
  email: string;
  eid: string;
  familyName?: string;
  givenName?: string;
  incentiveLevel?: string;
  incentiveLevelId?: string;
  userSettings: {
    acknowledgePrivacyNotice?: boolean;
    agreedCardholderAgreement?: boolean;
    optInEmailMarketing?: boolean;
  };
  localSettings: {
    syncGiftCardPurchases: boolean;
  };
  referralCode?: string;
  name?: string;
}

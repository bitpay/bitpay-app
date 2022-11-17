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

export interface ReceivingAddress {
  id: string;
  currency: string;
  coin: string;
  chain: string;
  label: string;
  address: string;
  provider: String;
  status: {
    isActive: boolean;
  };
  usedFor: {
    payToEmail: boolean;
  };
}

export interface SecuritySettings {
  otpAuthKey: string;
  otpEnabled: boolean;
  email: string;
}

export interface UserAddress {
  apartmentNumber: string;
  city: string;
  country: string;
  postCode: string;
  state: string;
  street: string;
  streetNumber: string;
}

export interface User {
  email: string;
  eid: string;
  address: UserAddress;
  familyName?: string;
  givenName?: string;
  incentiveLevel?: string;
  incentiveLevelId?: string;
  userSettings: {
    acknowledgePrivacyNotice?: boolean;
    agreedCardholderAgreement?: boolean;
    optInEmailMarketing?: boolean;
  };
  referralCode?: string;
  name?: string;
}

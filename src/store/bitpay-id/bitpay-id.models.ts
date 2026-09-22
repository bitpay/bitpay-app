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

/**
 * Fields are optional until the backend method is finalized — render only what
 * is actually returned.
 */
export interface LastLogin {
  date?: string;
  ipAddress?: string;
  city?: string;
  region?: string;
  country?: string;
  device?: string;
}

export interface User {
  email: string;
  eid: string;
  country?: string;
  familyName?: string;
  givenName?: string;
  incentiveLevel?: string;
  incentiveLevelId?: string;
  legalFamilyName?: string;
  legalGivenName?: string;
  methodEntityId?: string;
  methodVerified?: boolean;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  userSettings: {
    acknowledgePrivacyNotice?: boolean;
    agreedCardholderAgreement?: boolean;
    optInEmailMarketing?: boolean;
  };
  referralCode?: string;
  state?: string;
  name?: string;
  verified?: boolean;
}

export interface PasskeyCredential {
  id: string;
  createdAt: string;
  publicKey: string;
}

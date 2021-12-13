export interface LoginResponse {
  accessTypes?: 'merchant' | 'visaCard' | 'visaManagement'[];
  twoFactorPending?: boolean;
  emailAuthenticationPending?: boolean;
}

export interface LoginErrorResponse {
  twoFactorPending?: boolean;
  emailAuthenticationPending?: boolean;
}

export interface GeneratePairingCodeResponse {
  data: {
    /**
     * A BitAuth pairing URL.
     */
    url: `bitpay://bitpay.com?secret=${string}&email=${string}`;
  };
}

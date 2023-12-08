type ExchangeConfig = {
  disabled?: boolean;
  removed?: boolean;
  disabledTitle?: string;
  disabledMessage?: string;
};

export type BuyCryptoConfig = {
  disabled?: boolean;
  disabledTitle?: string;
  disabledMessage?: string;
  banxa?: ExchangeConfig;
  moonpay?: ExchangeConfig;
  ramp?: ExchangeConfig;
  sardine?: ExchangeConfig;
  simplex?: ExchangeConfig;
  wyre?: ExchangeConfig;
};

export type SwapCryptoConfig = {
  disabled?: boolean;
  disabledTitle?: string;
  disabledMessage?: string;
  changelly?: ExchangeConfig;
};

export type ExternalServicesConfig = {
  buyCrypto?: BuyCryptoConfig;
  swapCrypto?: SwapCryptoConfig;
};

export interface ExternalServicesConfigRequestParams {
  currentAppVersion?: string;
  currentLocationCountry?: string;
  currentLocationState?: string;
  bitpayIdLocationCountry?: string;
  bitpayIdLocationState?: string;
}

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
  transak?: ExchangeConfig;
  wyre?: ExchangeConfig;
};

export type SellCryptoConfig = {
  disabled?: boolean;
  disabledTitle?: string;
  disabledMessage?: string;
  moonpay?: ExchangeConfig;
};

export type SwapCryptoConfig = {
  disabled?: boolean;
  disabledTitle?: string;
  disabledMessage?: string;
  changelly?: ExchangeConfig;
};

export type ExternalServicesConfig = {
  buyCrypto?: BuyCryptoConfig;
  sellCrypto?: SellCryptoConfig;
  swapCrypto?: SwapCryptoConfig;
};

export interface ExternalServicesConfigRequestParams {
  currentAppVersion?: string;
  currentLocationCountry?: string;
  currentLocationState?: string;
  bitpayIdLocationCountry?: string;
  bitpayIdLocationState?: string;
}

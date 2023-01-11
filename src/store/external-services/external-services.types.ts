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
  moonpay?: ExchangeConfig;
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

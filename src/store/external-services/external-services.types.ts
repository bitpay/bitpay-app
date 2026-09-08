export type ExchangeConfig = {
  disabled?: boolean;
  removed?: boolean;
  disabledTitle?: string;
  disabledMessage?: string;
  config?: {
    paymentMethods?: PaymentMethodsConfig;
    [key: string]: any; // Other partner-specific configuration properties can be added here
  };
};

export type BuyCryptoConfig = {
  disabled?: boolean;
  disabledTitle?: string;
  disabledMessage?: string;
  paymentMethods?: PaymentMethodsConfig;
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
  paymentMethods?: PaymentMethodsConfig;
  moonpay?: ExchangeConfig;
  ramp?: ExchangeConfig;
  simplex?: ExchangeConfig;
};

export type SwapCryptoConfig = {
  disabled?: boolean;
  disabledTitle?: string;
  disabledMessage?: string;
  changelly?: ExchangeConfig;
  thorswap?: ExchangeConfig;
};

export type ConfigPaymentMethodKey =
  | 'ach'
  | 'applePay'
  | 'cashApp'
  | 'creditCard'
  | 'debitCard'
  | 'googlePay'
  | 'sepaBankTransfer'
  | 'gbpBankTransfer'
  | 'other'
  | 'paypal'
  | 'pisp'
  | 'pix'
  | 'venmo';

export type PaymentMethodConfig = {
  disabled?: boolean;
};

export type PaymentMethodsConfig = {
  [key in ConfigPaymentMethodKey]?: PaymentMethodConfig;
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

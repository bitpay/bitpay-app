export interface RampPaymentData {
  address: string;
  chain: string;
  created_on: number;
  crypto_amount: number;
  coin: string;
  env: 'dev' | 'prod';
  fiat_base_amount: number;
  fiat_total_amount: number;
  fiat_total_amount_currency: string;
  external_id: string; // bitpay-app custom id
  status: string;
  user_id: string;
}

export interface RampIncomingData {
  rampExternalId: string;
  walletId?: string;
  status?: string;
}

export interface RampQuoteRequestData {
  asset: RampAssetInfo;
  [RampPaymentMethodName.MANUAL_BANK_TRANSFER]: RampQuoteResultForPaymentMethod;
  [RampPaymentMethodName.AUTO_BANK_TRANSFER]: RampQuoteResultForPaymentMethod;
  [RampPaymentMethodName.CARD_PAYMENT]: RampQuoteResultForPaymentMethod;
  [RampPaymentMethodName.APPLE_PAY]: RampQuoteResultForPaymentMethod;
  [RampPaymentMethodName.GOOGLE_PAY]: RampQuoteResultForPaymentMethod;
  [RampPaymentMethodName.PIX]: RampQuoteResultForPaymentMethod;
  [RampPaymentMethodName.OPEN_BANKING]: RampQuoteResultForPaymentMethod; // PISP
}

export interface RampGetAssetsRequestData {
  env: 'sandbox' | 'production';
  flow?: 'buy' | 'sell'; // custom param
  // currencyCode (optional): sets the fiat currency that will be used in minPurchaseAmount, maxPurchaseAmount, minFeeAmount, networkFee properties. If no value is provided, EUR is used as a default setting.
  currencyCode?: string;
  // withDisabled (optional): boolean parameter - if it's true, assets with enabled: false will be returned. Use this param to receive assets that are temporarily disabled, for example due to maintenance.
  withDisabled?: boolean;
  // withHidden (optional): boolean parameter - if it's true, assets with hidden: true will be returned.
  withHidden?: boolean;
  // userIp (optional): string representing an IP address.
  // The assets field in the response will include only the assets available in the geolocation associated with the provided IP.
  useIp?: boolean;
}

export interface RampGetAssetsData {
  assets: RampAssetInfo[];
  currencyCode: string;
  enabledFeatures: any[];
  maxFeePercent: number;
  maxPurchaseAmount: number;
  minFeeAmount: number;
  minFeePercent: number;
  minPurchaseAmount: number;
}

export interface RampAssetInfo {
  // Token contract address, if applicable (if the asset is not the chain native asset)
  address?: string | null;
  // Asset chain, e.g. ETH, POLKADOT, RONIN
  chain: string;
  currencyCode: string;
  // Number of decimal places to convert units to whole coins
  decimals: number;
  enabled: boolean;
  hidden: boolean;
  logoUrl: string;
  // Asset-specific purchase limits, -1 means unlimited (global limits are used)
  maxPurchaseAmount: number;
  minPurchaseAmount: number;
  minPurchaseCryptoAmount: string; // in wei/units
  // Asset descriptive name, e.g. Ethereum
  name: string;
  // Network fee for the asset added on top of Ramp's fee
  networkFee?: number;
  // Price of a single whole asset unit (1 ETH/DAI/...) per currency code
  price: {[key: string]: number};
  // Asset symbol, e.g. ETH, DAI, BTC
  symbol: string;
  // Asset type -- NATIVE for native assets (e.g. ETH, BTC, ELROND), or a token standard (e.g. ERC20)
  type: string;
}

enum RampPaymentMethodName {
  MANUAL_BANK_TRANSFER = 'MANUAL_BANK_TRANSFER',
  AUTO_BANK_TRANSFER = 'AUTO_BANK_TRANSFER',
  CARD_PAYMENT = 'CARD_PAYMENT',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
  PIX = 'PIX',
  OPEN_BANKING = 'OPEN_BANKING', // PISP
}

export interface RampQuoteResultForPaymentMethod {
  appliedFee: number; // final fee the user pays (included in fiatValue), in fiatCurrency
  baseRampFee: number; // base Ramp fee before any modifications, in fiatCurrency
  cryptoAmount: string; // number-string, in wei or token units
  fiatCurrency: string; // three-letter currency code
  fiatValue: number; // total value the user pays for the purchase, in fiatCurrency
}

type RampFlow = 'OFFRAMP' | 'ONRAMP';

export type RampPaymentMethodType =
  | 'MANUAL_BANK_TRANSFER' // SEPA
  | 'AUTO_BANK_TRANSFER' // PISP
  | 'CARD_PAYMENT' // debit and credit
  | 'APPLE_PAY'
  | 'GOOGLE_PAY'
  | 'PIX';

export interface RampPaymentUrlConfigParams {
  env: 'sandbox' | 'production';
  flow?: 'buy' | 'sell'; // Default: buy
  hostLogoUrl: string;
  hostAppName: string;
  swapAsset?: string; // E.g. MATIC_*,ETH_DAI,ETH_USDC,ETH_USDS,ETH_USDT
  offrampAsset?: string; // E.g. MATIC_*,ETH_DAI,ETH_USDC,ETH_USDS,ETH_USDT
  // swapAmount(number): the amount should be provided in wei or token units. You can block editing value of the transaction by providing swapAmount and single swapAsset parameters e.g. https://buy.ramp.network/?swapAmount=100000000000000000&swapAsset=ETH for 0.1 ETH
  swapAmount?: string | number;
  // fiatCurrency (string) and fiatValue (int): are two optional parameters that allow you to pre-set the total fiat value of the purchase that will be suggested to the user. They have to be used together as they don't work separately.
  fiatCurrency?: string;
  fiatValue?: number;
  enabledFlows: RampFlow[] | RampFlow;
  defaultFlow: RampFlow;
  // userAddress: An optional string parameter that pre-sets the address the crypto will be sent to. For off-ramp, will be treated as a source address from which the crypto will be sent from.
  userAddress?: string;
  userEmailAddress?: string;
  selectedCountryCode: string;
  defaultAsset: string;
  finalUrl?: string; // On-ramp param to return to the app
  useSendCryptoCallback?: boolean; // Off-ramp param to show wallet button in checkout page
  // paymentMethodType: ON-ramp only. An optional string parameter that pre-selects payment method for your user to make their onramping experience even quicker.
  paymentMethodType?: RampPaymentMethodType;
  // hideExitButton: An optional boolean parameter to show or hide internal exit button on widget.
  hideExitButton?: boolean;
  variant?: string;
  useSendCryptoCallbackVersion?: number;
}

export interface RampGetSellSignedPaymentUrlData {
  urlWithSignature: string;
}

export interface BuyCryptoLimits {
  min?: number;
  max?: number;
}

export interface MoonpayPaymentData {
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
  transaction_id?: string; // id form moonpay
}

export interface MoonpayIncomingData {
  externalId: string;
  transactionId?: string;
  status?: string;
}
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
  asset: AssetInfo;
  [RampPaymentMethodName.MANUAL_BANK_TRANSFER]: RampQuoteResultForPaymentMethod;
  [RampPaymentMethodName.AUTO_BANK_TRANSFER]: RampQuoteResultForPaymentMethod;
  [RampPaymentMethodName.CARD_PAYMENT]: RampQuoteResultForPaymentMethod;
  [RampPaymentMethodName.APPLE_PAY]: RampQuoteResultForPaymentMethod;
}

export interface RampGetAssetsRequestData {
  env: 'sandbox' | 'production';
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
  assets: AssetInfo[];
  currencyCode: string;
  enabledFeatures: any[];
  maxFeePercent: number;
  maxPurchaseAmount: number;
  minFeeAmount: number;
  minFeePercent: number;
  minPurchaseAmount: number;
}

interface AssetInfo {
  // Token contract address, if applicable (if the asset is not the chain native asset)
  address?: string;
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
  networkFee: number;
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
}

export interface RampQuoteResultForPaymentMethod {
  appliedFee: number; // final fee the user pays (included in fiatValue), in fiatCurrency
  baseRampFee: number; // base Ramp fee before any modifications, in fiatCurrency
  cryptoAmount: string; // number-string, in wei or token units
  fiatCurrency: string; // three-letter currency code
  fiatValue: number; // total value the user pays for the purchase, in fiatCurrency
}

export interface RampPaymentUrlConfigParams {
  env: 'sandbox' | 'production';
  hostLogoUrl: string;
  hostAppName: string;
  swapAsset: string; // E.g. MATIC_*,ETH_DAI,ETH_USDC,ETH_USDS,ETH_USDT
  // swapAmount(number): the amount should be provided in wei or token units. You can block editing value of the transaction by providing swapAmount and single swapAsset parameters e.g. https://buy.ramp.network/?swapAmount=100000000000000000&swapAsset=ETH for 0.1 ETH
  swapAmount: string | number;
  // fiatCurrency (string) and fiatValue (int): are two optional parameters that allow you to pre-set the total fiat value of the purchase that will be suggested to the user. They have to be used together as they don't work separately.
  fiatCurrency?: string;
  fiatValue?: number;
  enabledFlows: string;
  defaultFlow: string;
  userAddress: string;
  userEmailAddress?: string;
  selectedCountryCode: string;
  defaultAsset: string;
  finalUrl: string;
}
export interface SimplexPaymentData {
  address: string;
  chain: string;
  created_on: number;
  crypto_amount: number;
  coin: string;
  env: 'dev' | 'prod';
  fiat_base_amount: number;
  fiat_total_amount: number;
  fiat_total_amount_currency: string;
  order_id: string;
  payment_id: string;
  status: string;
  user_id: string;
}

export interface SimplexIncomingData {
  paymentId?: string;
  success?: string;
  quoteId?: string;
  userId?: string;
}

export interface WyrePaymentData {
  orderId: string;
  env: 'dev' | 'prod';
  created_on: number;
  accountId?: string;
  blockchainNetworkTx?: string;
  createdAt?: string;
  dest?: string;
  destAmount?: string;
  destChain?: string;
  destCurrency?: string;
  fee?: number;
  fiatBaseAmount?: number;
  owner?: string;
  RamppaymentMethodName?: string;
  purchaseAmount?: any;
  sourceAmount?: string;
  sourceCurrency?: string;
  status?: string;
  transferId?: string;
  walletId?: string;
  paymentMethodName?: string;
}

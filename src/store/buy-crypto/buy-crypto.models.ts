export interface BuyCryptoLimits {
  min?: number;
  max?: number;
}

export type BanxaStatusKey =
  | 'paymentRequestSent'
  | 'pending'
  | 'pendingPayment'
  | 'waitingPayment'
  | 'paymentReceived'
  | 'inProgress'
  | 'coinTransferred'
  | 'cancelled'
  | 'declined'
  | 'expired'
  | 'failed'
  | 'complete'
  | 'refunded';

export interface BanxaPaymentData {
  address: string;
  chain: string;
  created_on: number;
  crypto_amount: number;
  coin: string;
  env: 'dev' | 'prod';
  fiat_base_amount: number;
  fiat_total_amount: number;
  fiat_total_amount_currency: string;
  order_id: string; // order id provided by Banxa
  external_id: string; // bitpay-app custom id
  status: BanxaStatusKey;
  user_id: string;
  transaction_id?: string;
  ref?: number; // Reference number for order
}

export interface BanxaIncomingData {
  banxaExternalId: string;
  banxaOrderId?: string;
  walletId?: string;
  status?: BanxaStatusKey;
  cryptoAmount?: number;
  fiatTotalAmount?: number;
  fiatBaseAmount?: number;
  coin?: string;
  chain?: string;
  fiatTotalAmountCurrency?: string;
  ref?: number;
  transactionId?: string;
}

export interface BanxaErrorResponse {
  errors: {
    status: number;
    code: number;
    title: string;
  }[];
}

export interface BanxaGetPaymentMethodsRequestData {
  env: 'sandbox' | 'production';
  source: string;
  target: string;
}

export interface BanxaPaymentMethod {
  id: number;
  paymentType: string;
  name: string;
  description: string;
  logo_url: string;
  status: string;
  supported_agents: any;
  type: string;
  supported_fiat: string[];
  supported_coin: string[];
  transaction_fees: {
    fiat_code: string;
    coin_code: string;
    fees: {
      name: string;
      amount: number;
      type: string;
    }[];
  }[];
  transaction_limits: {
    fiat_code: string;
    min: string;
    max: string;
    weekly: string;
  }[];
}

export interface BanxaPaymentMethodsData {
  data: {
    payment_methods: BanxaPaymentMethod[];
  };
  errors?: BanxaErrorResponse;
  error?: any;
  message?: any;
}

export type BanxaBlockchainKey =
  | 'BTC'
  | 'DOGE'
  | 'ETH'
  | 'LTC'
  | 'MATIC'
  | 'XRP';
export interface BanxaGetQuoteRequestData {
  env: 'sandbox' | 'production';
  source: string;
  target: string;
  source_amount?: number;
  target_amount?: number; // Do not include if source_amount is defined
  payment_method_id?: number;
  account_reference?: string;
  blockchain?: BanxaBlockchainKey;
}

export interface BanxaQuoteData {
  data: {
    spot_price: string;
    prices: {
      payment_method_id: number;
      type: string;
      spot_price_fee: string;
      spot_price_including_fee: string;
      coin_amount: string;
      coin_code: string;
      fiat_amount: string;
      fiat_code: string;
      fee_amount: string;
      network_fee: string;
    }[];
  };
  errors?: BanxaErrorResponse;
  error?: any;
  message?: any;
}

export interface BanxaCreateOrderRequestData {
  env: 'sandbox' | 'production';
  // required: Unique customer reference provided by you. Used to check whether customer has completed KYC.
  account_reference: string;
  // Payment method ID associated with the order.
  payment_method_id?: number;
  // required: Source currency or cryptocurrency code. This parameter indicates whether the order is a buy or a sell cryptocurrency order.
  source: string;
  // Source amount
  source_amount: string;
  // required: Target currency or cryptocurrency code. This parameter indicates whether the order is a buy or a sell cryptocurrency order.
  target: string;
  // Target amount. This will be overridden if a source_amount is also passed.
  target_amount?: string;
  // required: Wallet address to receive cryptocurrency. Should be sent for buy cryptocurrency orders only.
  wallet_address: string;
  // required?: Wallet tag or memo associated with the wallet address. Should be sent for buy cryptocurrency orders only. This is required when the Customer's wallet address has a Memo or Tag such as BNB (Memo) and XRP (Tag).
  wallet_address_tag?: string;
  // Blockchain network code. If not provided, the default blockchain configured for the cryptocurrency will be used. Refer to the Get Crypto Currencies endpoint to retrieve a list of supported blockchain network codes.
  blockchain?: string;
  // required: Return URL when the customer has completed the checkout process.
  return_url_on_success: string;
  // Return URL when the customer cancels the checkout process.
  return_url_on_cancelled?: string;
  // Return URL when the customer fails to complete the checkout process.
  return_url_on_failure?: string;
  // Free form string that you can use to send us any information that will be returned in the Get Orders endpoint
  meta_data?: string;
  // Refund wallet address. Should be sent for sell cryptocurrency orders only. Used in the event in the event that a refund is necessary and the transferred coins need to be returned.
  refund_address?: string;
  // Refund wallet address tag or memo. Should be sent for sell cryptocurrency orders only. This is required when the Customer's wallet address has a Memo or Tag such as BNB (Memo) and XRP (Tag).
  refund_address_tag?: string;
  // Source wallet address. Should be sent for sell cryptocurrency orders only.
  source_address?: string;
  // Source wallet address tag or memo. Should be sent for sell cryptocurrency orders only. Required when source wallet address for BNB (Memo) or XRP (Tag).
  source_address_tag?: string;
  // Customer's email address. This will pre-populate the customers' email address field when they are redirected to Banxa checkout
  email?: string;
  // Customer's mobile number. This will pre-populate the customers' mobile number field when they are redirected to Banxa checkout
  mobile?: string;
}

export interface BanxaOrderData {
  account_id: string;
  account_reference: string;
  blockchain: {
    code: string;
    description: string;
    id: number;
  };
  checkout_url: string;
  coin_code: string;
  country: string;
  created_at: string;
  fiat_amount: number;
  fiat_code: string;
  id: string;
  order_type: string;
  payment_code: string;
  payment_id: number;
  wallet_address: string;

  // Order details properties
  coin_amount?: number;
  commission?: number;
  completed_at?: string | null;
  created_date?: string;
  fee?: number;
  fee_tax?: number;
  merchant_commission?: number;
  merchant_fee?: number;
  meta_data?: string | null;
  network_fee?: number;
  payment_fee?: number;
  payment_fee_tax?: number;
  payment_type?: string;
  ref?: number;
  status?: BanxaStatusKey;
  tx_confirms?: number;
  tx_hash?: string | null;
  wallet_address_tag?: string | null;
}

export interface BanxaCreateOrderData {
  data: {
    order: BanxaOrderData;
  };
  errors?: BanxaErrorResponse;
  error?: any;
  message?: any;
}

export interface BanxaGetOrderDetailsRequestData {
  env: 'sandbox' | 'production';
  order_id: string;
  fx_currency?: string;
}

export interface BanxaOrderDetailsData {
  data: {
    order: BanxaOrderData;
  };
  errors?: BanxaErrorResponse;
  error?: any;
  message?: any;
}

export interface MoonpayGetCurrencyLimitsRequestData {
  env: 'sandbox' | 'production';
  currencyAbbreviation: string;
  baseCurrencyCode: string;
  areFeesIncluded?: boolean;
  paymentMethod?: string;
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

export interface SardineGetAuthTokenRequestData {
  env: 'sandbox' | 'production';
  // Unique id representing a new session, must be regenerated for each call
  referenceId: string;
  // An ID generated by the merchant to uniquely identity a user
  externalUserId: string;
  // An ID for tracking between the different origins of purchases
  customerId: 'app' | 'web';
  paymentMethodTypeConfig: {
    default: SardinePaymentType;
    enabled: SardinePaymentType[];
  };
}

export type SardinePaymentType =
  | 'ach'
  | 'debit'
  | 'credit'
  | 'card'
  | 'us_credit'
  | 'us_debit'
  | 'international_debit'
  | 'international_credit';

export interface SardineGetQuoteRequestData {
  env: 'sandbox' | 'production';
  // asset_type: Cryptocurrency asset user wants to purchase
  asset_type: string;
  // network: Blockchain on which the asset_type is present
  network: string;
  // total: Amount the user wants to buy or sell.
  total: string;
  // currency: The currency type in which the quote is supplied (Default:USD - Example:USD,CAD)
  currency: string;
  // paymentType: The payment method that the user will use for the transaction
  paymentType: SardinePaymentType;
  // Select for the required activity buy for on ramp and sell for off ramp
  quote_type: 'buy' | 'sell';
}

export interface SardineGetOrderDetailsRequestData {
  env: 'sandbox' | 'production';
  orderId?: string;
  externalUserId?: string;
  referenceId?: string;
  startDate?: string; // in YYYY-MM-DD format
  endDate?: string; // in YYYY-MM-DD format
  limit?: string;
}

export interface SardinePaymentData {
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
  order_id?: string;
  transaction_id?: string;
}

export interface SardineIncomingData {
  sardineExternalId: string;
  walletId?: string;
  status?: string;
  cryptoAmount?: number;
  transactionId?: string;
  order_id?: string; // added by Sardine
}

export interface SardinePaymentUrlConfigParams {
  env: 'sandbox' | 'production';
  // Authorized token obtained
  client_token: string; //required
  // Wallet address in which the crypto will be deposited. If passed, then the screen that asks for wallet address from the user will be skipped
  address?: string;
  // Url can be set that will be called upon finishing the transaction flow. An order_id will be appended to the url
  // Example: https://your-domain-here.com?order_id=xyz-wesdads
  redirect_url?: string;
  // Amount of fiat which is to be converted into crypto (in major units like $)
  // Example: 100
  fiat_amount?: number;
  // Similar to what fiat_amount, except the user is not able to edit the value of amount in the checkout
  fixed_fiat_amount?: number;
  // Currency type the transaction will take place in (uppercase letters). Set to USD by default. Example: USD
  fiat_currency?: string;
  // Similar to fiat_currency, except the user is not able to edit the value of currency in the checkout
  fixed_fiat_currency?: string;
  // Digital token being purchased. If this field is specified, then asssociated network is required as well.
  asset_type?: string;
  // Similar to asset_type, except the user is not able to edit the crypto in the checkout. Replaces asset_type as a parameter
  // Example: ETH
  fixed_asset_type?: string;
  // Blockchain on which the transaction will take place. Must be specified if asset_type is passed
  // Example: ethereum
  network?: string;
  // Similar to network, except the user is not able to edit the value of the blockchain in the checkout. Must be passed along with fixed_asset_type and replaces network as a parameter. Contact Sardine if you want to fix networks in the backend.
  fixed_network?: string;
  // UUID for the user session, which is also passed to the embedded device SDK
  parent_session_key?: string;
  // List of assets and networks that users can interact with. The full list of supported tokens/network can be obtained from the /supported-tokens endpoint
  // Example: [{"token":"eth","network":"ethereum"}]
  supported_tokens?: {token: string; network: string}[];
}

export interface SimplexGetQuoteRequestData {
  digital_currency: string;
  fiat_currency: string;
  requested_currency: string;
  requested_amount: number;
  end_user_id: string;
  env: 'sandbox' | 'production';
  payment_methods?: string[];
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

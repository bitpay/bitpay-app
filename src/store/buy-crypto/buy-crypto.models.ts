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

export interface BanxaGetQuoteRequestData {
  env: 'sandbox' | 'production';
  source: string;
  target: string;
  source_amount?: number;
  target_amount?: number; // Do not include if source_amount is defined
  payment_method_id?: number;
  account_reference?: string;
  blockchain?: string;
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

export interface MoonpayGetCurrenciesRequestData {
  env: 'sandbox' | 'production';
}

export interface MoonpayGetCurrencyLimitsRequestData {
  env: 'sandbox' | 'production';
  currencyAbbreviation: string;
  baseCurrencyCode: string;
  areFeesIncluded?: boolean;
  paymentMethod?: string;
}

export type MoonpayPaymentType =
  | 'venmo'
  | 'paypal'
  | 'mobile_wallet' // applePay
  | 'sepa_bank_transfer'
  | 'credit_debit_card';

export interface MoonpayGetSignedPaymentUrlReqData {
  env: 'sandbox' | 'production';
  currencyCode: string;
  walletAddress: string;
  baseCurrencyCode: string;
  baseCurrencyAmount: number;
  externalTransactionId: string;
  redirectURL: string;
  lockAmount: boolean;
  showWalletAddressForm: boolean;
  paymentMethod?: MoonpayPaymentType;
}

export interface MoonpayGetSignedPaymentUrlData {
  urlWithSignature: string;
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
  | 'apple_pay'
  | 'debit'
  | 'credit'
  | 'card'
  | 'us_credit'
  | 'us_debit'
  | 'international_debit'
  | 'international_credit'
  | 'sepa';

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
  address: string | undefined;
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
  status: 'paymentRequestSent' | 'paymentSentToSimplex' | 'success' | 'failed';
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

export interface TransakPaymentData {
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
  status: TransakStatusKey;
  user_id: string;
  order_id?: string;
  transaction_id?: string;
}

export interface TransakIncomingData {
  transakExternalId: string; // bitpay-app custom id
  walletId?: string;
  status?: TransakStatusKey;
  cryptoAmount?: number;
  transactionId?: string;
  order_id?: string; // added by Transak
  fiatTotalAmount?: number;
  fiatBaseAmount?: number;
  coin?: string;
  chain?: string;
  fiatTotalAmountCurrency?: string;
}

export type TransakPaymentType =
  | 'apple_pay'
  | 'credit_debit_card'
  | 'gbp_bank_transfer'
  | 'google_pay'
  | 'inr_bank_transfer'
  | 'inr_upi'
  | 'pm_astropay'
  | 'pm_bpi'
  | 'pm_cash_app'
  | 'pm_gcash'
  | 'pm_grabpay'
  | 'pm_jwire'
  | 'pm_open_banking'
  | 'pm_paymaya'
  | 'pm_pix'
  | 'pm_shopeepay'
  | 'pm_ubp'
  | 'sepa_bank_transfer';

export interface TransakPaymentOption {
  name: string;
  id: TransakPaymentType;
  displayText: boolean;
  processingTime: string;
  icon: string;
  dailyLimit: number;
  limitCurrency: string;
  maxAmount: number;
  minAmount: number;
  isActive: boolean;
  defaultAmount: number;
  isConverted: boolean;
  isPayOutAllowed: boolean;
  minAmountForPayOut: number | null;
  maxAmountForPayOut: number | null;
  defaultAmountForPayOut: number | null;
  provider?: string;
  isBillingAddressRequired?: boolean;
  supportedCountryCode?: string[];
  displayMessage?: string;
}

export interface TransakFiatCurrency {
  symbol: string;
  supportingCountries: string[];
  logoSymbol: string;
  name: string;
  paymentOptions: TransakPaymentOption[];
  isPopular: boolean;
  isAllowed: boolean;
  roundOff: number;
  icon: string;
  isPayOutAllowed: boolean;
  defaultCountryForNFT: string;
}
export interface TransakFiatCurrenciesData {
  response: TransakFiatCurrency[];
}

export interface TransakGetQuoteRequestData {
  env: 'sandbox' | 'production';
  fiatCurrency: string;
  cryptoCurrency: string;
  network: string;
  paymentMethod: TransakPaymentType;
  fiatAmount: number;
  cryptoAmount?: number;
}

export interface TransakQuoteData {
  response: {
    conversionPrice: number;
    cryptoAmount: number;
    cryptoCurrency: string;
    cryptoLiquidityProvider?: string;
    feeBreakdown: {
      id: string;
      ids: string[];
      name: string;
      value: number;
    }[];
    feeDecimal: number;
    fiatAmount: number;
    fiatCurrency: string;
    isBuyOrSell: string;
    marketConversionPrice: number;
    network: string;
    nonce: number;
    notes?: string[];
    paymentMethod: TransakPaymentType;
    quoteId: string;
    slippage: number;
    totalFee: number;
  };
  errors?: any;
  error?: any;
  message?: any;
}

export interface TransakGetSignedUrlRequestData {
  env: 'sandbox' | 'production';
  // Eg: Buy Crypto
  // To change the exchange screen title. Title cannot be changed if both on ramp and off ramp product are being used. Can only be changed for either on ramp or off ramp.	Look & feel
  exchangeScreenTitle: string;
  // Eg: 1100
  // An integer amount representing how much the customer wants to spend/receive. Users can't change the fiat amount if this is passed.
  // This parameter will be skipped if fiatCurrency or countryCode is not passed.	Order Data
  fiatAmount: number;
  // Eg: GBP
  // The code of the fiat currency you want the customer to buy/sell cryptocurrency. If the fiat currency is not supported by a specific product type (BUY/SELL) then the default widget will load with all the supported fiat currencies for that product type.	Order Data
  fiatCurrency: string;
  // Eg: ethereum
  // Crypto network that you would allow your customers to buy. You can get the supporting networks by opening http://global.transak.com and then go to cryptocurrencies select screen. Only the cryptocurrencies supported by this network for the specific product type (BUY/SELL) will be shown in the widget. If the network selected is not supported by a product type (BUY/SELL) then the default widget will all supported networks will be shown.
  // This parameter will be skipped if networks is passed.	Advanced, Order Data
  network: string | undefined;
  // Eg: credit_debit_card
  // The payment method you want to show to the customer while buying/selling. If you pass this param, then the payment method will be selected by default and the customer won't be able to select another payment method.	Order Data
  paymentMethod?: string;
  // Eg: DAI
  // ETH	The code of the cryptocurrency you want the customer to buy/sell. If you pass this param, the crypto currency will be selected by default and the customer won't be able to select another crypto currency. Please ensure that the currency code passed by you is available for the specific product type (BUY/SELL). In case the value is not part of our crypto coverage for BUY/SELL then it will not be honored wherever it is not present and users will see the default widget with all the supported cryptocurrencies. Ex: If cryptoCurrencyCode=DAI and DAI is live for BUY and not for SELL, then users would see only DAI for BUY but all the supported cryptocurrencies for SELL. You can find the list of supported cryptocurrencies here.	Order Data
  cryptoCurrencyCode: string;
  // Eg: ETH,DAI,USDT
  // A comma-separated list of cryptoCurrencies that you would allow your customers to buy/sell. Only these crypto currencies will be shown in the widget. This will be a string of comma separated values each of which will represent a valid cryptoCurrency code. Please ensure that the crypto currency codes passed in the list are available for the specific product type (BUY/SELL). If even one of the crypto currency codes in the list is supported by the specific product type (BUY/SELL), then it will be honored, otherwise the default widget will load for the product type for which none of the crypto currency codes are supported.
  // This parameter will be skipped if cryptoCurrencyCode is passed.	Advanced, Order Data
  cryptoCurrencyList: string;
  // Eg: true	boolean	false	When true, then the customer will not see the home screen (exchange screen). This will hide the exchange screen completely, and the customer won't be able to change the payment method, cryptocurrency, fiat amount, fiat currency and network.
  // BUY: This parameter will be skipped if productsAvailed, fiatAmount, fiatCurrency, network, paymentMethod and cryptoCurrencyCode are not passed.	Look & Feel
  hideExchangeScreen: boolean;
  // Eg: 0x86349020e939 4b2BE1b1262531B 0C3335fc32F20
  // The blockchain address of the user's wallet that the purchased cryptocurrency will be sent to. Users will be able to edit the wallet address.The wallet address needs to be valid for the cryptocurrency and blockchain network so to make sure this works you should pass cryptoCurrencyCode or network.	Order Data
  walletAddress: string;
  // Eg: true	boolean	false	When true, the customer will not be able to change the destination address of where the cryptocurrency is sent to.
  // This parameter will be skipped if walletAddress or walletAddressesData is not passed.	Advanced, Look & feel
  disableWalletAddressForm: boolean;
  // Eg: 000000
  // The theme color code for the widget main color. It is used for buttons, links and highlighted text. Only hexadecimal codes are accepted.	Look & feel
  themeColor: string;
  // Eg: true	boolean	false	When true, then the customer will not see the menu options. This will hide the menu completely.	Look & feel
  hideMenu: boolean;
  // Eg: https://google.com
  // Transak will redirect back to this URL with additional order info appended to the url as parameters, once the customer has completed their purchase/sell process. Detailed explanation here. Please pass a valid URL otherwise it will not work.
  // Note: Please encode this param if it contains any special characters before passing it to query parameters. Otherwise, it will not be considered.
  // Also If you pass http://localhost url, it wont work.
  // Eg:
  // https://bitcoin.com ==> Works
  // https://bitcoin+satoshi.com ==> will not work.	Advanced
  redirectURL: string;
  // Eg: 5e2f559511a9de
  // An order ID that will be used to identify the transaction once a webhook is called back to your app. This can be your identifier to track your customers.	Advanced
  partnerOrderId: string;
  // Eg: 23487492
  // A customer ID that will be used to identify the customer that made the transaction once a webhook is called back to your app.	Advanced
  partnerCustomerId: string;
  // Eg: STAGING
  // PRODUCTION	To differentiate between STAGING environment and PRODUCTION environment.
  // Note: This param will only work with our JS SDK integration method.	Basic
  environment?: string;
  // Eg: 100%
  // 100%	Height of the widget iFrame.
  // Note: This param will only work with our JS SDK integration method.	Look & feel
  widgetHeight?: string;
  // Eg: 100%
  // 100%	Width of the widget iFrame.
  // Note: This param will only work with our SDK integration method.	Look & feel
  widgetWidth?: string;
  // Eg: BUY
  // A string representing the services to be availed and returns the exchange screen accordingly. If only BUY is passed, then users will see the on ramp widget only. If SELL is passed then users will see the off ramp widget only. Only if BUY,SELL is passed, the users will see both the widgets. If BUY,SELL is passed then users will see BUY widget first. Conversely, if SELL,BUY is passed, then users will see the SELL widget first.
  // Note: If SELL is not enabled by you from your partner portal, then this query param will not be honored and users will see the BUY widget only.	Look & feel
  productsAvailed?: string;
  // Eg: 1100
  // An integer amount representing how much the customer wants to spend/receive. Users can change the fiat amount if this is passed.
  // This parameter will be skipped if fiatCurrency or countryCode is not passed.
  // This parameter will be skipped if fiatAmount is passed.	Order Data
  defaultFiatAmount?: number;
  // Eg: IN
  // The country's https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2. The fiat currency will be displayed as per the country code. If the country code is not supported by a specific product type (BUY/SELL) then the default widget will load with all the supported countries for that product type.
  // This parameter will be skipped if fiatCurrency is passed.	Order Data
  countryCode?: string;
  // Eg: GBP,EUR
  // The fiat currencies passed as comma separated values here will not be shown in the fiat currencies drop down on the widget.
  // This parameter will be skipped if fiatCurrency is passed.
  // This parameter will be skipped if countryCode is passed.	Order Data
  excludeFiatCurrencies?: string;
  // Eg: polygon
  // The default network you would prefer the customer to purchase/sell on. If you pass this param, the network will be selected by default, but the customer will still be able to select another network. If the default network selected is not supported by a product type (BUY/SELL) then the default widget with all supported networks will be shown.	Order Data
  defaultNetwork?: string;
  // Eg: ethereum,polygon,terra,mainnet
  // A comma-separated list of crypto networks that you would allow your customers to buy/sell. Only these networks' cryptocurrencies will be shown in the widget. This will be a string of comma-separated values each of which will represent a valid network name. You can get the supporting networks by opening http://global.transak.com and then go to cryptocurrencies select screen. If even one of the networks in the list is supported by the specific product type (BUY/SELL), then it will be honored, otherwise the default widget with all the supported networks will load for the product type for which none of the networks are supported.	Advanced, Order Data
  networks?: string;
  // Eg: credit_debit_card
  // The default payment method you would prefer the customer to buy/sell with. If you pass this param, the payment method will be selected by default and the customer can also select another payment method.
  // This parameter will be skipped if paymentMethod is passed.	Order Data
  defaultPaymentMethod?: string;
  // Eg: gbp_bank_transfer, sepa_bank_transfer
  // A comma-separated list of payment methods you want to disable and hide from the customers.	Order Data
  disablePaymentMethods?: string;
  // Eg: 1
  // An integer amount representing how much crypto the customer wants to buy/sell. If this param is not supported by a specific product type (BUY/SELL) then the query param will not be honored for that product type.
  // This parameter will be skipped if cryptoCurrencyCode is not passed.
  // This parameter will be skipped if a valid combination of fiatCurrency and defaultFiatAmount is passed.
  // This parameter will be skipped if a valid combination of fiatCurrency and fiatAmount is passed.
  // Note: Please ensure the defaultCryptoAmount is within our min and max limit for the cryptoCurrencyCode. You can check whether the crypto amount is within permissible limits by going to http://global.transak.com.	Order Data
  defaultCryptoAmount?: number;
  // SELL	0.5678
  // An integer amount representing how much crypto the customer wants to sell. Users cannot change the crypto amount if this is passed.	Order Data
  cryptoAmount?: number;
  // Eg: DAI
  // The default cryptocurrency you would prefer the customer to buy/sell. If you pass this param, the currency will be selected by default, but the customer will still be able to select another cryptocurrency. Please ensure that the currency code passed by you is available for the specific product type (BUY/SELL). If you pass a value that is not supported by BUY/SELL, then the default widget will load.
  // This parameter will be skipped if cryptoCurrencyCode is passed.	Order Data
  defaultCryptoCurrency?: string;
  // Eg: true	boolean	false	When true, then the customer will not see our fee breakdown. The customer will only see the total fee. This parameter will be ignored if your fee (on top of us) is more than 1%.	Advanced, Look & feel
  isFeeCalculationHidden?: boolean;
  // Here you can pass multiple wallet addresses of the different cryptocurrencies & networks in the JSON object format. Use this query parameter if you are allowing multiple options to your users to buy a cryptocurrency. If you pass the valid wallet addresses, the customer won't be prompted to enter one.
  // This parameter will be skipped if walletAddress is passed.	Advanced, Order Data
  walletAddressesData?: any;
  // Eg: user@mail.com
  // The email that will be used to identify your customer and their order (usually the email that they registered with your app).
  // Note: Please encode the email if it contains any special characters before passing it to query parameters. Otherwise, it will not be considered.
  // satoshi@bitcoin.com ==> Works
  // satoshi+1@bitcoin.com ==> will not work.	KYC
  email?: string;
  // Here you can pass your user's data like their name, address, date of birth in the object format. If you will pass all the basic user's data, the customer won't be prompted to enter it.	Advanced, KYC
  userData?: any;
  // Eg: true
  // When true, then the email address will be auto-filled, but the screen will not be skipped. User can edit their email address, basic data like first name & the address. This parameter will be ignored if email or userData are not passed.	Advanced, Look & feel
  isAutoFillUserData?: boolean;
}

export interface TransakSignedUrlData {
  urlWithSignature: string;
}

export interface TransakGetOrderDetailsRequestData {
  env: 'sandbox' | 'production';
  orderId: string;
}

export type TransakStatusKey =
  | 'paymentRequestSent'
  | 'pending'
  | 'AWAITING_PAYMENT_FROM_USER'
  | 'PAYMENT_DONE_MARKED_BY_USER'
  | 'PROCESSING'
  | 'PENDING_DELIVERY_FROM_TRANSAK'
  | 'ON_HOLD_PENDING_DELIVERY_FROM_TRANSAK'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REFUNDED'
  | 'EXPIRED';

export interface TransakOrderDetailsData {
  meta: {
    orderId: string;
  };
  data: {
    addressAdditionalData: boolean;
    amountPaid: number;
    appVersionName: string;
    autoExpiresAt: string;
    cardPaymentData: {
      liquidityProvider: string;
      orderId: string;
      paymentId: string;
      pgData: any;
      processedOn: string;
      status: string;
      updatedAt: string;
    };
    completedAt: string;
    conversionPrice: number;
    countryCode: string;
    createdAt: string;
    cryptoAmount: number;
    cryptoCurrency: string;
    exchangeId: string;
    fiatAmount: number;
    fiatAmountInUsd: number;
    fiatCurrency: string;
    id: string;
    internalOrderStatus: string;
    isBuyOrSell: string;
    isFirstOrder: boolean;
    isZeroHashOrder: true;
    lockedPriceId: string;
    network: string;
    orderProcessingType: string;
    partnerCustomerId: string;
    partnerOrderId: string;
    paymentOptionId: string;
    paymentOptions: any[];
    quoteId: string;
    redirectURL: string;
    referenceCode: number;
    status: TransakStatusKey;
    statusHistories: {
      createdAt: string;
      isEmailSentToUser: boolean;
      message: string;
      partnerEventId: string;
      status: TransakStatusKey;
    }[];
    totalFeeInFiat: number;
    transactionHash: string;
    transactionLink: string;
    updatedAt: string;
    userKycType: string;
    walletAddress: string;
    walletLink: string;
  };
}

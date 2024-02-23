export type MoonpaySellOrderStatus =
  | 'createdOrder'
  | 'bitpayPending'
  | 'bitpayTxSent'
  | 'waitingForDeposit'
  | 'pending'
  | 'failed'
  | 'completed';

export interface MoonpaySellOrderData {
  env: 'dev' | 'prod';
  wallet_id: string;
  refund_address: string;
  address_to?: string;
  coin: string;
  chain: string;
  created_on: number;
  crypto_amount: number;
  fiat_receiving_amount: number;
  fiat_fee_amount: number;
  fiat_currency: string;
  external_id: string; // bitpay-app custom id
  status: MoonpaySellOrderStatus;
  transaction_id?: string; // id form moonpay
  send_max?: boolean;
  tx_sent_on?: number;
  tx_sent_id?: string;
  failure_reason?: string; // if status === failed
}

export interface MoonpaySellIncomingData {
  // TODO: review this
  externalId: string;
  transactionId?: string;
  status?: MoonpaySellOrderStatus;
  baseCurrencyCode?: string;
  baseCurrencyAmount?: string | number;
  fiatAmount?: number;
  fiatCurrencyCode?: string;
  totalFee?: number;
  depositWalletAddress?: string;
  txSentOn?: number;
  txSentId?: string;
  failureReason?: string;
}

export interface MoonpayCurrencyMetadata {
  chainId: string;
  coinType: string;
  contractAddress: string;
  networkCode: string;
}

export interface MoonpayCurrency {
  addressRegex: string;
  addressTagRegex: string;
  code: string;
  confirmationsRequired: number;
  createdAt: string;
  decimals: number;
  id: string;
  isSellSupported: boolean;
  isSupportedInUS: boolean;
  isSuspended: boolean;
  maxAmount: number;
  maxBuyAmount: number;
  maxSellAmount: number;
  metadata: MoonpayCurrencyMetadata;
  minAmount: number;
  minBuyAmount: number;
  minSellAmount: number;
  name: string;
  notAllowedCountries: string[];
  notAllowedUSStates: string[];
  precision: number;
  supportsAddressTag: boolean;
  supportsLiveMode: boolean;
  supportsTestMode: boolean;
  testnetAddressRegex: string;
  type: 'crypto' | 'fiat';
  updatedAt: string;
}

export type MoonpayPayoutMethodType =
  | 'ach_bank_transfer'
  | 'credit_debit_card'
  | 'sepa_bank_transfer'
  | 'gbp_bank_transfer';

export interface MoonpayGetSellQuoteRequestData {
  env: 'sandbox' | 'production';
  currencyAbbreviation: string; // crypto
  quoteCurrencyCode: string; // fiat
  baseCurrencyAmount: number;
  extraFeePercentage?: number;
  payoutMethod?: MoonpayPayoutMethodType;
}

export interface MoonpayQuoteCurrencyObject {
  code: string;
  createdAt: string;
  decimals: number;
  id: string;
  isSellSupported: boolean;
  maxAmount: number;
  maxBuyAmount: number;
  minAmount: number;
  minBuyAmount: number;
  name: string;
  precision: number;
  type: 'crypto' | 'fiat';
  updatedAt: string;
}

export interface MoonpayGetSellQuoteData {
  baseCurrency: MoonpayCurrency;
  baseCurrencyAmount: number;
  baseCurrencyCode: string;
  baseCurrencyPrice: number;
  extraFeeAmount: number;
  feeAmount: number;
  totalFee?: number; // Custom parameter to simplify the UI
  paymentMethod: MoonpayPayoutMethodType;
  quoteCurrency: MoonpayQuoteCurrencyObject;
  quoteCurrencyAmount: number;
  errors?: any;
  error?: any;
  message?: string;
}

export interface MoonpayGetSellSignedPaymentUrlRequestData {
  env: 'sandbox' | 'production';
  baseCurrencyCode: string;
  baseCurrencyAmount: number;
  externalTransactionId: string;
  redirectURL: string;
  quoteCurrencyCode: string;
  refundWalletAddress: string;
  lockAmount: boolean;
  colorCode?: string;
  theme?: 'dark' | 'light';
  language?: string;
  showWalletAddressForm?: boolean;
  unsupportedRegionRedirectUrl?: string;
  skipUnsupportedRegionScreen?: string;
}

export interface MoonpayGetSellSignedPaymentUrlData {
  urlWithSignature: string;
}

export interface MoonpayDepositWallet {
  btcLegacyAddress: string | null;
  id: string;
  createdAt: string;
  updatedAt: string;
  walletAddress: string;
  walletAddressTag: string;
  customerId: string;
  currencyId: string;
}

export interface MoonpaySellTransactionDetails {
  quoteCurrencyAmount: number;
  externalTransactionId: string;
  depositHash: string;
  confirmations: number;
  id: string;
  createdAt: string;
  updatedAt: string;
  baseCurrencyAmount: number;
  feeAmount: number;
  extraFeeAmount: number;
  flow: string;
  status: MoonpaySellOrderStatus;
  accountId: string;
  customerId: string;
  quoteCurrencyId: string;
  baseCurrencyId: string;
  eurRate: number;
  usdRate: number;
  gbpRate: number;
  depositWalletId: string;
  bankAccountId: string;
  cardId: string;
  refundWalletAddress: string;
  refundWalletAddressRequestedAt: string;
  failureReason: string;
  refundHash: string;
  widgetRedirectUrl: string;
  quoteExpiresAt: string | null;
  quoteExpiredEmailSentAt: string;
  refundApprovalStatus: string;
  cancelledById: string;
  blockedById: string;
  depositMatchedManuallyById: string;
  createdById: string;
  incomingCustomerCryptoDepositId: string;
  payoutMethod: MoonpayPayoutMethodType;
  integratedSellDepositInfo: string;
  baseCurrency: MoonpayCurrency;
  quoteCurrency: MoonpayQuoteCurrencyObject;
  depositWallet: MoonpayDepositWallet;
  externalCustomerId: string;
  stages: {
    stage: string;
    status: string;
    actions: {
      type: string;
      url: string;
    }[];
    failureReason: string;
    metaData: any[];
  }[];
  type?: string;
  message?: string;
}

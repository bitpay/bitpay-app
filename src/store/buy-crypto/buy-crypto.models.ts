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
  paymentMethodName?: string;
  purchaseAmount?: any;
  sourceAmount?: string;
  sourceCurrency?: string;
  status?: string;
  transferId?: string;
  walletId?: string;
}

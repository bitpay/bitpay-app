export interface simplexPaymentData {
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

export interface simplexIncomingData {
  paymentId?: string;
  success?: string;
  quoteId?: string;
  userId?: string;
}

export interface wyrePaymentData {
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

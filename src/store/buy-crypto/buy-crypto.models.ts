export interface simplexPaymentData {
  address: string;
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

export interface wyrePaymentData {
  accountId: string;
  blockchainNetworkTx: string;
  created_on: number;
  createdAt: number;
  dest: string;
  destAmount: number;
  destCurrency: string;
  env: 'dev' | 'prod';
  fee?: number;
  fiatBaseAmount?: number;
  owner: string;
  orderId: string;
  paymentMethodName: string;
  purchaseAmount: any;
  sourceAmount: number;
  sourceCurrency: string;
  status: string;
  transferId: string;
  walletId: string;
}

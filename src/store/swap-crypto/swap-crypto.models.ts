export interface changellyTxData {
  exchangeTxId: string;
  date: number;
  amountTo: number;
  coinTo: string;
  chainTo?: string;
  addressTo: string;
  walletIdTo: string;
  amountFrom: number;
  coinFrom: string;
  chainFrom?: string;
  refundAddress: string;
  payinAddress: string;
  payinExtraId?: string;
  totalExchangeFee: number;
  status: string;
  error?: any;
  env?: 'dev' | 'prod';
}

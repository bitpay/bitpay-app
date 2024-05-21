import {ThorswapProvider} from './models/thorswap.models';

export interface SwapCryptoLimits {
  min?: number;
  max?: number;
}
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

export interface thorswapTxData {
  orderId: string;
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
  payinAddress: string;
  payinExtraId?: string;
  totalExchangeFee: number;
  quoteId: string;
  spenderKey: ThorswapProvider;
  status: string;
  error?: any;
  env?: 'dev' | 'prod';
}

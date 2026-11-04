import {
  ThorswapProvider,
  ThorswapTrackingStatus,
} from '../swap-crypto/models/thorswap.models';
import {ChangellyCurrency} from './models/changelly.models';
import {
  MoonpaySwapStatus,
  MoonpaySwapTokenListByChain,
} from './models/moonpay-swap.models';
import {ThorswapCurrency} from './models/thorswap.models';
import {SwapCryptoConfig} from '../external-services/external-services.types';

export interface SwapCryptoLimits {
  min?: number;
  max?: number;
}

export interface SwapCryptoPrefetchedData {
  swapCryptoConfig?: SwapCryptoConfig;
  changellyRawCurrencies?: ChangellyCurrency[];
  thorswapRawCurrencies?: ThorswapCurrency[];
  moonpayRawCurrencies?: MoonpaySwapTokenListByChain;
  fetchedAt: number;
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
  isTSSWallet?: boolean;
  error?: any;
  env?: 'dev' | 'prod';
}

export interface thorswapTxData {
  orderId: string;
  txHash: string;
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
  slippage?: number;
  status: ThorswapTrackingStatus;
  isTSSWallet?: boolean;
  error?: any;
  env?: 'dev' | 'prod';
}

export interface moonpaySwapTxData {
  txId: string; // swaps.xyz transaction id
  txHash: string;
  dstTxHash?: string;
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
  totalExchangeFee: number; // in coinFrom
  slippage?: number;
  status: MoonpaySwapStatus;
  isTSSWallet?: boolean;
  error?: any;
  env?: 'dev' | 'prod';
}

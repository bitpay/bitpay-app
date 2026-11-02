// MoonPay swaps are served by the swaps.xyz API (https://docs.swaps.xyz)

export type MoonpaySwapEnv = 'sandbox' | 'production';

export type MoonpaySwapVmId =
  | 'evm'
  | 'solana'
  | 'alt-vm'
  | 'hypercore'
  | 'tron'
  | 'ton';

export type MoonpaySwapDirection = 'exact-amount-in' | 'exact-amount-out';

export interface MoonpaySwapToken {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
  logo?: string | null;
}

export interface MoonpaySwapTokenListRequestData {
  env: MoonpaySwapEnv;
  chainId?: number;
}

// getTokenList without chainId returns every chain keyed by chainId
export type MoonpaySwapTokenListByChain = {
  [chainId: string]: {tokens: MoonpaySwapToken[]};
};

export interface MoonpaySwapPaymentData extends MoonpaySwapToken {
  amount: string;
  usdAmount?: number;
}

export interface MoonpaySwapPathsRequestData {
  env: MoonpaySwapEnv;
  srcChainId: number;
  srcToken: string;
  dstChainId?: number;
  dstToken?: string;
}

export interface MoonpaySwapPathsData {
  srcChainId: number;
  srcToken: MoonpaySwapToken & {
    minAmount?: string | null;
    maxAmount?: string | null;
  };
  paths: {
    chainId: number;
    tokens: string | MoonpaySwapToken[];
    supportsExactAmountIn?: boolean;
    supportsExactAmountOut?: boolean;
  }[];
  error?: MoonpaySwapError;
}

export interface MoonpaySwapQuoteRequestData {
  env: MoonpaySwapEnv;
  srcChainId: number;
  srcToken: string;
  dstChainId: number;
  dstToken: string;
  amount: string;
  swapDirection: MoonpaySwapDirection;
  slippage?: number;
  returnDepositAddress?: boolean;
  refundTo?: string;
}

export interface MoonpaySwapActionRequestData
  extends MoonpaySwapQuoteRequestData {
  sender: string;
  recipient?: string;
  slippage: number;
}

export interface MoonpaySwapError {
  code: string;
  name?: string;
  message: string;
  title?: string;
  statusCode?: number;
  details?: {
    minAmount?: number;
    maxAmount?: number;
    [key: string]: any;
  };
}

export interface MoonpaySwapQuoteData {
  vmId: MoonpaySwapVmId;
  amountIn: MoonpaySwapPaymentData;
  amountInMax: MoonpaySwapPaymentData;
  amountOut: MoonpaySwapPaymentData;
  amountOutMin: MoonpaySwapPaymentData;
  protocolFee: MoonpaySwapPaymentData;
  applicationFee: MoonpaySwapPaymentData;
  bridgeFee?: MoonpaySwapPaymentData;
  exchangeRate: number;
  estimatedTxTime: number; // seconds
  estimatedPriceImpact: number | null;
  requiresTokenApproval: boolean;
  requiresRegisterTransaction: boolean;
  success?: boolean;
  error?: MoonpaySwapError;
}

export interface MoonpaySwapEvmTransaction {
  to: string;
  data: string;
  value: string;
  chainId?: number;
}

// Deposit flow (alt-vm chains, and any chain requested with returnDepositAddress)
export interface MoonpaySwapDepositTransaction {
  to: string;
  value: string;
  toExtra?: string | null; // memo / destination tag
  chainId: number;
  chainKey: string;
}

export interface MoonpaySwapActionData extends MoonpaySwapQuoteData {
  tx: MoonpaySwapEvmTransaction | MoonpaySwapDepositTransaction;
  txId: string;
  bridgeIds?: string[];
}

export interface MoonpaySwapStatusRequestData {
  env: MoonpaySwapEnv;
  txHash?: string;
  txId?: string;
  chainId?: number;
}

export enum MoonpaySwapStatus {
  notYetCreated = 'not yet created',
  submitted = 'submitted',
  pending = 'pending',
  success = 'success',
  completed = 'completed',
  requiresRefund = 'requires refund',
  refunded = 'refunded',
  failed = 'failed',
  expired = 'expired',
}

export interface MoonpaySwapOnchainTx {
  txHash: string;
  chainId: number;
  timestamp: number | string;
  toAddress?: string;
  value?: string;
  paymentToken?: MoonpaySwapToken;
  revertReason?: string;
}

export interface MoonpaySwapStatusData {
  txId: string;
  status: MoonpaySwapStatus;
  sender: string;
  srcChainId: number;
  dstChainId?: number | null;
  srcTxHash?: string | null;
  dstTxHash?: string | null;
  srcTx?: MoonpaySwapOnchainTx | null;
  dstTx?: MoonpaySwapOnchainTx | null;
  estimatedSecondsRemaining?: number | null;
  success?: boolean;
  error?: MoonpaySwapError;
}

export interface MoonpaySwapRegisterTxsRequestData {
  env: MoonpaySwapEnv;
  txId: string;
  txHash: string;
}

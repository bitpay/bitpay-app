/**
 * Rango Exchange — Basic API (single step) models.
 *
 * Docs: https://docs.rango.exchange/api-integration/basic-api-single-step
 *
 * Rango identifies assets as `BLOCKCHAIN.SYMBOL` for natives and
 * `BLOCKCHAIN.SYMBOL--0xcontract` for tokens. See rango-utils.ts for the
 * mapping between BitPay chain codes and Rango blockchain names.
 */

export type RangoEnv = 'sandbox' | 'production';

/**
 * Rango returns one of these per blockchain. The wallet only signs EVM,
 * TRANSFER (UTXO) and SOLANA today — see RANGO_SUPPORTED_TX_TYPES.
 */
export type RangoTransactionType =
  | 'EVM'
  | 'TRANSFER'
  | 'SOLANA'
  | 'COSMOS'
  | 'STARKNET'
  | 'TRON'
  | 'XRPL';

export interface RangoBlockchainMeta {
  name: string; // 'ETH', 'BTC', 'POLYGON', ...
  type: RangoTransactionType;
  chainId?: string | null; // '0x1' for EVM, null for UTXO
  displayName?: string;
  logo?: string;
  enabled?: boolean;
  enableGasV2?: boolean;
}

export interface RangoToken {
  blockchain: string;
  symbol: string;
  address: string | null; // null for native assets
  decimals: number;
  name?: string | null;
  image?: string;
  usdPrice?: number | null;
  isPopular?: boolean;
}

export interface RangoMetaResponse {
  blockchains?: RangoBlockchainMeta[];
  tokens?: RangoToken[];
  swappers?: Array<{id: string; title: string; logo?: string}>;
}

/* -------------------------------------------------------------------------- */
/* Quote                                                                      */
/* -------------------------------------------------------------------------- */

export interface RangoAmountRestriction {
  min?: string | null;
  max?: string | null;
  type?: 'INCLUSIVE' | 'EXCLUSIVE';
}

export interface RangoFee {
  name: string;
  token?: RangoToken;
  expenseType?:
    | 'FROM_SOURCE_WALLET'
    | 'DECREASE_FROM_OUTPUT'
    | 'FROM_DESTINATION_WALLET';
  amount?: string;
  meta?: any;
}

export interface RangoQuotePath {
  swapper?: {id: string; title: string; logo?: string};
  swapperType?: string;
  from?: RangoToken;
  to?: RangoToken;
  expectedOutput?: string;
  estimatedTimeInSeconds?: number;
}

export interface RangoQuoteSimulationResult {
  outputAmount: string;
  outputAmountMin: string;
  outputAmountUsd?: number | null;
  swapper?: {id: string; title: string; logo?: string};
  path?: RangoQuotePath[] | null;
  fee?: RangoFee[];
  feeUsd?: number | null;
  amountRestriction?: RangoAmountRestriction | null;
  estimatedTimeInSeconds?: number;
  from?: RangoToken;
  to?: RangoToken;
}

export type RangoResultType =
  | 'OK'
  | 'HIGH_IMPACT'
  | 'INPUT_LIMIT_ISSUE'
  | 'NO_ROUTE';

export interface RangoGetQuoteRequestData {
  env?: RangoEnv;
  from: string; // 'BTC.BTC'
  to: string; // 'ETH.USDC--0xa0b8...'
  amount: string; // machine readable (smallest unit)
  slippage?: number;
  referrerFee?: string;
  fromAddress?: string;
  toAddress?: string;
}

export interface RangoQuoteResponse {
  requestId?: string;
  resultType: RangoResultType;
  route: RangoQuoteSimulationResult | null;
  error?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Swap — unsigned transactions                                               */
/* -------------------------------------------------------------------------- */

export interface RangoEvmTransaction {
  type: 'EVM';
  blockChain: RangoBlockchainMeta | string;
  from: string;
  txTo: string;
  txData: string | null;
  value: string | null;
  gasLimit: string | null;
  gasPrice: string | null;
  maxFeePerGas?: string | null;
  maxPriorityFeePerGas?: string | null;
  /**
   * Spender for the ERC20 approval. Rango generates this per quote for some
   * bridges, so it must never be hard-coded or cached across quotes.
   */
  approveTo: string | null;
  approveData: string | null;
}

/**
 * UTXO chains (BTC, BCH, DOGE, LTC). `memo` must be written as an OP_RETURN
 * output on the resulting transaction — the same shape the Thorswap
 * integration used.
 */
export interface RangoTransferTransaction {
  type: 'TRANSFER';
  method: string; // 'transfer' | 'deposit'
  blockChain: RangoBlockchainMeta | string;
  fromWalletAddress: string;
  recipientAddress: string;
  amount: string;
  decimals: number;
  memo: string | null;
  asset?: RangoToken;
}

export interface RangoSolanaTransaction {
  type: 'SOLANA';
  blockChain: RangoBlockchainMeta | string;
  from: string;
  identifier?: string;
  /** Base64 serialised transaction, when Rango returns a prebuilt one. */
  serializedMessage?: number[] | null;
  txType?: 'LEGACY' | 'VERSIONED';
  recentBlockhash?: string | null;
  signatures?: any[];
  instructions?: any[];
}

export type RangoTransaction =
  | RangoEvmTransaction
  | RangoTransferTransaction
  | RangoSolanaTransaction;

export interface RangoCreateSwapRequestData extends RangoGetQuoteRequestData {
  fromAddress: string;
  toAddress: string;
  referrerAddress?: string;
  disableEstimate?: boolean;
}

export interface RangoSwapResponse {
  requestId: string;
  resultType: RangoResultType;
  route: RangoQuoteSimulationResult | null;
  error?: string | null;
  tx: RangoTransaction | null;
}

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

export type RangoTxStatus = 'running' | 'failed' | 'success' | null;

export interface RangoStatusRequestData {
  env?: RangoEnv;
  requestId: string;
  txId: string;
}

export interface RangoStatusResponse {
  status: RangoTxStatus;
  error?: string | null;
  outputAmount?: string | null;
  explorerUrl?: Array<{description?: string; url: string}> | null;
  bridgeData?: any;
  output?: {
    amount?: string;
    receivedToken?: RangoToken;
    type?: string;
  } | null;
}

export interface RangoIsApprovedRequestData {
  env?: RangoEnv;
  requestId: string;
  txId: string;
}

export interface RangoIsApprovedResponse {
  isApproved: boolean;
  currentApprovedAmount?: string | null;
  requiredApprovedAmount?: string | null;
  error?: string | null;
}

export interface RangoReportFailureRequestData {
  env?: RangoEnv;
  requestId: string;
  eventType:
    | 'SEND_TX_FAILED'
    | 'USER_REJECT'
    | 'TX_FAIL'
    | 'USER_CANCEL'
    | 'FETCH_TX_FAILED';
  reason?: string;
  tags?: Record<string, string>;
}

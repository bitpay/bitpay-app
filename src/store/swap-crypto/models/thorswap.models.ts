export type ThorswapEnv = 'sandbox' | 'production';

export type ThorswapProvider =
  | 'UNISWAPV2'
  | 'UNISWAPV3'
  | 'THORCHAIN'
  | 'ZEROX'
  | 'ONEINCH'
  | 'SUSHISWAP'
  | 'KYBER';

export enum ThorswapProviderEnum {
  UNISWAPV2 = 'UNISWAPV2',
  UNISWAPV3 = 'UNISWAPV3',
  THORCHAIN = 'THORCHAIN',
  ZEROX = 'ZEROX',
  ONEINCH = 'ONEINCH',
  SUSHISWAP = 'SUSHISWAP',
  KYBER = 'KYBER',
}

export enum ThorswapProviderNames {
  UNISWAPV2 = 'Uniswap V2',
  UNISWAPV3 = 'Uniswap V3',
  THORCHAIN = 'THORChain',
  ZEROX = 'Zerox',
  ONEINCH = '1inch',
  SUSHISWAP = 'SushiSwap',
  KYBER = 'KyberSwap',
}

export interface ThorswapGetCurrenciesRequestData {
  env: ThorswapEnv;
  categories?: string | string[];
  includeDetails?: boolean;
}

export interface ThorswapCurrency {
  address: string;
  addressUrl: string;
  apiIdentifier: string;
  averageBlockTime: number;
  blockchain: string;
  chainId?: number | string;
  decimals: number;
  enabled: boolean;
  extraIdName: string;
  fullName: string;
  image: string;
  name: string;
  notifications: any;
  payinConfirmation?: number;
  protocol: string;
  ticker: string; // currencyAbbreviation
  transactionUrl: string;
}

export interface ThorswapGetMinLimitRequestData {
  env: ThorswapEnv;
  from: string;
  to?: string;
  includeDetails?: boolean;
}

export interface ThorswapGetMinLimitData {}

export interface ThorswapGetSwapQuoteRequestData {
  env: ThorswapEnv;
  sellAsset: string; // E.g. 'ETH.ETH', 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
  buyAsset: string; // E.g. 'BTC.BTC'
  sellAmount: number;
  senderAddress?: string;
  recipientAddress?: string;
  slippage?: number;
  limit?: number;
  providers?: ThorswapProviderEnum[];
  subProviders?: ThorswapProviderEnum[];
  preferredProvider?: ThorswapProvider;
  affiliateAddress?: string;
  affiliateBasisPoints?: number;
  isAffiliateFeeFlat?: boolean;
  allowSmartContractRecipient?: boolean;
}

export interface ThorswapGetSwapQuoteData {
  quoteId: string;
  routes: ThorswapQuoteRoute[];
  sellAssetAmount: string;

  // Errors
  message?: string;
  code?: string;
  type?: string;
  error?: any;
  errors?: any;
}

export interface ThorswapQuoteRoute {
  approvalTarget?: string;
  approvalToken: string;
  calldata: ThorswapRouteCalldata;
  complete: boolean;
  contract: string;
  contractMethod: string;
  estimatedTime: number;
  evmTransactionDetails: ThorswapRouteEvmTransactionDetails;
  expectedOutput: string;
  expectedOutputMaxSlippage: string;
  expectedOutputMaxSlippageUSD: string;
  expectedOutputUSD: string;
  fees: {[key in string]: ThorswapRouteFee[]}; // E.g {ETH: [...]}
  index: number;
  meta: ThorswapRouteMeta;
  optimal: boolean;
  path: string;
  providers: ThorswapProvider[];
  subProviders: string[];
  swaps: {[key in string]: ThorswapRouteSwap[]}; // E.g {ETH: [...]}
  targetAddress?: string;
  timeEstimates: ThorswapRouteTimeEstimates;
  wrapperSwapCalldata?: ThorswapRouteWrapperSwapCalldata;
  transaction?: ThorswapTransaction;
}

export interface ThorswapTransaction {
  // ERC20 -> ERC20 | ERC20 -> UTXO
  // Common parameters | UNISWAPV2 | UNISWAPV3 | SUSHISWAP
  to?: string;
  from?: string;
  data?: string;
  value?: string | number;

  // ONEINCH | THORCHAIN
  gas?: string | number; // gas: "0x136a7" | gas: 0 (gas limit)
  gasPrice?: string | number;
}

export interface ThorswapRouteCalldata {
  amount?: string;
  minReturn?: string;
  pools?: string;
  srcToken?: string;

  // THORCHAIN
  depositWithExpiry?: string;
  vault?: string;
  asset?: string;
  // amount?: string;
  memo?: string;
  memoStreamingSwap?: string;
  expiration?: string;
  fromAsset?: string;
  // amountIn?: string;

  // UNISWAPV3
  data?: string;
  multicall?: string;

  // UNISWAPV2 | SUSHISWAP | KYBER
  amountIn?: string;
  amountOutMin?: string;
  to?: string;
  deadline?: number;
  path?: string[];
  swapExactTokensForTokens?: string;
}

interface ThorswapRouteEvmTransactionDetails {
  approvalSpender?: string;
  approvalToken: string;
  contractAddress: string;
  contractMethod: string;
  contractParams: any[];
  contractParamsNames: any[];
  contractParamsStreaming: any[];
}

export interface ThorswapRouteFee {
  affiliateFee: number;
  affiliateFeeUSD: number;
  asset: string;
  isOutOfPocket: boolean;
  networkFee: number;
  networkFeeUSD: number;
  slipFee?: number;
  slipFeeUSD?: number;
  totalFee: number;
  totalFeeUSD: number;
  type?: string;
}

interface ThorswapRouteMeta {
  buyChain: string;
  buyChainGasRate: string;
  hasStreamingSwap: boolean;
  priceProtectionDetected: any;
  priceProtectionRequired: boolean;
  quoteMode: string;
  recommendedSlippage: number;
  sellChain: string;
  sellChainGasRate: string;
  slippagePercentage: number;
  thornodeMeta: any;
  warnings: any[];
}

interface ThorswapRouteSwap {
  from: string;
  fromTokenAddress: string;
  parts: thorswapSwapPart[];
  to: string;
  toTokenAddress: string;
}

interface thorswapSwapPart {
  percentage: number;
  provider: ThorswapProvider;
}

export interface ThorswapRouteTimeEstimates {
  outboundMs: number;
  swapMs: number;
  inboundMs?: number;
  streamingMs?: number;
}

interface ThorswapRouteWrapperSwapCalldata {
  amount: string;
  fees: string;
  recipient: string | null;
  router: string;
  tokenOut: string;
}

export enum ThorswapTrackingStatus {
  not_started = 'not_started',
  starting = 'starting', // first status once we receive, old or new transaction
  pending = 'pending',
  broadcasted = 'broadcasted',
  mempool = 'mempool', // or indexing
  inbound = 'inbound',
  outbound = 'outbound',
  swapping = 'swapping', // more generic than streaming
  completed = 'completed',
  refunded = 'refunded',
  partially_refunded = 'partially_refunded',
  dropped = 'dropped',
  reverted = 'reverted',
  replaced = 'replaced',
  retries_exceeded = 'retries_exceeded',
  parsing_error = 'parsing_error',
  success = 'success',
  error = 'error',

  // bitpay custom status
  bitpayTxSent = 'bitpayTxSent',
}

export interface ThorswapGetSwapTxRequestData {
  env: ThorswapEnv;
  // The first "GetSwap" request must include txn so that it can later be queried with just "hash".
  txn?: {
    // Use this the first time (in ThorswapCheckout) to include the order in Thorswap database
    quoteId: string;
    hash: string;
    sellAmount: string;
    route: Partial<ThorswapQuoteRoute>;
  };
  hash?: string;
}

interface ThorswapSwapTxDataResultLeg {
  chain: string;
  hash: string;
  provider: ThorswapProviderEnum;
  txnType: string;
  fromAsset: string;
  fromAssetImage: string;
  toAsset: string;
  toAssetImage: string;
  fromAmount: string | number; // E.g. "10"
  toAmount: string | number; // E.g. "9.9894"
  updateTimestamp: number;
  endTimestamp: number;
  estimatedEndTimestamp: number;
  estimatedDuration: number;
  status: ThorswapTrackingStatus;
  isStreamingSwap: boolean;
}

interface ThorswapSwapTxDataResult {
  quoteId: string;
  firstTransactionHash: string;
  estimatedDuration: string | number; // E.g. "0"
  currentLegIndex: string | number; // E.g. "-1"
  legs: ThorswapSwapTxDataResultLeg[];
  opaque: any;
  isStreamingSwap: boolean;
  isLending: boolean;
  reprocessCount: number;
  status: ThorswapTrackingStatus;
}

export interface ThorswapGetSwapTxData {
  done: boolean;
  status: ThorswapTrackingStatus;
  result: ThorswapSwapTxDataResult;

  // Errors
  message?: string;
  code?: string;
  type?: string;
  error?: any;
  errors?: any;
}

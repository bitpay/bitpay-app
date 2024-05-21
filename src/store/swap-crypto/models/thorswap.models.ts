export type ThorswapEnv = 'sandbox' | 'production';

export type ThorswapProvider =
  | 'UNISWAPV2'
  | 'UNISWAPV3'
  | 'THORCHAIN'
  | 'ZEROX'
  | 'ONEINCH'
  | 'SUSHISWAP';

export enum ThorswapProviderEnum {
  UNISWAPV2 = 'UNISWAPV2',
  UNISWAPV3 = 'UNISWAPV3',
  THORCHAIN = 'THORCHAIN',
  ZEROX = 'ZEROX',
  ONEINCH = 'ONEINCH',
  SUSHISWAP = 'SUSHISWAP',
}

export interface ThorswapCurrency {
  address: string;
  addressUrl: string;
  apiIdentifier: string;
  averageBlockTime: number;
  blockchain: string;
  chainId: number | string;
  decimals: number;
  enabled: boolean;
  extraIdName: string;
  fullName: string;
  image: string;
  name: string;
  notifications: any;
  payinConfirmation: number;
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
  routes: thorswapQuoteRoute[];
  sellAssetAmount: string;
}

export interface thorswapQuoteRoute {
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
  fees: {[key in string]: thorswapRouteFee[]}; // E.g {ETH: [...]}
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

interface ThorswapRouteCalldata {
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

  // UNISWAPV2 | SUSHISWAP
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

interface thorswapRouteFee {
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

interface ThorswapRouteTimeEstimates {
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


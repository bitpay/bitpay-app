export type ChangellyCurrencyBlockchain =
  | 'bitcoin'
  | 'bitcoin_cash'
  | 'ethereum'
  | 'doge'
  | 'litecoin'
  | 'polygon'
  | 'arbitrum'
  | 'base'
  | 'optimism'
  | 'ripple'
  | 'solana';

export interface ChangellyCurrency {
  name: string; // currencyAbbreviation
  fullName: string;
  enabled: boolean;
  fixRateEnabled: boolean;
  protocol?: string;
  ticker?: string;
  enabledFrom?: boolean;
  enabledTo?: boolean;
  payinConfirmations?: number;
  extraIdName?: string;
  addressUrl?: string;
  transactionUrl?: string;
  image?: string;
  fixedTime?: number;
  blockchain?: ChangellyCurrencyBlockchain;
  notifications?: {
    payin?: string;
  };
  contractAddress?: string;
}

export interface ChangellyFixRateDataType {
  amountFrom: number;
  coinFrom: string;
  coinTo: string;
}

export interface ChangellyPairParamsDataType {
  coinFrom: string;
  coinTo: string;
}

export interface ChangellyFixTransactionDataType {
  coinFrom: string;
  coinTo: string;
  addressTo: string;
  amountFrom: number;
  fixedRateId: string;
  refundAddress: string;
}

export interface ChangellyRateData {
  fixedRateId: string;
  amountTo: number;
  rate: number;
}

export interface ChangellyGetRateRequestData {
  amountFrom: number;
  coinFrom: string;
  coinTo: string;
}

export interface ChangellyRateResult {
  amountFrom: string;
  amountTo: string;
  expiredAt: number;
  from: string;
  id: string;
  max: string;
  maxFrom: string;
  maxTo: string;
  min: string;
  minFrom: string;
  minTo: string;
  networkFee: string;
  result: string; // result = rate
  to: string;
}

export interface ChangellyGetRateData {
  result: ChangellyRateResult[];
  jsonrpc: string;
  error?: any;
}

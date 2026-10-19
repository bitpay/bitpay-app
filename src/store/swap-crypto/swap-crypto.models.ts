import {
  ThorswapProvider,
  ThorswapTrackingStatus,
} from '../swap-crypto/models/thorswap.models';
import {ChangellyCurrency} from './models/changelly.models';
import {RangoMetaResponse, RangoTxStatus} from './models/rango.models';
import {ThorswapCurrency} from './models/thorswap.models';
import {SwapCryptoConfig} from '../external-services/external-services.types';

export interface SwapCryptoLimits {
  min?: number;
  max?: number;
}

export interface SwapCryptoPrefetchedData {
  swapCryptoConfig?: SwapCryptoConfig;
  changellyRawCurrencies?: ChangellyCurrency[];
  rangoRawCurrencies?: RangoMetaResponse;
  thorswapRawCurrencies?: ThorswapCurrency[];
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

export interface rangoTxData {
  /** Rango's own id for the route; status and approval polling are keyed on it. */
  requestId: string;
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
  /** Rango asset identifiers, e.g. 'BTC.BTC' / 'ETH.USDC--0xa0b8...'. */
  assetFrom: string;
  assetTo: string;
  /** Rango's own cut, in units of the SOURCE coin - the same meaning this field carries for the other providers. */
  totalExchangeFee: number;
  /** Rango also reports the route's total fee in USD; kept separate so the two are never confused. */
  totalExchangeFeeUsd?: number;
  slippage?: number;
  status: RangoTxStatus;
  /** Swapper that actually filled the route, for support and display. */
  swapperId?: string;
  isTSSWallet?: boolean;
  error?: any;
  env?: 'dev' | 'prod';
}

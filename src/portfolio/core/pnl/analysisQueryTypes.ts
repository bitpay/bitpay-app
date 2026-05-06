import type {BwsConfig} from '../shared/bws';
import type {StoredWallet} from '../types';
import type {PnlTimeframe} from './analysisStreaming';

export type ComputeAnalysisArgs = {
  cfg: BwsConfig;
  wallets: StoredWallet[];
  quoteCurrency: string;
  timeframe: PnlTimeframe;
  nowMs?: number;
  maxPoints?: number;
  currentRatesByAssetId?: Record<string, number>;
};

export type PrepareAnalysisSessionResult = {
  sessionId: string;
};

export type ComputeAnalysisSessionScopeArgs = {
  sessionId: string;
  walletIds?: string[];
};

export type DisposeAnalysisSessionArgs = {
  sessionId: string;
};

export type ComputeBalanceChartViewModelArgs = ComputeAnalysisArgs & {
  walletIds?: string[];
  dataRevisionSig?: string;
  balanceOffset?: number;
};

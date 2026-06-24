import type {BwsConfig} from '../shared/bws';
import type {StoredWallet} from '../types';
import type {
  FinishWalletSessionResult,
  PrepareWalletSessionResult,
  ProcessNextPageSessionResult,
  SnapshotIngestConfig,
} from './portfolioEngineTypes';

export type PortfolioPopulateWalletStatus = 'in_progress' | 'done' | 'error';

export type PortfolioPopulateWalletError = {
  walletId: string;
  message: string;
};

export type PortfolioPopulateProgress = {
  inProgress: boolean;
  startedAt: number;
  currentWalletId?: string;
  walletsTotal: number;
  walletsCompleted: number;
  txRequestsMade: number;
  txsProcessed: number;
  walletStatusById: {
    [walletId: string]: PortfolioPopulateWalletStatus | undefined;
  };
  errors: PortfolioPopulateWalletError[];
};

export type PortfolioPopulateWalletRunResult = {
  walletId: string;
  prepared: PrepareWalletSessionResult | null;
  processResults: ProcessNextPageSessionResult[];
  finished?: FinishWalletSessionResult | null;
  appendedSnapshots: number;
  txRequestsMade: number;
  txsProcessed: number;
  cancelled: boolean;
  disabledForLargeHistory: boolean;
};

export type PortfolioPopulateRunResult = {
  startedAt: number;
  finishedAt: number;
  cancelled: boolean;
  disabledForLargeHistory: boolean;
  results: PortfolioPopulateWalletRunResult[];
};

export type PortfolioPopulateJobStartParams = {
  jobId?: string;
  awaitTerminal?: boolean;
  cfg: BwsConfig;
  wallets: StoredWallet[];
  ingest: SnapshotIngestConfig;
  pageSize: number;
  emitRows?: number;
};

export type PortfolioPopulateJobState =
  | 'queued'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type PortfolioPopulateJobStatus = PortfolioPopulateProgress & {
  jobId: string;
  state: PortfolioPopulateJobState;
  finishedAt?: number;
  disabledForLargeHistory: boolean;
  result?: PortfolioPopulateRunResult;
  failureMessage?: string;
  lastUpdatedAt: number;
};

export type PortfolioPopulateJobStartResult = {
  jobId: string;
  status: PortfolioPopulateJobStatus;
};

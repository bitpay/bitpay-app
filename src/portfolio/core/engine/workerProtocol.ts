import type {BwsConfig} from '../shared/bws';
import type {
  ComputeAnalysisSessionScopeArgs,
  ComputeAnalysisArgs,
  ComputeBalanceChartViewModelArgs,
  DisposeAnalysisSessionArgs,
  PrepareAnalysisSessionResult,
} from '../pnl/analysisQueryTypes';
import type {
  FiatRateAssetRef,
  FiatRateCacheRequest,
  FiatRateInterval,
  FiatRateSeriesCache,
} from '../fiatRatesShared';
import type {WalletCredentials, WalletSummary} from '../types';
import type {
  FinishWalletSessionResult,
  KvStats,
  PrepareWalletSessionResult,
  ProcessNextPageSessionResult,
  SnapshotIngestConfig,
} from './portfolioEngineTypes';
import type {
  PnlAnalysisChartResult,
  PnlAnalysisResult,
} from '../pnl/analysisStreaming';
import type {BalanceChartViewModel} from '../pnl/balanceChartViewModel';
import type {SnapshotIndexV2} from '../pnl/snapshotStore';
import type {BalanceSnapshotStored} from '../pnl/types';
import type {SnapshotInvalidHistoryMarkerV1} from '../pnl/invalidHistory';
import type {
  PortfolioPopulateJobStartParams,
  PortfolioPopulateJobStartResult,
  PortfolioPopulateJobStatus,
} from './populateJob';
import type {PortfolioPopulateWalletDebugTrace} from './populateDebug';

export type WorkerMethodMap = {
  'rates.ensure': {
    params: {
      cfg: BwsConfig;
      quoteCurrency: string;
      interval: FiatRateInterval;
      coins: string[];
      assets?: FiatRateAssetRef[];
      maxAgeMs?: number;
      force?: boolean;
    };
    result: void;
  };

  'rates.getCache': {
    params: {
      cfg: BwsConfig;
      quoteCurrency: string;
      requests: FiatRateCacheRequest[];
      maxAgeMs?: number;
      force?: boolean;
    };
    result: FiatRateSeriesCache;
  };

  'snapshots.getIndex': {
    params: {walletId: string};
    result: SnapshotIndexV2 | null;
  };

  'snapshots.clearWallet': {
    params: {walletId: string};
    result: void;
  };

  'snapshots.prepareWallet': {
    params: {
      cfg: BwsConfig;
      wallet: WalletSummary;
      credentials: WalletCredentials;
      ingest: SnapshotIngestConfig;
      pageSize: number;
      emitRows?: number;
    };
    result: PrepareWalletSessionResult;
  };

  'snapshots.closeWalletSession': {
    params: {walletId: string};
    result: void;
  };

  'snapshots.processNextPage': {
    params: {walletId: string};
    result: ProcessNextPageSessionResult;
  };

  'snapshots.finishWallet': {
    params: {walletId: string};
    result: FinishWalletSessionResult;
  };

  'snapshots.getLatestSnapshot': {
    params: {walletId: string};
    result: BalanceSnapshotStored | null;
  };

  'snapshots.getInvalidHistory': {
    params: {walletId: string};
    result: SnapshotInvalidHistoryMarkerV1 | null;
  };

  'snapshots.listSnapshots': {
    params: {walletId: string};
    result: BalanceSnapshotStored[];
  };

  'analysis.compute': {
    params: ComputeAnalysisArgs;
    result: PnlAnalysisResult;
  };

  'analysis.prepareSession': {
    params: ComputeAnalysisArgs;
    result: PrepareAnalysisSessionResult;
  };

  'analysis.computeSessionScope': {
    params: ComputeAnalysisSessionScopeArgs;
    result: PnlAnalysisResult;
  };

  'analysis.disposeSession': {
    params: DisposeAnalysisSessionArgs;
    result: void;
  };

  'analysis.computeChart': {
    params: ComputeAnalysisArgs;
    result: PnlAnalysisChartResult;
  };

  'analysis.computeBalanceChartViewModel': {
    params: ComputeBalanceChartViewModelArgs;
    result: BalanceChartViewModel;
  };

  'populate.startJob': {
    params: PortfolioPopulateJobStartParams;
    result: PortfolioPopulateJobStartResult;
  };

  'populate.getJobStatus': {
    params: {jobId?: string};
    result: PortfolioPopulateJobStatus | null;
  };

  'populate.cancelJob': {
    params: {jobId?: string};
    result: PortfolioPopulateJobStatus | null;
  };

  // ---- Harness/debug helpers ----
  'debug.listRates': {
    params: {quoteCurrency?: string};
    result: Array<{
      key: string;
      quoteCurrency: string;
      coin: string;
      interval: FiatRateInterval;
      fetchedOn: number;
      points: number;
      firstTs: number | null;
      lastTs: number | null;
      bytes: number;
    }>;
  };

  'debug.clearRates': {
    params: {quoteCurrency?: string};
    result: void;
  };

  'debug.clearAll': {
    params: {};
    result: void;
  };

  'debug.kvStats': {
    params: {};
    result: KvStats;
  };

  'debug.getPopulateWalletTrace': {
    params: {walletId: string};
    result: PortfolioPopulateWalletDebugTrace | null;
  };
};

export type WorkerMethod = keyof WorkerMethodMap;

export type WorkerRequest<M extends WorkerMethod = WorkerMethod> = {
  id: number;
  method: M;
  params: WorkerMethodMap[M]['params'];
};

export type WorkerResponse<M extends WorkerMethod = WorkerMethod> =
  | {id: number; ok: true; result: WorkerMethodMap[M]['result']}
  | {id: number; ok: false; error: string; stack?: string};

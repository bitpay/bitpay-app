import type {
  PortfolioPopulateJobStartParams,
  PortfolioPopulateJobStartResult,
  PortfolioPopulateJobState,
  PortfolioPopulateJobStatus,
  PortfolioPopulateRunResult,
  PortfolioPopulateWalletError,
  PortfolioPopulateWalletRunResult,
  PortfolioPopulateWalletStatus,
} from '../../core/engine/populateJob';
import type {
  WorkerMethod,
  WorkerRequest,
  WorkerResponse,
} from '../../core/engine/workerProtocol';
import {toPortfolioRuntimeWalletCredentials} from '../../core/runtimeWalletCredentials';
import {
  clearPortfolioTxHistorySigningDispatchContextOnRuntime,
  disposePortfolioTxHistorySigningDispatchContext,
  portfolioTxHistorySigningDispatchContextHasSigningAuthority,
  setPortfolioTxHistorySigningDispatchContextOnRuntime,
  type PortfolioTxHistorySigningDispatchContext,
} from '../../adapters/rn/txHistorySigning';
import {
  handleCloseWalletSessionOnPopulateWorklet,
  handleFinishWalletOnPopulateWorklet,
  handlePrepareWalletOnPopulateWorklet,
  handleProcessNextPageOnPopulateWorklet,
  getOrCreatePortfolioPopulateWorkletState,
  type PortfolioPopulateWorkletConfig,
} from './portfolioPopulateWorklet';
import {isSnapshotInvalidHistoryError} from '../../core/pnl/invalidHistory';
import {clearWorkletWalletSnapshots} from './portfolioWorkletSnapshots';

const PORTFOLIO_POPULATE_JOB_GLOBAL_KEY =
  '__bitpayPortfolioPopulateJobWorkletStateV1__';

export type PortfolioPopulateJobSigningContextMap = {
  [walletId: string]: PortfolioTxHistorySigningDispatchContext | undefined;
};

type WorkletPopulateJob = {
  jobId: string;
  state: PortfolioPopulateJobState;
  inProgress: boolean;
  startedAt: number;
  finishedAt?: number;
  currentWalletId?: string;
  walletsTotal: number;
  walletsCompleted: number;
  txRequestsMade: number;
  txsProcessed: number;
  walletStatusById: {
    [walletId: string]: PortfolioPopulateWalletStatus | undefined;
  };
  errors: PortfolioPopulateWalletError[];
  disabledForLargeHistory: boolean;
  failureMessage?: string;
  results: PortfolioPopulateWalletRunResult[];
  cancelRequested: boolean;
  lastUpdatedAt: number;
  signingContextsByWalletId: PortfolioPopulateJobSigningContextMap;
};

type PortfolioPopulateJobWorkletState = {
  activeJob?: WorkletPopulateJob;
  storageId?: string;
  registryKey?: string;
  nextJobOrdinal: number;
};

type GlobalWithPortfolioPopulateJobState = typeof globalThis & {
  __bitpayPortfolioPopulateJobWorkletStateV1__?: PortfolioPopulateJobWorkletState;
};

function isFiniteNumber(value: unknown): boolean {
  'worklet';
  return Number.isFinite(Number(value));
}

function nowMs(): number {
  'worklet';
  const now = Date.now();
  return isFiniteNumber(now) ? Number(now) : 0;
}

function cloneErrors(
  errors: PortfolioPopulateWalletError[],
): PortfolioPopulateWalletError[] {
  'worklet';
  return errors.map(error => ({
    walletId: String(error.walletId || ''),
    message: String(error.message || ''),
  }));
}

function cloneWalletStatusById(input: {
  [walletId: string]: PortfolioPopulateWalletStatus | undefined;
}): {[walletId: string]: PortfolioPopulateWalletStatus | undefined} {
  'worklet';
  return {...input};
}

function cloneWalletRunResult(
  result: PortfolioPopulateWalletRunResult,
): PortfolioPopulateWalletRunResult {
  'worklet';
  return {
    walletId: String(result.walletId || ''),
    prepared: result.prepared ? {...result.prepared} : null,
    processResults: Array.isArray(result.processResults)
      ? result.processResults.map(item => ({...item}))
      : [],
    finished: result.finished ? {...result.finished} : null,
    appendedSnapshots: Number(result.appendedSnapshots || 0),
    txRequestsMade: Number(result.txRequestsMade || 0),
    txsProcessed: Number(result.txsProcessed || 0),
    cancelled: result.cancelled === true,
    disabledForLargeHistory: result.disabledForLargeHistory === true,
  };
}

function buildRunResult(job: WorkletPopulateJob): PortfolioPopulateRunResult {
  'worklet';
  return {
    startedAt: job.startedAt,
    finishedAt: Number(job.finishedAt || job.lastUpdatedAt || job.startedAt),
    cancelled: job.state === 'cancelled',
    disabledForLargeHistory: job.disabledForLargeHistory === true,
    results: job.results.map(cloneWalletRunResult),
  };
}

function toJobStatus(job: WorkletPopulateJob): PortfolioPopulateJobStatus {
  'worklet';

  return {
    jobId: job.jobId,
    state: job.state,
    inProgress: job.inProgress,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    currentWalletId: job.currentWalletId,
    walletsTotal: job.walletsTotal,
    walletsCompleted: job.walletsCompleted,
    txRequestsMade: job.txRequestsMade,
    txsProcessed: job.txsProcessed,
    walletStatusById: cloneWalletStatusById(job.walletStatusById),
    errors: cloneErrors(job.errors),
    disabledForLargeHistory: job.disabledForLargeHistory,
    result: !job.inProgress ? buildRunResult(job) : undefined,
    failureMessage: job.failureMessage,
    lastUpdatedAt: job.lastUpdatedAt,
  };
}

function touchJob(job: WorkletPopulateJob): void {
  'worklet';
  job.lastUpdatedAt = nowMs();
}

function appendJobError(
  job: WorkletPopulateJob,
  walletId: string,
  message: string,
): void {
  'worklet';
  job.errors.push({walletId, message});
  touchJob(job);
}

function markWalletStatus(
  job: WorkletPopulateJob,
  walletId: string,
  status: PortfolioPopulateWalletStatus | undefined,
): void {
  'worklet';
  if (!walletId) {
    return;
  }
  if (typeof status === 'undefined') {
    delete job.walletStatusById[walletId];
  } else {
    job.walletStatusById[walletId] = status;
  }
  touchJob(job);
}

function createWalletRunResult(
  walletId: string,
): PortfolioPopulateWalletRunResult {
  'worklet';
  return {
    walletId,
    prepared: null,
    processResults: [],
    finished: null,
    appendedSnapshots: 0,
    txRequestsMade: 0,
    txsProcessed: 0,
    cancelled: false,
    disabledForLargeHistory: false,
  };
}

function cloneSigningContextForJob(
  context: PortfolioTxHistorySigningDispatchContext | undefined,
): PortfolioTxHistorySigningDispatchContext | undefined {
  'worklet';

  if (!context) {
    return undefined;
  }

  // Background populate has no JS callback/keystore handoff while the job is
  // running, so the job owns a cloned minimal per-wallet authority until that
  // wallet completes, errors, or the job terminates.
  const sec1DerHex =
    context.signingAuthority?.kind === 'sec1DerHex'
      ? String(context.signingAuthority.sec1DerHex || '').trim()
      : '';

  const jobContext: PortfolioTxHistorySigningDispatchContext = {
    requestCount: context.requestCount,
    boxedNitroModulesProxy: context.boxedNitroModulesProxy,
    boxedNitroFetch: context.boxedNitroFetch,
    nextSignHandleIndex: Math.max(
      0,
      Math.floor(context.nextSignHandleIndex ?? 0),
    ),
  };
  if (sec1DerHex) {
    jobContext.signingAuthority = {kind: 'sec1DerHex', sec1DerHex};
  }

  return jobContext;
}

function cloneSigningContextMapForJob(
  input: PortfolioPopulateJobSigningContextMap | undefined,
): PortfolioPopulateJobSigningContextMap {
  'worklet';

  const out: PortfolioPopulateJobSigningContextMap = {};
  if (!input) {
    return out;
  }

  for (const walletId of Object.keys(input)) {
    const normalizedWalletId = String(walletId || '').trim();
    if (!normalizedWalletId) {
      continue;
    }
    out[normalizedWalletId] = cloneSigningContextForJob(input[walletId]);
  }

  return out;
}

function buildFetchOnlySigningContext(
  context: PortfolioTxHistorySigningDispatchContext | undefined,
): PortfolioTxHistorySigningDispatchContext | undefined {
  'worklet';

  if (!context) {
    return undefined;
  }

  return {
    requestCount: context.requestCount,
    // Prepare/rate work borrows only Nitro Fetch plumbing. Signing authority
    // stays with the job-owned wallet context until txhistory signing needs it.
    boxedNitroModulesProxy: context.boxedNitroModulesProxy,
    boxedNitroFetch: context.boxedNitroFetch,
    nitroFetchClient: context.nitroFetchClient,
    nextSignHandleIndex: Math.max(
      0,
      Math.floor(context.nextSignHandleIndex ?? 0),
    ),
  };
}

function clearJobSigningContextForWallet(
  job: WorkletPopulateJob | undefined,
  walletId: string,
): void {
  'worklet';

  if (!job || !walletId) {
    return;
  }

  const context = job.signingContextsByWalletId[walletId];
  disposePortfolioTxHistorySigningDispatchContext(context);
  delete job.signingContextsByWalletId[walletId];
}

function clearAllJobSigningContexts(job: WorkletPopulateJob | undefined): void {
  'worklet';

  if (!job) {
    return;
  }

  for (const walletId of Object.keys(job.signingContextsByWalletId)) {
    clearJobSigningContextForWallet(job, walletId);
  }
  job.signingContextsByWalletId = {};
}

function sanitizePopulateJobWalletForRuntime(wallet: any): any {
  'worklet';

  return {
    walletId: String(
      wallet?.walletId || wallet?.summary?.walletId || '',
    ).trim(),
    addedAt: wallet?.addedAt,
    summary: wallet?.summary,
    credentials: toPortfolioRuntimeWalletCredentials(wallet?.credentials),
  };
}

function sanitizePopulateJobStartParams(
  params: PortfolioPopulateJobStartParams,
): PortfolioPopulateJobStartParams {
  'worklet';

  return {
    ...params,
    wallets: Array.isArray(params.wallets)
      ? params.wallets.map(sanitizePopulateJobWalletForRuntime)
      : [],
  } as PortfolioPopulateJobStartParams;
}

function createJob(args: {
  state: PortfolioPopulateJobWorkletState;
  params: PortfolioPopulateJobStartParams;
  signingContextsByWalletId?: PortfolioPopulateJobSigningContextMap;
}): WorkletPopulateJob {
  'worklet';

  const ordinal = Math.max(1, Math.floor(args.state.nextJobOrdinal || 1));
  args.state.nextJobOrdinal = ordinal + 1;
  const startedAt = nowMs();
  const requestedJobId = String(args.params.jobId || '').trim();
  const jobId = requestedJobId || `portfolio-populate-${startedAt}-${ordinal}`;

  return {
    jobId,
    state: 'queued',
    inProgress: true,
    startedAt,
    currentWalletId: undefined,
    walletsTotal: Array.isArray(args.params.wallets)
      ? args.params.wallets.length
      : 0,
    walletsCompleted: 0,
    txRequestsMade: 0,
    txsProcessed: 0,
    walletStatusById: {},
    errors: [],
    disabledForLargeHistory: false,
    failureMessage: undefined,
    results: [],
    cancelRequested: false,
    lastUpdatedAt: startedAt,
    signingContextsByWalletId: cloneSigningContextMapForJob(
      args.signingContextsByWalletId,
    ),
  };
}

function getOrCreatePortfolioPopulateJobWorkletState(config: {
  storageId?: string;
  registryKey?: string;
}): PortfolioPopulateJobWorkletState {
  'worklet';

  const globalRef = globalThis as GlobalWithPortfolioPopulateJobState;
  const existing = globalRef[PORTFOLIO_POPULATE_JOB_GLOBAL_KEY];
  if (existing) {
    const sameStorageId = existing.storageId === config.storageId;
    const sameRegistryKey = existing.registryKey === config.registryKey;
    if (!sameStorageId || !sameRegistryKey) {
      throw new Error(
        'Portfolio populate job worklet is already initialized with a different MMKV configuration.',
      );
    }
    return existing;
  }

  const created: PortfolioPopulateJobWorkletState = {
    activeJob: undefined,
    storageId: config.storageId,
    registryKey: config.registryKey,
    nextJobOrdinal: 1,
  };
  globalRef[PORTFOLIO_POPULATE_JOB_GLOBAL_KEY] = created;
  return created;
}

export function getActivePortfolioPopulateJobStatusOnWorklet(config: {
  storageId?: string;
  registryKey?: string;
}): PortfolioPopulateJobStatus | null {
  'worklet';

  const state = getOrCreatePortfolioPopulateJobWorkletState(config);
  return state.activeJob ? toJobStatus(state.activeJob) : null;
}

export function resetPortfolioPopulateJobWorkletState(
  config: PortfolioPopulateWorkletConfig,
): void {
  'worklet';

  const state = getOrCreatePortfolioPopulateJobWorkletState(config);
  clearAllJobSigningContexts(state.activeJob);
  clearPortfolioTxHistorySigningDispatchContextOnRuntime();
  const populateState = getOrCreatePortfolioPopulateWorkletState(config);
  for (const walletId of Object.keys(populateState.sessionsByWalletId)) {
    delete populateState.sessionsByWalletId[walletId];
  }
  state.activeJob = undefined;
}

export function isPortfolioPopulateJobInProgressOnWorklet(config: {
  storageId?: string;
  registryKey?: string;
}): boolean {
  'worklet';

  const status = getActivePortfolioPopulateJobStatusOnWorklet(config);
  return status?.inProgress === true;
}

function ensureActiveJobMatches(
  state: PortfolioPopulateJobWorkletState,
  jobId?: string,
): WorkletPopulateJob | null {
  'worklet';

  const job = state.activeJob;
  if (!job) {
    return null;
  }

  if (!jobId) {
    return job;
  }

  return job.jobId === jobId ? job : null;
}

function withWalletSigningContext<T>(
  job: WorkletPopulateJob,
  walletId: string,
  options: {requiresSigning: boolean},
  task: () => Promise<T>,
): Promise<T> {
  'worklet';

  const storedContext = job.signingContextsByWalletId[walletId];
  if (!storedContext) {
    throw new Error('Portfolio runtime request context is unavailable.');
  }

  if (
    options.requiresSigning &&
    !portfolioTxHistorySigningDispatchContextHasSigningAuthority(storedContext)
  ) {
    throw new Error('Portfolio txhistory signing context is unavailable.');
  }

  const signingContext = options.requiresSigning
    ? storedContext
    : buildFetchOnlySigningContext(storedContext);

  return (async () => {
    setPortfolioTxHistorySigningDispatchContextOnRuntime(signingContext);
    try {
      return await task();
    } finally {
      clearPortfolioTxHistorySigningDispatchContextOnRuntime();
    }
  })();
}

async function runSingleWalletPopulateOnWorklet(args: {
  config: PortfolioPopulateWorkletConfig;
  job: WorkletPopulateJob;
  params: PortfolioPopulateJobStartParams;
  walletIndex: number;
}): Promise<PortfolioPopulateWalletRunResult> {
  'worklet';

  const {config, job, params, walletIndex} = args;
  const wallet = params.wallets[walletIndex];
  const walletId = String(
    wallet?.summary?.walletId || wallet?.walletId || '',
  ).trim();
  const walletRun = createWalletRunResult(walletId || 'unknown');
  const populateState = getOrCreatePortfolioPopulateWorkletState(config);

  if (!walletId) {
    throw new Error(
      'Portfolio populate job received a wallet without walletId.',
    );
  }

  job.currentWalletId = walletId;
  markWalletStatus(job, walletId, 'in_progress');

  if (job.cancelRequested) {
    walletRun.cancelled = true;
    return walletRun;
  }

  try {
    walletRun.prepared = await withWalletSigningContext(
      job,
      walletId,
      {requiresSigning: false},
      () =>
        handlePrepareWalletOnPopulateWorklet(config, populateState, {
          cfg: params.cfg,
          wallet: wallet.summary,
          credentials: wallet.credentials,
          ingest: params.ingest,
          pageSize: params.pageSize,
          emitRows: params.emitRows,
        }),
    );
  } catch (error: unknown) {
    try {
      await handleCloseWalletSessionOnPopulateWorklet(populateState, walletId);
    } catch {
      // Ignore cleanup failures while propagating the original error.
    }
    throw error;
  }

  try {
    while (!job.cancelRequested) {
      const result = await withWalletSigningContext(
        job,
        walletId,
        {requiresSigning: true},
        () =>
          handleProcessNextPageOnPopulateWorklet(
            config,
            populateState,
            walletId,
          ),
      );

      walletRun.processResults.push({...result});
      walletRun.appendedSnapshots += Number(result.appendedSnapshots || 0);
      walletRun.txsProcessed += Number(result.logicalPageSize || 0);
      job.txsProcessed += Number(result.logicalPageSize || 0);

      const countedAsNetworkRequest =
        Number(result.fetchMs || 0) > 0 ||
        Number(result.fetchedTxs || 0) > 0 ||
        (result.done && Number(result.logicalPageSize || 0) === 0);
      if (countedAsNetworkRequest) {
        walletRun.txRequestsMade += 1;
        job.txRequestsMade += 1;
      }

      touchJob(job);

      if (job.cancelRequested) {
        walletRun.cancelled = true;
        await handleCloseWalletSessionOnPopulateWorklet(
          populateState,
          walletId,
        );
        break;
      }

      if (result.done) {
        break;
      }
    }

    if (job.cancelRequested && !walletRun.cancelled) {
      walletRun.cancelled = true;
      await handleCloseWalletSessionOnPopulateWorklet(populateState, walletId);
    } else if (!walletRun.cancelled) {
      walletRun.finished = await handleFinishWalletOnPopulateWorklet(
        config,
        populateState,
        walletId,
      );
      walletRun.appendedSnapshots += Number(
        walletRun.finished?.appendedSnapshots || 0,
      );
    }
  } catch (error: unknown) {
    try {
      await handleCloseWalletSessionOnPopulateWorklet(populateState, walletId);
    } catch {
      // Ignore cleanup failures while propagating the original error.
    }
    throw error;
  }

  return walletRun;
}

async function runPortfolioPopulateJobLoop(args: {
  config: PortfolioPopulateWorkletConfig;
  state: PortfolioPopulateJobWorkletState;
  job: WorkletPopulateJob;
  params: PortfolioPopulateJobStartParams;
}): Promise<void> {
  'worklet';

  const {config, state, job, params} = args;

  job.state = 'running';
  touchJob(job);

  try {
    for (
      let walletIndex = 0;
      walletIndex < params.wallets.length;
      walletIndex += 1
    ) {
      if (job.cancelRequested) {
        break;
      }

      const wallet = params.wallets[walletIndex];
      const walletId = String(
        wallet?.summary?.walletId || wallet?.walletId || '',
      ).trim();
      if (!walletId) {
        continue;
      }

      try {
        const walletRun = await runSingleWalletPopulateOnWorklet({
          config,
          job,
          params,
          walletIndex,
        });
        job.results.push(cloneWalletRunResult(walletRun));
        job.walletsCompleted += 1;

        if (walletRun.cancelled) {
          markWalletStatus(job, walletId, undefined);
          break;
        }

        markWalletStatus(job, walletId, 'done');
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : String(error || 'Unknown error');
        try {
          await clearWorkletWalletSnapshots(
            {
              storage: config.storage,
              registryKey: config.registryKey,
            },
            walletId,
            {
              preserveInvalidHistoryMarker:
                isSnapshotInvalidHistoryError(error),
            },
          );
        } catch {
          // Ignore cleanup failures so the job can continue with the next wallet.
        }
        markWalletStatus(job, walletId, 'error');
        appendJobError(job, walletId, message);
      } finally {
        clearJobSigningContextForWallet(job, walletId);
      }
    }

    if (job.cancelRequested) {
      job.state = 'cancelled';
    } else {
      job.state = 'completed';
    }
  } catch (error: unknown) {
    job.state = 'failed';
    job.failureMessage =
      error instanceof Error ? error.message : String(error || 'Unknown error');
    if (job.currentWalletId) {
      markWalletStatus(job, job.currentWalletId, 'error');
      appendJobError(job, job.currentWalletId, job.failureMessage);
    }
  } finally {
    if (job.currentWalletId) {
      try {
        await handleCloseWalletSessionOnPopulateWorklet(
          getOrCreatePortfolioPopulateWorkletState(config),
          job.currentWalletId,
        );
      } catch {
        // Ignore terminal session cleanup failures.
      }
    }
    clearAllJobSigningContexts(job);
    job.inProgress = false;
    job.currentWalletId = undefined;
    job.finishedAt = nowMs();
    touchJob(job);
    state.activeJob = job;
    clearPortfolioTxHistorySigningDispatchContextOnRuntime();
  }
}

export function canHandlePortfolioPopulateJobRequestOnRuntime(
  method: WorkerMethod,
): boolean {
  'worklet';

  return (
    method === 'populate.startJob' ||
    method === 'populate.getJobStatus' ||
    method === 'populate.cancelJob'
  );
}

export async function handleStartPopulateJobOnWorklet(
  config: PortfolioPopulateWorkletConfig,
  params: PortfolioPopulateJobStartParams,
  signingContextsByWalletId?: PortfolioPopulateJobSigningContextMap,
): Promise<PortfolioPopulateJobStartResult> {
  'worklet';

  const state = getOrCreatePortfolioPopulateJobWorkletState(config);
  const active = state.activeJob;
  if (active?.inProgress) {
    throw new Error(
      `Portfolio populate job ${active.jobId} is already running on the worklet runtime.`,
    );
  }

  const runtimeParams = sanitizePopulateJobStartParams(params);
  const job = createJob({
    state,
    params: runtimeParams,
    signingContextsByWalletId,
  });
  state.activeJob = job;

  runPortfolioPopulateJobLoop({
    config,
    state,
    job,
    params: runtimeParams,
  }).catch((error: unknown) => {
    clearAllJobSigningContexts(job);
    clearPortfolioTxHistorySigningDispatchContextOnRuntime();
    job.state = 'failed';
    job.inProgress = false;
    job.finishedAt = nowMs();
    job.failureMessage =
      error instanceof Error ? error.message : String(error || 'Unknown error');
    touchJob(job);
    state.activeJob = job;
  });

  return {
    jobId: job.jobId,
    status: toJobStatus(job),
  };
}

export async function handleGetPopulateJobStatusOnWorklet(
  config: PortfolioPopulateWorkletConfig,
  jobId?: string,
): Promise<PortfolioPopulateJobStatus | null> {
  'worklet';

  const state = getOrCreatePortfolioPopulateJobWorkletState(config);
  const job = ensureActiveJobMatches(state, jobId);
  return job ? toJobStatus(job) : null;
}

export async function handleCancelPopulateJobOnWorklet(
  config: PortfolioPopulateWorkletConfig,
  jobId?: string,
): Promise<PortfolioPopulateJobStatus | null> {
  'worklet';

  const state = getOrCreatePortfolioPopulateJobWorkletState(config);
  const job = ensureActiveJobMatches(state, jobId);
  if (!job) {
    return null;
  }

  if (job.inProgress) {
    job.cancelRequested = true;
    clearAllJobSigningContexts(job);
    clearPortfolioTxHistorySigningDispatchContextOnRuntime();
    if (job.currentWalletId) {
      try {
        await handleCloseWalletSessionOnPopulateWorklet(
          getOrCreatePortfolioPopulateWorkletState(config),
          job.currentWalletId,
        );
      } catch {
        // Ignore cancellation cleanup failures.
      }
    }
    touchJob(job);
  }

  return toJobStatus(job);
}

export async function handlePortfolioPopulateJobRequestOnRuntime(
  config: PortfolioPopulateWorkletConfig,
  request: WorkerRequest,
  signingContextsByWalletId?: PortfolioPopulateJobSigningContextMap,
): Promise<WorkerResponse> {
  'worklet';

  try {
    switch (request.method) {
      case 'populate.startJob': {
        const result = await handleStartPopulateJobOnWorklet(
          config,
          request.params as PortfolioPopulateJobStartParams,
          signingContextsByWalletId,
        );
        return {
          id: request.id,
          ok: true,
          result,
        } as WorkerResponse;
      }

      case 'populate.getJobStatus': {
        const result = await handleGetPopulateJobStatusOnWorklet(
          config,
          String((request.params as {jobId?: string})?.jobId || '') ||
            undefined,
        );
        return {
          id: request.id,
          ok: true,
          result,
        } as WorkerResponse;
      }

      case 'populate.cancelJob': {
        const result = await handleCancelPopulateJobOnWorklet(
          config,
          String((request.params as {jobId?: string})?.jobId || '') ||
            undefined,
        );
        return {
          id: request.id,
          ok: true,
          result,
        } as WorkerResponse;
      }

      default:
        throw new Error(
          `Unsupported portfolio populate job worklet method: ${String(
            request.method,
          )}`,
        );
    }
  } catch (error: unknown) {
    const runtimeError =
      error instanceof Error ? error : new Error(String(error));
    return {
      id: request.id,
      ok: false,
      error: runtimeError.message || String(runtimeError),
      stack: runtimeError.stack,
    } as WorkerResponse;
  }
}

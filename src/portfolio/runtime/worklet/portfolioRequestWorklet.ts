import type {
  WorkerMethod,
  WorkerRequest,
  WorkerResponse,
} from '../../core/engine/workerProtocol';
import {DEFAULT_PORTFOLIO_MMKV_REGISTRY_KEY} from '../../adapters/rn/mmkvKvStore';
import type {WorkletMmkvStorageBridge} from '../../adapters/rn/mmkvKvStore';
import {
  handleCloseWalletSessionOnPopulateWorklet,
  handleFinishWalletOnPopulateWorklet,
  handlePrepareWalletOnPopulateWorklet,
  handleProcessNextPageOnPopulateWorklet,
  getOrCreatePortfolioPopulateWorkletState,
  runSerialOnPopulateWorklet,
} from './portfolioPopulateWorklet';
import {
  canHandlePortfolioPopulateJobRequestOnRuntime,
  getActivePortfolioPopulateJobStatusOnWorklet,
  handlePortfolioPopulateJobRequestOnRuntime,
  isPortfolioPopulateJobInProgressOnWorklet,
  resetPortfolioPopulateJobWorkletState,
  type PortfolioPopulateJobSigningContextMap,
} from './portfolioPopulateJobWorklet';
import {
  clearWorkletRates,
  ensureWorkletRates,
  getWorkletRateSeriesCache,
  listWorkletRates,
} from './portfolioWorkletRates';
import {
  clearWorkletWalletSnapshots,
  loadWorkletInvalidHistoryMarker,
  getWorkletLatestSnapshot,
  listWorkletSnapshots,
  loadWorkletSnapshotIndex,
} from './portfolioWorkletSnapshots';
import {
  workletKvClearAll,
  workletKvGetString,
  workletKvListKeys,
  type PortfolioWorkletKvConfig,
} from './portfolioWorkletKv';
import {
  clearWorkletAnalysisSessions,
  computeWorkletBalanceChartViewModel,
  computeWorkletAnalysis,
  computeWorkletAnalysisChart,
  computeWorkletAnalysisSessionScope,
  disposeWorkletAnalysisSession,
  prepareWorkletAnalysisSession,
} from './portfolioWorkletAnalysis';

export type PortfolioWorkletRequestConfig = {
  storage: WorkletMmkvStorageBridge;
  storageId?: string;
  registryKey?: string;
};

const WORKLET_METHODS: Record<WorkerMethod, true> = {
  'rates.ensure': true,
  'rates.getCache': true,
  'snapshots.getIndex': true,
  'snapshots.clearWallet': true,
  'snapshots.prepareWallet': true,
  'snapshots.closeWalletSession': true,
  'snapshots.processNextPage': true,
  'snapshots.finishWallet': true,
  'snapshots.getLatestSnapshot': true,
  'snapshots.getInvalidHistory': true,
  'snapshots.listSnapshots': true,
  'analysis.compute': true,
  'analysis.prepareSession': true,
  'analysis.computeSessionScope': true,
  'analysis.disposeSession': true,
  'analysis.computeChart': true,
  'analysis.computeBalanceChartViewModel': true,
  'populate.startJob': true,
  'populate.getJobStatus': true,
  'populate.cancelJob': true,
  'debug.listRates': true,
  'debug.clearRates': true,
  'debug.clearAll': true,
  'debug.kvStats': true,
  'debug.getPopulateWalletTrace': true,
};

function clonePortableForRnBridge<T>(value: T): T {
  'worklet';

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function getKvConfig(
  config: PortfolioWorkletRequestConfig,
): PortfolioWorkletKvConfig {
  'worklet';

  return {
    storage: config.storage,
    registryKey: config.registryKey,
  };
}

function clearInMemoryPopulateSessions(
  config: PortfolioWorkletRequestConfig,
): void {
  'worklet';

  const state = getOrCreatePortfolioPopulateWorkletState(config);
  for (const walletId of Object.keys(state.sessionsByWalletId)) {
    delete state.sessionsByWalletId[walletId];
  }
}

function getRegistryKey(config: PortfolioWorkletRequestConfig): string {
  'worklet';
  return config.registryKey || DEFAULT_PORTFOLIO_MMKV_REGISTRY_KEY;
}

function getWorkletKvStats(config: PortfolioWorkletRequestConfig): {
  totalKeys: number;
  totalBytes: number;
  snapKeys: number;
  snapBytes: number;
  rateKeys: number;
  rateBytes: number;
  otherKeys: number;
  otherBytes: number;
} {
  'worklet';

  const keys = workletKvListKeys(getKvConfig(config));
  const out = {
    totalKeys: keys.length,
    totalBytes: 0,
    snapKeys: 0,
    snapBytes: 0,
    rateKeys: 0,
    rateBytes: 0,
    otherKeys: 0,
    otherBytes: 0,
  };

  for (const key of keys) {
    const raw = workletKvGetString(getKvConfig(config), key);
    const bytes = raw ? raw.length : 0;
    out.totalBytes += bytes;
    if (key.startsWith('snap:')) {
      out.snapKeys += 1;
      out.snapBytes += bytes;
    } else if (key.startsWith('rate:')) {
      out.rateKeys += 1;
      out.rateBytes += bytes;
    } else {
      out.otherKeys += 1;
      out.otherBytes += bytes;
    }
  }

  const registryRaw = config.storage.getString(getRegistryKey(config));
  if (registryRaw) {
    const bytes = registryRaw.length;
    out.totalKeys += 1;
    out.totalBytes += bytes;
    out.otherKeys += 1;
    out.otherBytes += bytes;
  }

  return out;
}

function assertNoActivePopulateJobForMutatingRequest(
  config: PortfolioWorkletRequestConfig,
  method: WorkerMethod,
): void {
  'worklet';

  const isMutatingMethod =
    method === 'snapshots.clearWallet' ||
    method === 'snapshots.prepareWallet' ||
    method === 'snapshots.closeWalletSession' ||
    method === 'snapshots.processNextPage' ||
    method === 'snapshots.finishWallet' ||
    method === 'debug.clearRates' ||
    method === 'debug.clearAll';

  if (!isMutatingMethod) {
    return;
  }

  if (isPortfolioPopulateJobInProgressOnWorklet(config)) {
    throw new Error(
      `Portfolio request ${String(
        method,
      )} is unavailable while a background populate job is running.`,
    );
  }
}

export function canHandlePortfolioRequestOnRuntime(
  method: WorkerMethod,
): boolean {
  'worklet';

  return WORKLET_METHODS[method] === true;
}

export async function handlePortfolioRequestOnRuntime(
  config: PortfolioWorkletRequestConfig,
  request: WorkerRequest,
  populateJobSigningContextsByWalletId?: PortfolioPopulateJobSigningContextMap,
): Promise<WorkerResponse> {
  'worklet';

  const state = getOrCreatePortfolioPopulateWorkletState(config);
  const kvConfig = getKvConfig(config);

  return runSerialOnPopulateWorklet(state, async () => {
    try {
      if (canHandlePortfolioPopulateJobRequestOnRuntime(request.method)) {
        return handlePortfolioPopulateJobRequestOnRuntime(
          config,
          request,
          populateJobSigningContextsByWalletId,
        );
      }

      assertNoActivePopulateJobForMutatingRequest(config, request.method);

      switch (request.method) {
        case 'rates.ensure': {
          await ensureWorkletRates({
            ...kvConfig,
            ...(request.params as any),
          });
          return {
            id: request.id,
            ok: true,
            result: undefined,
          } as WorkerResponse;
        }

        case 'rates.getCache': {
          const result = await getWorkletRateSeriesCache({
            ...kvConfig,
            ...(request.params as any),
          });
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'snapshots.getIndex': {
          const result = await loadWorkletSnapshotIndex(
            kvConfig,
            String((request.params as any)?.walletId || ''),
          );
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'snapshots.clearWallet': {
          const walletId = String((request.params as any)?.walletId || '');
          delete state.sessionsByWalletId[walletId];
          await clearWorkletWalletSnapshots(kvConfig, walletId);
          return {
            id: request.id,
            ok: true,
            result: undefined,
          } as WorkerResponse;
        }

        case 'snapshots.prepareWallet': {
          const result = await handlePrepareWalletOnPopulateWorklet(
            config,
            state,
            request.params as any,
          );
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'snapshots.closeWalletSession': {
          await handleCloseWalletSessionOnPopulateWorklet(
            state,
            String((request.params as any)?.walletId || ''),
          );
          return {
            id: request.id,
            ok: true,
            result: undefined,
          } as WorkerResponse;
        }

        case 'snapshots.processNextPage': {
          const result = await handleProcessNextPageOnPopulateWorklet(
            config,
            state,
            String((request.params as any)?.walletId || ''),
          );
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'snapshots.finishWallet': {
          const result = await handleFinishWalletOnPopulateWorklet(
            config,
            state,
            String((request.params as any)?.walletId || ''),
          );
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'snapshots.getLatestSnapshot': {
          const result = await getWorkletLatestSnapshot(
            kvConfig,
            String((request.params as any)?.walletId || ''),
          );
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'snapshots.getInvalidHistory': {
          const result = await loadWorkletInvalidHistoryMarker(
            kvConfig,
            String((request.params as any)?.walletId || ''),
          );
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'snapshots.listSnapshots': {
          const result = await listWorkletSnapshots(
            kvConfig,
            String((request.params as any)?.walletId || ''),
          );
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'analysis.compute': {
          const rawResult = await computeWorkletAnalysis(
            kvConfig,
            request.params as any,
          );
          const result = clonePortableForRnBridge(rawResult);
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'analysis.prepareSession': {
          const result = await prepareWorkletAnalysisSession(
            kvConfig,
            request.params as any,
          );
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'analysis.computeSessionScope': {
          const rawResult = await computeWorkletAnalysisSessionScope(
            kvConfig,
            request.params as any,
          );
          const result = clonePortableForRnBridge(rawResult);
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'analysis.disposeSession': {
          disposeWorkletAnalysisSession(request.params as any);
          return {
            id: request.id,
            ok: true,
            result: undefined,
          } as WorkerResponse;
        }

        case 'analysis.computeChart': {
          const rawResult = await computeWorkletAnalysisChart(
            kvConfig,
            request.params as any,
          );
          const result = clonePortableForRnBridge(rawResult);
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'analysis.computeBalanceChartViewModel': {
          const rawResult = await computeWorkletBalanceChartViewModel(
            kvConfig,
            request.params as any,
          );
          const result = clonePortableForRnBridge(rawResult);
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'debug.listRates': {
          const result = listWorkletRates({
            ...kvConfig,
            ...(request.params as any),
          });
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'debug.clearRates': {
          clearWorkletRates({
            ...kvConfig,
            ...(request.params as any),
          });
          return {
            id: request.id,
            ok: true,
            result: undefined,
          } as WorkerResponse;
        }

        case 'debug.clearAll': {
          const activePopulateJob =
            getActivePortfolioPopulateJobStatusOnWorklet(config);
          if (activePopulateJob?.inProgress) {
            throw new Error(
              'Cannot clear portfolio storage while a background populate job is running.',
            );
          }
          clearWorkletAnalysisSessions();
          clearInMemoryPopulateSessions(config);
          resetPortfolioPopulateJobWorkletState(config);
          workletKvClearAll(kvConfig);
          return {
            id: request.id,
            ok: true,
            result: undefined,
          } as WorkerResponse;
        }

        case 'debug.kvStats': {
          const result = getWorkletKvStats(config);
          return {
            id: request.id,
            ok: true,
            result,
          } as WorkerResponse;
        }

        case 'debug.getPopulateWalletTrace': {
          return {
            id: request.id,
            ok: true,
            result: null,
          } as WorkerResponse;
        }

        default:
          throw new Error(
            `Unsupported portfolio worklet method: ${String(request.method)}`,
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
  });
}

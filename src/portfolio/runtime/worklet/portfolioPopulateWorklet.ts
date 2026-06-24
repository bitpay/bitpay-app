import type {WalletSummary, Tx} from '../../core/types';
import {
  toPortfolioRuntimeWalletCredentials,
  type PortfolioRuntimeWalletCredentials,
} from '../../core/runtimeWalletCredentials';
import type {
  PrepareWalletSessionResult,
  ProcessNextPageSessionResult,
  FinishWalletSessionResult,
  SnapshotIngestConfig,
} from '../../core/engine/portfolioEngineTypes';
import {
  isSnapshotInvalidHistoryError,
  toSnapshotInvalidHistoryMarker,
} from '../../core/pnl/invalidHistory';
import {
  dedupeTxHistoryPage,
  getTxHistoryLogicalPageSize,
} from '../../core/txHistoryPaging';
import type {BwsConfig} from '../../core/shared/bws';
import {DEFAULT_PORTFOLIO_MMKV_REGISTRY_KEY} from '../../adapters/rn/mmkvKvStore';
import type {WorkletMmkvStorageBridge} from '../../adapters/rn/mmkvKvStore';
import {fetchPortfolioTxHistoryPageByRequest} from '../../adapters/rn/txHistoryRequest';
import {
  appendWorkletSnapshotChunk,
  clearWorkletInvalidHistoryMarker,
  clearWorkletWalletSnapshots,
  buildWorkletWalletMetaForStore,
  ensureWorkletWalletIndex,
  loadWorkletInvalidHistoryMarker,
  saveWorkletInvalidHistoryMarker,
  updateWorkletSnapshotCheckpoint,
} from './portfolioWorkletSnapshots';
import {
  createPortfolioSnapshotBuilderState,
  getPortfolioSnapshotBuilderCheckpoint,
  portfolioSnapshotBuilderFinish,
  portfolioSnapshotBuilderFlushPendingCarryoverGroup,
  portfolioSnapshotBuilderHasPendingCarryoverGroup,
  portfolioSnapshotBuilderIngestPageWithSnapshotLimit,
  type PortfolioSnapshotBuilderState,
} from './portfolioWorkletSnapshotBuilder';
import {ensureWorkletSnapshotRateSeriesCache} from './portfolioWorkletRates';
import type {PortfolioWorkletKvConfig} from './portfolioWorkletKv';

export type PortfolioPopulateWorkletConfig = {
  storage: WorkletMmkvStorageBridge;
  storageId?: string;
  registryKey?: string;
};

export type PortfolioPopulateWorkletSession = {
  createdAtMs: number;
  wallet: WalletSummary;
  credentials: PortfolioRuntimeWalletCredentials;
  builder: PortfolioSnapshotBuilderState;
  meta: ReturnType<typeof buildWorkletWalletMetaForStore>;
  fetch: {
    cfg: BwsConfig;
    pageSize: number;
    emitRows: number | null;
    pendingTxs: Tx[];
  };
};

export type PortfolioPopulateWorkletState = {
  sessionsByWalletId: Record<
    string,
    PortfolioPopulateWorkletSession | undefined
  >;
  serialTail?: Promise<void>;
  storageId?: string;
  registryKey?: string;
};

type GlobalWithPortfolioPopulateState = typeof globalThis & {
  __bitpayPortfolioPopulateWorkletStateV1__?: PortfolioPopulateWorkletState;
};

const PORTFOLIO_POPULATE_STATE_GLOBAL_KEY =
  '__bitpayPortfolioPopulateWorkletStateV1__';

export function getOrCreatePortfolioPopulateWorkletState(
  config: PortfolioPopulateWorkletConfig,
): PortfolioPopulateWorkletState {
  'worklet';

  const globalWithState = globalThis as GlobalWithPortfolioPopulateState;
  const normalizedRegistryKey =
    config.registryKey || DEFAULT_PORTFOLIO_MMKV_REGISTRY_KEY;
  const existing = globalWithState[PORTFOLIO_POPULATE_STATE_GLOBAL_KEY];

  if (existing) {
    const sameStorageId = existing.storageId === config.storageId;
    const sameRegistryKey = existing.registryKey === normalizedRegistryKey;
    if (!sameStorageId || !sameRegistryKey) {
      throw new Error(
        'Portfolio populate worklet is already initialized with a different MMKV configuration.',
      );
    }
    return existing;
  }

  const created: PortfolioPopulateWorkletState = {
    sessionsByWalletId: {},
    storageId: config.storageId,
    registryKey: normalizedRegistryKey,
  };

  globalWithState[PORTFOLIO_POPULATE_STATE_GLOBAL_KEY] = created;
  return created;
}

function getKvConfig(
  config: PortfolioPopulateWorkletConfig,
): PortfolioWorkletKvConfig {
  'worklet';

  return {
    storage: config.storage,
    registryKey: config.registryKey,
  };
}

export function runSerialOnPopulateWorklet<T>(
  state: PortfolioPopulateWorkletState,
  task: () => Promise<T>,
): Promise<T> {
  'worklet';

  const tail = state.serialTail || Promise.resolve();
  const next = tail.then(task, task);
  state.serialTail = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function isFinitePositiveInteger(value: unknown): boolean {
  'worklet';
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function normalizeEmitRows(value: unknown): number | null {
  'worklet';

  if (!isFinitePositiveInteger(value)) {
    return null;
  }
  return Math.trunc(Number(value));
}

function requireSession(
  state: PortfolioPopulateWorkletState,
  walletId: string,
): PortfolioPopulateWorkletSession {
  'worklet';

  const session = state.sessionsByWalletId[walletId];
  if (!session) {
    throw new Error(
      `Wallet session not prepared for background fetch: ${walletId}`,
    );
  }
  return session;
}

export async function handlePrepareWalletOnPopulateWorklet(
  config: PortfolioPopulateWorkletConfig,
  state: PortfolioPopulateWorkletState,
  params: {
    cfg: BwsConfig;
    wallet: WalletSummary;
    credentials: PortfolioRuntimeWalletCredentials;
    ingest: SnapshotIngestConfig;
    pageSize: number;
    emitRows?: number;
  },
): Promise<PrepareWalletSessionResult> {
  'worklet';

  const credentials = toPortfolioRuntimeWalletCredentials(params.credentials);
  const meta = buildWorkletWalletMetaForStore({
    wallet: params.wallet,
    credentials: credentials as any,
    quoteCurrency: params.ingest.quoteCurrency,
    compressionEnabled: params.ingest.compressionEnabled,
    chunkRows: params.ingest.chunkRows,
  });

  const kvConfig = getKvConfig(config);
  const index = await ensureWorkletWalletIndex(kvConfig, meta);
  const fiatRateSeriesCache = await ensureWorkletSnapshotRateSeriesCache({
    ...kvConfig,
    cfg: params.cfg,
    quoteCurrency: params.ingest.quoteCurrency,
    wallet: params.wallet,
  });

  const builder = createPortfolioSnapshotBuilderState({
    wallet: params.wallet,
    credentials: credentials as any,
    quoteCurrency: params.ingest.quoteCurrency,
    fiatRateSeriesCache,
    compressionEnabled: params.ingest.compressionEnabled,
    checkpoint: index.checkpoint,
  });

  state.sessionsByWalletId[params.wallet.walletId] = {
    createdAtMs: Date.now(),
    wallet: params.wallet,
    credentials,
    builder,
    meta,
    fetch: {
      cfg: params.cfg,
      pageSize: Math.max(1, Math.trunc(Number(params.pageSize || 1))),
      emitRows: normalizeEmitRows(params.emitRows),
      pendingTxs: [],
    },
  };

  return {
    checkpoint: getPortfolioSnapshotBuilderCheckpoint(builder),
  };
}

export async function handleCloseWalletSessionOnPopulateWorklet(
  state: PortfolioPopulateWorkletState,
  walletId: string,
): Promise<void> {
  'worklet';

  delete state.sessionsByWalletId[walletId];
}

async function handleInvalidHistoryOnPopulateWorklet(args: {
  config: PortfolioPopulateWorkletConfig;
  state: PortfolioPopulateWorkletState;
  walletId: string;
  error: unknown;
}): Promise<void> {
  'worklet';

  if (!isSnapshotInvalidHistoryError(args.error)) {
    return;
  }

  const kvConfig = getKvConfig(args.config);
  const previousMarker = await loadWorkletInvalidHistoryMarker(
    kvConfig,
    args.walletId,
  );
  const detectedAt = Number.isFinite(Number(previousMarker?.detectedAt))
    ? Number(previousMarker?.detectedAt)
    : Date.now();
  const marker = toSnapshotInvalidHistoryMarker({
    walletId: args.walletId,
    error: args.error,
    detectedAt,
    lastAttemptedAt: Date.now(),
  });
  if (marker) {
    await saveWorkletInvalidHistoryMarker(kvConfig, marker);
  }
  await clearWorkletWalletSnapshots(kvConfig, args.walletId, {
    preserveInvalidHistoryMarker: true,
  });
  delete args.state.sessionsByWalletId[args.walletId];
}

export async function handleProcessNextPageOnPopulateWorklet(
  config: PortfolioPopulateWorkletConfig,
  state: PortfolioPopulateWorkletState,
  walletId: string,
): Promise<ProcessNextPageSessionResult> {
  'worklet';

  try {
    const session = requireSession(state, walletId);
    const checkpoint = getPortfolioSnapshotBuilderCheckpoint(session.builder);
    const skip = checkpoint.nextSkip;
    const kvConfig = getKvConfig(config);

    while (true) {
      let txs = session.fetch.pendingTxs;
      let fetchedTxs = 0;
      let fetchMs = 0;

      if (!txs.length) {
        const fetchStartedAt = Date.now();
        txs = await fetchPortfolioTxHistoryPageByRequest({
          credentials: session.credentials,
          cfg: session.fetch.cfg,
          skip,
          limit: session.fetch.pageSize,
          reverse: true,
        });
        fetchMs = Math.max(0, Date.now() - fetchStartedAt);
        fetchedTxs = txs.length;
        session.fetch.pendingTxs = dedupeTxHistoryPage(txs);

        const logicalPageSize = txs.length
          ? getTxHistoryLogicalPageSize(txs)
          : 0;
        if (!txs.length || logicalPageSize <= 0) {
          session.fetch.pendingTxs = [];
          if (
            portfolioSnapshotBuilderHasPendingCarryoverGroup(session.builder)
          ) {
            const computeStartedAt = Date.now();
            const snapshots =
              portfolioSnapshotBuilderFlushPendingCarryoverGroup(
                session.builder,
              );
            const nextCheckpoint = getPortfolioSnapshotBuilderCheckpoint(
              session.builder,
            );
            if (snapshots.length) {
              await appendWorkletSnapshotChunk({
                ...kvConfig,
                meta: session.meta,
                snapshots,
                checkpoint: nextCheckpoint,
              });
            } else {
              await updateWorkletSnapshotCheckpoint({
                ...kvConfig,
                walletId,
                checkpoint: nextCheckpoint,
              });
            }
            return {
              checkpoint: nextCheckpoint,
              appendedSnapshots: snapshots.length,
              fetchedTxs,
              logicalPageSize,
              done: true,
              fetchMs,
              computeMs: Math.max(0, Date.now() - computeStartedAt),
            };
          }

          return {
            checkpoint: getPortfolioSnapshotBuilderCheckpoint(session.builder),
            appendedSnapshots: 0,
            fetchedTxs,
            logicalPageSize,
            done: true,
            fetchMs,
            computeMs: 0,
          };
        }
      }

      const computeStartedAt = Date.now();
      const consumed = portfolioSnapshotBuilderIngestPageWithSnapshotLimit(
        session.builder,
        session.fetch.pendingTxs,
        session.fetch.emitRows ?? undefined,
      );
      const nextCheckpoint = getPortfolioSnapshotBuilderCheckpoint(
        session.builder,
      );

      if (consumed.snapshots.length) {
        await appendWorkletSnapshotChunk({
          ...kvConfig,
          meta: session.meta,
          snapshots: consumed.snapshots,
          checkpoint: nextCheckpoint,
        });
      } else if (consumed.logicalPageSize > 0) {
        await updateWorkletSnapshotCheckpoint({
          ...kvConfig,
          walletId,
          checkpoint: nextCheckpoint,
        });
      }

      const consumedRawCount = Math.max(
        0,
        Math.min(
          session.fetch.pendingTxs.length,
          Number(consumed.consumedRawCount ?? 0),
        ),
      );
      session.fetch.pendingTxs =
        consumedRawCount > 0
          ? session.fetch.pendingTxs.slice(consumedRawCount)
          : [];

      if (!consumed.logicalPageSize && !consumed.snapshots.length) {
        if (!session.fetch.pendingTxs.length) {
          continue;
        }
      }

      return {
        checkpoint: nextCheckpoint,
        appendedSnapshots: consumed.snapshots.length,
        fetchedTxs,
        logicalPageSize: consumed.logicalPageSize,
        done: false,
        fetchMs,
        computeMs: Math.max(0, Date.now() - computeStartedAt),
      };
    }
  } catch (error: unknown) {
    await handleInvalidHistoryOnPopulateWorklet({
      config,
      state,
      walletId,
      error,
    });
    throw error;
  }
}

export async function handleFinishWalletOnPopulateWorklet(
  config: PortfolioPopulateWorkletConfig,
  state: PortfolioPopulateWorkletState,
  walletId: string,
): Promise<FinishWalletSessionResult> {
  'worklet';

  try {
    const session = requireSession(state, walletId);
    const snapshots = portfolioSnapshotBuilderFinish(session.builder);
    const checkpoint = getPortfolioSnapshotBuilderCheckpoint(session.builder);
    const kvConfig = getKvConfig(config);

    if (snapshots.length) {
      await appendWorkletSnapshotChunk({
        ...kvConfig,
        meta: session.meta,
        snapshots,
        checkpoint,
      });
    } else {
      await updateWorkletSnapshotCheckpoint({
        ...kvConfig,
        walletId,
        checkpoint,
      });
    }

    await clearWorkletInvalidHistoryMarker(kvConfig, walletId);
    delete state.sessionsByWalletId[walletId];

    return {
      checkpoint,
      appendedSnapshots: snapshots.length,
    };
  } catch (error: unknown) {
    await handleInvalidHistoryOnPopulateWorklet({
      config,
      state,
      walletId,
      error,
    });
    throw error;
  }
}

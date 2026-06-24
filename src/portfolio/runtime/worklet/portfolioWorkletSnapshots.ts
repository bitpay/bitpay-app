import {getAssetIdFromWallet} from '../../core/pnl/assetId';
import type {WalletCredentials, WalletSummary} from '../../core/types';
import type {BalanceSnapshotStored} from '../../core/pnl/types';
import type {SnapshotInvalidHistoryMarkerV1} from '../../core/pnl/invalidHistory';
import {SNAPSHOT_INVALID_HISTORY_VERSION} from '../../core/pnl/invalidHistory';
import type {
  SnapshotChunkV2,
  SnapshotIndexV2,
  SnapshotPersistInputV2,
  SnapshotPointV2,
  SnapshotPopulateCheckpointV1,
  SnapshotStoreWalletMeta,
  SnapshotWalletMetaV2,
} from '../../core/pnl/snapshotStore';
import {normalizeWalletUnitDecimals} from '../../core/format';
import {
  workletKvDelete,
  workletKvGetString,
  workletKvSetString,
  type PortfolioWorkletKvConfig,
} from './portfolioWorkletKv';

export function getWorkletSnapshotMetaStorageKey(walletId: string): string {
  'worklet';
  return `snap:meta:v2:${walletId}`;
}

export function getWorkletSnapshotIndexStorageKey(walletId: string): string {
  'worklet';
  return `snap:index:v2:${walletId}`;
}

export function getWorkletSnapshotChunkStorageKey(
  walletId: string,
  chunkId: number,
): string {
  'worklet';
  return `snap:chunk:v2:${walletId}:${chunkId}`;
}

export function getWorkletInvalidHistoryStorageKey(walletId: string): string {
  'worklet';
  return `snap:invalid-history:v1:${walletId}`;
}

function parseJson<T>(raw: string | null, fallback: T): T {
  'worklet';
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown): string {
  'worklet';
  try {
    return JSON.stringify(value);
  } catch {
    return 'null';
  }
}

function normalizeStoredMeta(
  meta: SnapshotStoreWalletMeta,
): SnapshotWalletMetaV2 {
  'worklet';

  const unitDecimals = normalizeWalletUnitDecimals(meta.unitDecimals);

  return {
    walletId: meta.walletId,
    chain: String(meta.chain || '').toLowerCase(),
    network: String(meta.network || '').toLowerCase(),
    coin: String(meta.currencyAbbreviation || '').toLowerCase(),
    assetId: getAssetIdFromWallet({
      chain: meta.chain,
      currencyAbbreviation: meta.currencyAbbreviation,
      tokenAddress: meta.tokenAddress,
    } as WalletSummary),
    quoteCurrency: String(meta.quoteCurrency || '').toUpperCase(),
    unitDecimals,
  };
}

function sameStoredMeta(
  left: SnapshotWalletMetaV2 | null,
  right: SnapshotWalletMetaV2,
): boolean {
  'worklet';

  if (!left) return false;
  return (
    left.walletId === right.walletId &&
    left.chain === right.chain &&
    left.network === right.network &&
    left.coin === right.coin &&
    left.assetId === right.assetId &&
    left.quoteCurrency === right.quoteCurrency &&
    left.unitDecimals === right.unitDecimals
  );
}

type OrderedSnapshotInput = {
  snapshot: SnapshotPersistInputV2;
  timestamp: number;
  originalIndex: number;
};

function orderSnapshotsForAppend(
  snapshots: SnapshotPersistInputV2[],
): OrderedSnapshotInput[] {
  'worklet';

  const ordered = snapshots.map((snapshot, originalIndex) => {
    const timestamp = Math.trunc(Number(snapshot.timestamp));
    if (!Number.isFinite(timestamp)) {
      throw new Error(`Invalid snapshot timestamp at row ${originalIndex}`);
    }

    return {
      snapshot,
      timestamp,
      originalIndex,
    };
  });

  let alreadyAscending = true;
  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i].timestamp < ordered[i - 1].timestamp) {
      alreadyAscending = false;
      break;
    }
  }

  if (alreadyAscending) {
    return ordered;
  }

  return ordered.slice().sort((left, right) => {
    if (left.timestamp !== right.timestamp) {
      return left.timestamp - right.timestamp;
    }
    return left.originalIndex - right.originalIndex;
  });
}

function fallbackHydratedSnapshotId(
  walletId: string,
  timestamp: number,
  rowIndex: number,
): string {
  'worklet';
  return `snap:${walletId}:${timestamp}:${rowIndex}`;
}

function toPoint(row: [number, string]): SnapshotPointV2 {
  'worklet';
  return {
    timestamp: Number(row[0]),
    cryptoBalance: String(row[1]),
  };
}

function hydrateRowToSnapshot(args: {
  meta: SnapshotWalletMetaV2;
  row: [number, string];
  rowIndex: number;
}): BalanceSnapshotStored {
  'worklet';

  const {meta, row, rowIndex} = args;

  const timestamp = Number(row[0]);
  const cryptoBalance = String(row[1]);
  const id = fallbackHydratedSnapshotId(meta.walletId, timestamp, rowIndex);

  const out: BalanceSnapshotStored = {
    id,
    walletId: meta.walletId,
    chain: meta.chain,
    network: meta.network,
    coin: meta.coin,
    assetId: meta.assetId,
    quoteCurrency: meta.quoteCurrency,
    timestamp,
    eventType: 'tx',
    cryptoBalance,
    remainingCostBasisFiat: 0,
    markRate: 0,
  };

  return out;
}

function fallbackMeta(walletId: string): SnapshotWalletMetaV2 {
  'worklet';
  return {
    walletId,
    chain: '',
    network: '',
    coin: '',
    assetId: '',
    quoteCurrency: '',
    unitDecimals: undefined,
  };
}

export function buildWorkletWalletMetaForStore(args: {
  wallet: WalletSummary;
  credentials: Pick<
    WalletCredentials,
    'walletId' | 'chain' | 'network' | 'coin' | 'token'
  >;
  quoteCurrency: string;
  compressionEnabled: boolean;
  chunkRows: number;
}): SnapshotStoreWalletMeta {
  'worklet';

  return {
    walletId: args.wallet.walletId,
    chain: String(args.wallet.chain || args.credentials.chain || ''),
    network: String(args.wallet.network || args.credentials.network || ''),
    currencyAbbreviation: String(
      args.wallet.currencyAbbreviation || args.credentials.coin || '',
    ),
    tokenAddress: args.wallet.tokenAddress,
    unitDecimals: normalizeWalletUnitDecimals(args.wallet.unitDecimals),
    quoteCurrency: args.quoteCurrency,
    compressionEnabled: args.compressionEnabled,
    chunkRows: args.chunkRows,
  };
}

export async function loadWorkletSnapshotIndex(
  config: PortfolioWorkletKvConfig,
  walletId: string,
): Promise<SnapshotIndexV2 | null> {
  'worklet';

  const index = parseJson<SnapshotIndexV2 | null>(
    workletKvGetString(config, getWorkletSnapshotIndexStorageKey(walletId)),
    null,
  );
  if (!index || index.v !== 2 || index.walletId !== walletId) {
    return null;
  }
  return index;
}

export async function loadWorkletSnapshotMeta(
  config: PortfolioWorkletKvConfig,
  walletId: string,
): Promise<SnapshotWalletMetaV2 | null> {
  'worklet';

  const meta = parseJson<SnapshotWalletMetaV2 | null>(
    workletKvGetString(config, getWorkletSnapshotMetaStorageKey(walletId)),
    null,
  );
  if (!meta || meta.walletId !== walletId) {
    return null;
  }
  return meta;
}

export async function loadWorkletSnapshotChunk(
  args: PortfolioWorkletKvConfig & {
    walletId: string;
    chunkId: number;
  },
): Promise<SnapshotChunkV2 | null> {
  'worklet';

  const chunk = parseJson<SnapshotChunkV2 | null>(
    workletKvGetString(
      args,
      getWorkletSnapshotChunkStorageKey(args.walletId, args.chunkId),
    ),
    null,
  );
  if (!chunk || chunk.v !== 2 || !Array.isArray(chunk.rows)) {
    return null;
  }
  return chunk;
}

async function saveWorkletSnapshotMeta(
  config: PortfolioWorkletKvConfig,
  meta: SnapshotWalletMetaV2,
): Promise<void> {
  'worklet';
  workletKvSetString(
    config,
    getWorkletSnapshotMetaStorageKey(meta.walletId),
    stringifyJson(meta),
  );
}

async function saveWorkletSnapshotIndex(
  config: PortfolioWorkletKvConfig,
  index: SnapshotIndexV2,
): Promise<void> {
  'worklet';
  index.updatedAt = Date.now();
  workletKvSetString(
    config,
    getWorkletSnapshotIndexStorageKey(index.walletId),
    stringifyJson(index),
  );
}

export async function clearWorkletWalletSnapshots(
  config: PortfolioWorkletKvConfig,
  walletId: string,
  opts?: {preserveInvalidHistoryMarker?: boolean},
): Promise<void> {
  'worklet';

  const index = await loadWorkletSnapshotIndex(config, walletId);
  for (const chunk of index?.chunks ?? []) {
    workletKvDelete(
      config,
      getWorkletSnapshotChunkStorageKey(walletId, chunk.id),
    );
  }

  workletKvDelete(config, `snap:index:v1:${walletId}`);
  workletKvDelete(config, getWorkletSnapshotIndexStorageKey(walletId));
  workletKvDelete(config, getWorkletSnapshotMetaStorageKey(walletId));
  if (opts?.preserveInvalidHistoryMarker !== true) {
    workletKvDelete(config, getWorkletInvalidHistoryStorageKey(walletId));
  }
}

export async function ensureWorkletWalletIndex(
  config: PortfolioWorkletKvConfig,
  meta: SnapshotStoreWalletMeta,
): Promise<SnapshotIndexV2> {
  'worklet';

  const existingIndex = await loadWorkletSnapshotIndex(config, meta.walletId);
  const existingMeta = await loadWorkletSnapshotMeta(config, meta.walletId);
  const storedMeta = normalizeStoredMeta(meta);

  if (
    existingIndex &&
    (!existingMeta || sameStoredMeta(existingMeta, storedMeta)) &&
    existingIndex.compressionEnabled === meta.compressionEnabled &&
    existingIndex.chunkRows === meta.chunkRows
  ) {
    if (!existingMeta) {
      await saveWorkletSnapshotMeta(config, storedMeta);
    }
    return existingIndex;
  }

  if (existingIndex || existingMeta) {
    await clearWorkletWalletSnapshots(config, meta.walletId, {
      preserveInvalidHistoryMarker: true,
    });
  }

  const index: SnapshotIndexV2 = {
    v: 2,
    walletId: meta.walletId,
    compressionEnabled: meta.compressionEnabled,
    chunkRows: meta.chunkRows,
    chunks: [],
    checkpoint: {
      nextSkip: 0,
      balanceAtomic: '0',
      remainingCostBasisFiat: 0,
      lastMarkRate: 0,
      lastTimestamp: 0,
    },
    updatedAt: Date.now(),
  };

  await saveWorkletSnapshotMeta(config, storedMeta);
  await saveWorkletSnapshotIndex(config, index);
  return index;
}

export async function loadWorkletInvalidHistoryMarker(
  config: PortfolioWorkletKvConfig,
  walletId: string,
): Promise<SnapshotInvalidHistoryMarkerV1 | null> {
  'worklet';

  const raw = workletKvGetString(
    config,
    getWorkletInvalidHistoryStorageKey(walletId),
  );
  const parsed = parseJson<SnapshotInvalidHistoryMarkerV1 | null>(raw, null);
  if (
    !parsed ||
    parsed.v !== SNAPSHOT_INVALID_HISTORY_VERSION ||
    String(parsed.walletId || '') !== String(walletId || '') ||
    parsed.reason !== 'negative_balance' ||
    !Number.isFinite(Number(parsed.detectedAt))
  ) {
    return null;
  }

  const lastAttemptedAt = Number(parsed.lastAttemptedAt);

  return {
    v: SNAPSHOT_INVALID_HISTORY_VERSION,
    walletId: String(parsed.walletId || ''),
    reason: 'negative_balance',
    detectedAt: Number(parsed.detectedAt),
    lastAttemptedAt: Number.isFinite(lastAttemptedAt)
      ? lastAttemptedAt
      : undefined,
    message: String(parsed.message || ''),
    source: parsed.source ? String(parsed.source) : undefined,
    txId: parsed.txId ? String(parsed.txId) : undefined,
    balanceAtomic: parsed.balanceAtomic
      ? String(parsed.balanceAtomic)
      : undefined,
  };
}

export async function saveWorkletInvalidHistoryMarker(
  config: PortfolioWorkletKvConfig,
  marker: SnapshotInvalidHistoryMarkerV1,
): Promise<void> {
  'worklet';

  const detectedAt = Number(marker.detectedAt);
  const normalizedDetectedAt = Number.isFinite(detectedAt)
    ? detectedAt
    : Date.now();
  const lastAttemptedAt = Number(marker.lastAttemptedAt);
  const normalizedLastAttemptedAt = Number.isFinite(lastAttemptedAt)
    ? lastAttemptedAt
    : normalizedDetectedAt;

  workletKvSetString(
    config,
    getWorkletInvalidHistoryStorageKey(marker.walletId),
    stringifyJson({
      v: SNAPSHOT_INVALID_HISTORY_VERSION,
      walletId: String(marker.walletId || ''),
      reason: 'negative_balance',
      detectedAt: normalizedDetectedAt,
      lastAttemptedAt: normalizedLastAttemptedAt,
      message: String(marker.message || ''),
      source: marker.source ? String(marker.source) : undefined,
      txId: marker.txId ? String(marker.txId) : undefined,
      balanceAtomic: marker.balanceAtomic
        ? String(marker.balanceAtomic)
        : undefined,
    }),
  );
}

export async function clearWorkletInvalidHistoryMarker(
  config: PortfolioWorkletKvConfig,
  walletId: string,
): Promise<void> {
  'worklet';

  workletKvDelete(config, getWorkletInvalidHistoryStorageKey(walletId));
}

export async function updateWorkletSnapshotCheckpoint(
  args: PortfolioWorkletKvConfig & {
    walletId: string;
    checkpoint: SnapshotPopulateCheckpointV1;
  },
): Promise<SnapshotIndexV2> {
  'worklet';

  const index = await loadWorkletSnapshotIndex(args, args.walletId);
  if (!index) {
    throw new Error(`Snapshot index missing for walletId=${args.walletId}`);
  }

  index.checkpoint = args.checkpoint;
  await saveWorkletSnapshotIndex(args, index);
  return index;
}

export async function appendWorkletSnapshotChunk(
  args: PortfolioWorkletKvConfig & {
    meta: SnapshotStoreWalletMeta;
    snapshots: SnapshotPersistInputV2[];
    checkpoint: SnapshotPopulateCheckpointV1;
  },
): Promise<SnapshotIndexV2> {
  'worklet';

  const {meta, snapshots, checkpoint} = args;
  if (!snapshots.length) {
    return updateWorkletSnapshotCheckpoint({
      storage: args.storage,
      registryKey: args.registryKey,
      walletId: meta.walletId,
      checkpoint,
    });
  }

  const index = await ensureWorkletWalletIndex(args, meta);
  const nextId = index.chunks.length
    ? index.chunks[index.chunks.length - 1].id + 1
    : 1;
  const orderedSnapshots = orderSnapshotsForAppend(snapshots);
  const rows: Array<[number, string]> = orderedSnapshots.map(
    ({snapshot, timestamp}) => [timestamp, String(snapshot.cryptoBalance)],
  );

  const chunk: SnapshotChunkV2 = {
    v: 2,
    rows,
  };

  workletKvSetString(
    args,
    getWorkletSnapshotChunkStorageKey(meta.walletId, nextId),
    stringifyJson(chunk),
  );

  index.chunks.push({
    id: nextId,
    fromTs: rows[0][0],
    toTs: rows[rows.length - 1][0],
    rows: rows.length,
  });
  index.checkpoint = checkpoint;
  await saveWorkletSnapshotIndex(args, index);
  return index;
}

export async function getWorkletLatestSnapshot(
  config: PortfolioWorkletKvConfig,
  walletId: string,
): Promise<BalanceSnapshotStored | null> {
  'worklet';

  const idx = await loadWorkletSnapshotIndex(config, walletId);
  if (!idx || !idx.chunks.length) return null;
  const meta =
    (await loadWorkletSnapshotMeta(config, walletId)) ?? fallbackMeta(walletId);
  const last = idx.chunks[idx.chunks.length - 1];
  const chunk = await loadWorkletSnapshotChunk({
    storage: config.storage,
    registryKey: config.registryKey,
    walletId,
    chunkId: last.id,
  });
  const rowIndex = chunk?.rows?.length ? chunk.rows.length - 1 : -1;
  const row = rowIndex >= 0 ? chunk?.rows?.[rowIndex] : null;
  if (!row) return null;
  return hydrateRowToSnapshot({meta, row, rowIndex});
}

export async function listWorkletSnapshots(
  config: PortfolioWorkletKvConfig,
  walletId: string,
): Promise<BalanceSnapshotStored[]> {
  'worklet';

  const idx = await loadWorkletSnapshotIndex(config, walletId);
  if (!idx || !idx.chunks.length) return [];

  const meta =
    (await loadWorkletSnapshotMeta(config, walletId)) ?? fallbackMeta(walletId);
  const out: BalanceSnapshotStored[] = [];
  for (const chunkMeta of idx.chunks) {
    const chunk = await loadWorkletSnapshotChunk({
      storage: config.storage,
      registryKey: config.registryKey,
      walletId,
      chunkId: chunkMeta.id,
    });
    if (!chunk?.rows?.length) continue;
    for (let ri = 0; ri < chunk.rows.length; ri += 1) {
      out.push(
        hydrateRowToSnapshot({
          meta,
          row: chunk.rows[ri],
          rowIndex: ri,
        }),
      );
    }
  }
  return out;
}

export async function findWorkletLastPointAtOrBefore(
  args: PortfolioWorkletKvConfig & {
    walletId: string;
    tsMs: number;
  },
): Promise<SnapshotPointV2 | null> {
  'worklet';

  const idx = await loadWorkletSnapshotIndex(args, args.walletId);
  if (!idx || !idx.chunks.length) return null;

  let lo = 0;
  let hi = idx.chunks.length - 1;
  let candidate = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const chunkMeta = idx.chunks[mid];
    if (chunkMeta.toTs >= args.tsMs) {
      candidate = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  const chunkIndex = candidate >= 0 ? candidate : idx.chunks.length - 1;
  const chunkMeta = idx.chunks[chunkIndex];
  if (chunkIndex === 0 && chunkMeta.fromTs > args.tsMs) return null;

  const chunk = await loadWorkletSnapshotChunk({
    storage: args.storage,
    registryKey: args.registryKey,
    walletId: args.walletId,
    chunkId: chunkMeta.id,
  });
  if (!chunk?.rows?.length) return null;

  let best: [number, string] | null = null;
  for (const row of chunk.rows) {
    if (row[0] <= args.tsMs) best = row;
    else break;
  }

  if (best) return toPoint(best);

  if (chunkIndex > 0) {
    const prevMeta = idx.chunks[chunkIndex - 1];
    const prev = await loadWorkletSnapshotChunk({
      storage: args.storage,
      registryKey: args.registryKey,
      walletId: args.walletId,
      chunkId: prevMeta.id,
    });
    const lastRow = prev?.rows?.[prev.rows.length - 1];
    return lastRow ? toPoint(lastRow) : null;
  }
  return null;
}

export function iterateWorkletPoints(
  args: PortfolioWorkletKvConfig & {
    walletId: string;
    fromExclusive: number;
    toInclusive: number;
  },
): AsyncIterator<SnapshotPointV2, void, void> {
  'worklet';

  const {walletId, fromExclusive, toInclusive} = args;
  let initialized = false;
  let done = false;
  let idx: SnapshotIndexV2 | null = null;
  let chunkCursor = 0;
  let rows: Array<[number, string]> | null = null;
  let rowCursor = 0;

  const initialize = async (): Promise<void> => {
    if (initialized) return;
    initialized = true;

    idx = await loadWorkletSnapshotIndex(args, walletId);
    if (!idx || !idx.chunks.length) {
      done = true;
      return;
    }

    while (
      chunkCursor < idx.chunks.length &&
      idx.chunks[chunkCursor].toTs <= fromExclusive
    ) {
      chunkCursor += 1;
    }

    if (chunkCursor >= idx.chunks.length) {
      done = true;
    }
  };

  const loadNextChunk = async (): Promise<boolean> => {
    if (!idx) return false;

    while (chunkCursor < idx.chunks.length) {
      const meta = idx.chunks[chunkCursor++];
      if (meta.fromTs > toInclusive) {
        done = true;
        return false;
      }

      const chunk = await loadWorkletSnapshotChunk({
        storage: args.storage,
        registryKey: args.registryKey,
        walletId,
        chunkId: meta.id,
      });
      if (!chunk?.rows?.length) continue;

      rows = chunk.rows;
      rowCursor = 0;
      return true;
    }

    done = true;
    return false;
  };

  return {
    next: async (): Promise<IteratorResult<SnapshotPointV2, void>> => {
      if (done) return {done: true, value: undefined};

      await initialize();
      if (done) return {done: true, value: undefined};

      while (true) {
        if (!rows || rowCursor >= rows.length) {
          const hasChunk = await loadNextChunk();
          if (!hasChunk) return {done: true, value: undefined};
        }

        while (rows && rowCursor < rows.length) {
          const row = rows[rowCursor++];
          if (row[0] <= fromExclusive) continue;
          if (row[0] > toInclusive) {
            done = true;
            rows = null;
            return {done: true, value: undefined};
          }
          return {done: false, value: toPoint(row)};
        }
      }
    },
  };
}

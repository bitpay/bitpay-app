import type {FiatRateSeriesCache} from '../../core/fiatRatesShared';
import type {Tx, WalletCredentials, WalletSummary} from '../../core/types';
import {
  getAtomicDecimals,
  makeAtomicToUnitNumberConverter,
  parseAtomicToBigint,
  ratioBigIntToNumber,
  resolveKnownWalletAtomicDecimals,
} from '../../core/format';
import {
  getTxHistoryEntryId,
  getTxHistoryLogicalPageSize,
} from '../../core/txHistoryPaging';
import {
  createFiatRateLookup,
  normalizeFiatRateSeriesCoin,
} from '../../core/pnl/rates';
import {createNegativeBalanceInvalidHistoryError} from '../../core/pnl/invalidHistory';
import type {SnapshotPersistInputV2} from '../../core/pnl/snapshotStore';
import type {BalanceSnapshotEventType} from '../../core/pnl/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const COMPRESSION_AGE_MS = 30 * DAY_MS;

const utcDayIndex = (tsMs: number): number => {
  'worklet';
  return Math.floor(tsMs / DAY_MS);
};
const utcDayKeyFromIndex = (dayIdx: number): string => {
  'worklet';
  return new Date(dayIdx * DAY_MS).toISOString().slice(0, 10);
};

const bigIntAbs = (value: bigint): bigint => {
  'worklet';
  return value < 0n ? -value : value;
};

const parseNumberishToBigint = (value: any): bigint => {
  'worklet';

  if (value === null || value === undefined) return 0n;
  if (typeof value === 'bigint') return value;

  if (typeof value === 'number') {
    try {
      return parseAtomicToBigint(value);
    } catch {
      return 0n;
    }
  }

  const text = String(value).trim();
  if (!text) return 0n;
  if (/^0x[0-9a-f]+$/i.test(text)) {
    try {
      return BigInt(text);
    } catch {
      return 0n;
    }
  }

  try {
    return parseAtomicToBigint(text);
  } catch {
    const match = text.match(/^-?\d+/);
    if (!match) return 0n;
    try {
      return BigInt(match[0]);
    } catch {
      return 0n;
    }
  }
};

const toTxTimestampMs = (tx: Tx): number => {
  'worklet';

  const raw = Number((tx as any)?.time);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw < 1e12 ? raw * 1000 : raw;
};

const getTxBlockHeight = (tx: Tx): number | null => {
  'worklet';

  const raw = Number(
    (tx as any)?.blockheight ??
      (tx as any)?.blockHeight ??
      (tx as any)?.block_height,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : null;
};

const getTxTransactionIndex = (tx: Tx): number | null => {
  'worklet';

  const raw = Number(
    (tx as any)?.receipt?.transactionIndex ?? (tx as any)?.transactionIndex,
  );
  return Number.isFinite(raw) && raw >= 0 ? raw : null;
};

const getTxNonce = (tx: Tx): number | null => {
  'worklet';

  const raw = Number((tx as any)?.nonce);
  return Number.isFinite(raw) && raw >= 0 ? raw : null;
};

const isTxFailed = (tx: Tx): boolean => {
  'worklet';

  const status = (tx as any)?.receipt?.status;
  if (status === null || status === undefined) return false;
  if (typeof status === 'boolean') return status === false;
  if (typeof status === 'number') return status === 0;
  if (typeof status === 'bigint') return status === 0n;

  const text = String(status).trim().toLowerCase();
  if (!text) return false;
  if (text === 'false' || text === '0' || text === '0x0') return true;
  if (text === 'true' || text === '1' || text === '0x1') return false;

  try {
    if (/^0x[0-9a-f]+$/i.test(text)) return BigInt(text) === 0n;
    return BigInt(text) === 0n;
  } catch {
    return false;
  }
};

const getTxL1DataFeeAtomic = (tx: Tx): bigint => {
  'worklet';

  const receipt = (tx as any)?.receipt;
  const l1Fee = parseNumberishToBigint(
    receipt?.l1Fee ??
      receipt?.l1DataFee ??
      receipt?.l1_data_fee ??
      (tx as any)?.l1Fee ??
      (tx as any)?.l1FeePaid,
  );
  return bigIntAbs(l1Fee);
};

const getTxOperatorFeeAtomic = (tx: Tx): bigint => {
  'worklet';

  const receipt = (tx as any)?.receipt;
  const operatorFee = parseNumberishToBigint(
    receipt?.operatorFee ?? receipt?.opFee ?? (tx as any)?.operatorFee,
  );
  return bigIntAbs(operatorFee);
};

const computeTxNetworkFeeAtomic = (tx: Tx): bigint => {
  'worklet';

  const receipt = (tx as any)?.receipt;
  const gasUsed = parseNumberishToBigint(receipt?.gasUsed);
  if (gasUsed > 0n) {
    const price = parseNumberishToBigint(
      receipt?.effectiveGasPrice ?? receipt?.gasPrice ?? (tx as any)?.gasPrice,
    );
    if (price > 0n) {
      return (
        gasUsed * price + getTxL1DataFeeAtomic(tx) + getTxOperatorFeeAtomic(tx)
      );
    }
  }

  return bigIntAbs(parseNumberishToBigint((tx as any)?.fees ?? 0));
};

type NormalizedTx = {
  originalIndex: number;
  id: string;
  tsMs: number;
  blockHeight: number | null;
  txIndex: number | null;
  nonce: number | null;
  action: 'received' | 'sent' | 'moved' | 'unknown';
  absAmountAtomic: bigint;
  failed: boolean;
  baseFeeAtomic: bigint;
};

export type SnapshotCarryoverTx = {
  id: string;
  tsMs: number;
  blockHeight: number | null;
  txIndex: number | null;
  nonce: number | null;
  action: NormalizedTx['action'];
  absAmountAtomic: string;
  failed: boolean;
  baseFeeAtomic: string;
};

function normalizeTx(args: {
  tx: Tx;
  originalIndex: number;
  applyFeesToBalance: boolean;
}): NormalizedTx | null {
  'worklet';

  const {tx, originalIndex, applyFeesToBalance} = args;
  const id = getTxHistoryEntryId(tx);
  const tsMs = toTxTimestampMs(tx);
  if (!tsMs) return null;

  const actionRaw = String(
    (tx as any)?.action || (tx as any)?.type || '',
  ).toLowerCase();
  const action: NormalizedTx['action'] =
    actionRaw === 'received' || actionRaw === 'receive'
      ? 'received'
      : actionRaw === 'sent' || actionRaw === 'send'
      ? 'sent'
      : actionRaw === 'moved' || actionRaw === 'move'
      ? 'moved'
      : 'unknown';

  const rawAmountAtomic = parseAtomicToBigint((tx as any)?.amount ?? 0);
  const absAmountAtomic = bigIntAbs(rawAmountAtomic);

  return {
    originalIndex,
    id,
    tsMs,
    blockHeight: getTxBlockHeight(tx),
    txIndex: getTxTransactionIndex(tx),
    nonce: getTxNonce(tx),
    action,
    absAmountAtomic,
    failed: isTxFailed(tx),
    baseFeeAtomic: applyFeesToBalance ? computeTxNetworkFeeAtomic(tx) : 0n,
  };
}

function dedupeNormalizedTxPage(txs: NormalizedTx[]): NormalizedTx[] {
  'worklet';

  if (txs.length <= 1) return txs;

  const seen = new Set<string>();
  const out: NormalizedTx[] = [];
  for (const tx of txs) {
    if (!tx.id || seen.has(tx.id)) continue;
    seen.add(tx.id);
    out.push(tx);
  }
  return out;
}

function extractRecentTxIdsFromNormalizedPage(
  normalizedPage: NormalizedTx[],
  consumedRawCount: number,
): string[] {
  'worklet';

  if (consumedRawCount <= 0) return [];
  return normalizedPage
    .filter(tx => tx.originalIndex < consumedRawCount)
    .map(tx => tx.id)
    .filter(Boolean);
}

function getNormalizedTxGroupKey(
  tx: Pick<NormalizedTx, 'tsMs' | 'blockHeight'>,
): string {
  'worklet';

  return `${tx.tsMs}:${tx.blockHeight ?? ''}`;
}

function shouldCarryGroupAcrossPageBoundary(group: NormalizedTx[]): boolean {
  'worklet';

  return group.some(tx => tx.blockHeight !== null);
}

function serializeCarryoverGroup(group: NormalizedTx[]): SnapshotCarryoverTx[] {
  'worklet';

  return group.map(tx => ({
    id: tx.id,
    tsMs: tx.tsMs,
    blockHeight: tx.blockHeight,
    txIndex: tx.txIndex,
    nonce: tx.nonce,
    action: tx.action,
    absAmountAtomic: tx.absAmountAtomic.toString(),
    failed: tx.failed,
    baseFeeAtomic: tx.baseFeeAtomic.toString(),
  }));
}

function restoreCarryoverGroup(
  raw: SnapshotCarryoverTx[] | undefined,
): NormalizedTx[] {
  'worklet';

  if (!Array.isArray(raw) || !raw.length) return [];

  return raw.map((entry, index) => ({
    originalIndex: index,
    id: String(entry.id || ''),
    tsMs: Number(entry.tsMs),
    blockHeight: Number.isFinite(Number(entry.blockHeight))
      ? Number(entry.blockHeight)
      : null,
    txIndex: Number.isFinite(Number(entry.txIndex))
      ? Number(entry.txIndex)
      : null,
    nonce: Number.isFinite(Number(entry.nonce)) ? Number(entry.nonce) : null,
    action:
      entry.action === 'received' ||
      entry.action === 'sent' ||
      entry.action === 'moved' ||
      entry.action === 'unknown'
        ? entry.action
        : 'unknown',
    absAmountAtomic: bigIntAbs(
      parseAtomicToBigint(entry.absAmountAtomic ?? '0'),
    ),
    failed: !!entry.failed,
    baseFeeAtomic: bigIntAbs(parseAtomicToBigint(entry.baseFeeAtomic ?? '0')),
  }));
}

function reorderTxBatchToPreventUnderflow(args: {
  txs: NormalizedTx[];
  startingBalanceAtomic: bigint;
  getDeltaAtomic: (tx: NormalizedTx) => bigint;
}): NormalizedTx[] {
  'worklet';

  const {txs, startingBalanceAtomic, getDeltaAtomic} = args;
  if (txs.length <= 1) return txs;

  const sorted = [...txs].sort((a, b) => {
    const blockHeightA = a.blockHeight ?? -1;
    const blockHeightB = b.blockHeight ?? -1;
    if (blockHeightA !== blockHeightB) return blockHeightA - blockHeightB;

    const txIndexA = a.txIndex ?? -1;
    const txIndexB = b.txIndex ?? -1;
    if (txIndexA !== txIndexB) return txIndexA - txIndexB;

    const nonceA = a.nonce ?? -1;
    const nonceB = b.nonce ?? -1;
    if (nonceA !== nonceB) return nonceA - nonceB;

    return a.originalIndex - b.originalIndex;
  });

  let balanceAtomic = startingBalanceAtomic;
  let sortedOrderAvoidsUnderflow = true;
  for (const tx of sorted) {
    const delta = getDeltaAtomic(tx);
    if (balanceAtomic + delta < 0n) {
      sortedOrderAvoidsUnderflow = false;
      break;
    }
    balanceAtomic += delta;
  }
  if (sortedOrderAvoidsUnderflow) {
    return sorted;
  }

  const out: NormalizedTx[] = [];
  balanceAtomic = startingBalanceAtomic;
  const pending = [...sorted];
  let guard = 0;
  while (pending.length && guard++ < 10_000) {
    let placed = false;
    for (let i = 0; i < pending.length; i += 1) {
      const tx = pending[i];
      const delta = getDeltaAtomic(tx);
      if (balanceAtomic + delta >= 0n) {
        out.push(tx);
        balanceAtomic += delta;
        pending.splice(i, 1);
        placed = true;
        break;
      }
    }
    if (!placed) {
      out.push(...pending);
      pending.length = 0;
      break;
    }
  }

  if (pending.length) {
    out.push(...pending);
  }

  return out;
}

function classifyTxFlow(args: {
  tx: NormalizedTx;
  applyFeesToBalance: boolean;
  feePaidByWallet: boolean;
}): {acquisitionAtomic: bigint; outflowAtomic: bigint} {
  'worklet';

  const {tx, applyFeesToBalance, feePaidByWallet} = args;
  const fee = applyFeesToBalance && feePaidByWallet ? tx.baseFeeAtomic : 0n;

  if (tx.failed && tx.action === 'sent') {
    return {acquisitionAtomic: 0n, outflowAtomic: fee};
  }

  if (tx.action === 'received') {
    return {acquisitionAtomic: tx.absAmountAtomic, outflowAtomic: 0n};
  }

  if (tx.action === 'sent') {
    return {
      acquisitionAtomic: 0n,
      outflowAtomic: tx.absAmountAtomic + fee,
    };
  }

  if (tx.action === 'moved') {
    return {acquisitionAtomic: 0n, outflowAtomic: fee};
  }

  return {acquisitionAtomic: 0n, outflowAtomic: 0n};
}

export type SnapshotStreamCheckpoint = {
  nextSkip: number;
  recentTxIds?: string[];
  carryoverGroup?: SnapshotCarryoverTx[];
  balanceAtomic: string;
  remainingCostBasisFiat: number;
  lastMarkRate: number;
  lastTimestamp: number;
  daily?: {
    dayIdx: number;
    lastTimestamp: number;
    lastMarkRate: number;
    balanceAtomic: string;
    remainingCostBasisFiat: number;
    txIds?: string[];
  };
  firstNonZeroTs?: number;
};

export type PortfolioSnapshotBuilderState = {
  wallet: WalletSummary;
  applyFeesToBalance: boolean;
  rateLookup: ReturnType<typeof createFiatRateLookup>;
  nowMs: number;
  compressionEnabled: boolean;
  atomicToUnitNumber: (atomic: bigint) => number;
  balanceAtomic: bigint;
  remainingCostBasisFiat: number;
  lastMarkRate: number;
  lastTimestamp: number;
  firstNonZeroTs?: number;
  dailyState?: SnapshotStreamCheckpoint['daily'];
  nextSkip: number;
  recentTxIds: string[];
  carryoverGroup: NormalizedTx[];
};

export function createPortfolioSnapshotBuilderState(args: {
  wallet: WalletSummary;
  credentials: Pick<
    WalletCredentials,
    'walletId' | 'chain' | 'network' | 'coin' | 'token'
  >;
  quoteCurrency: string;
  fiatRateSeriesCache: FiatRateSeriesCache;
  nowMs?: number;
  compressionEnabled?: boolean;
  checkpoint?: SnapshotStreamCheckpoint | null;
}): PortfolioSnapshotBuilderState {
  'worklet';

  const checkpoint = args.checkpoint;
  const normalizedCoin = normalizeFiatRateSeriesCoin(
    args.wallet.currencyAbbreviation,
  );
  const tokenAddress = String(
    args.wallet.tokenAddress || args.credentials?.token?.address || '',
  ).trim();
  const knownUnitDecimals = resolveKnownWalletAtomicDecimals({
    unitDecimals: args.wallet.unitDecimals,
    credentials: args.credentials,
  });
  if (tokenAddress && typeof knownUnitDecimals !== 'number') {
    throw new Error(
      `Invalid token metadata: wallet ${
        args.wallet.walletId || args.credentials.walletId || 'unknown'
      } has unresolved token decimals.`,
    );
  }

  return {
    wallet: args.wallet,
    applyFeesToBalance: !args.wallet.tokenAddress,
    rateLookup: createFiatRateLookup({
      quoteCurrency: args.quoteCurrency,
      coin: normalizedCoin,
      chain: args.wallet.chain,
      tokenAddress: args.wallet.tokenAddress,
      cache: args.fiatRateSeriesCache,
      nowMs: args.nowMs ?? Date.now(),
    }),
    nowMs: args.nowMs ?? Date.now(),
    compressionEnabled: !!args.compressionEnabled,
    atomicToUnitNumber: makeAtomicToUnitNumberConverter(
      knownUnitDecimals ?? getAtomicDecimals(args.credentials),
    ),
    balanceAtomic: parseAtomicToBigint(checkpoint?.balanceAtomic ?? '0'),
    remainingCostBasisFiat:
      Number(checkpoint?.remainingCostBasisFiat ?? 0) || 0,
    lastMarkRate: Number(checkpoint?.lastMarkRate ?? 0) || 0,
    lastTimestamp: Number(checkpoint?.lastTimestamp ?? 0) || 0,
    firstNonZeroTs: checkpoint?.firstNonZeroTs,
    dailyState: checkpoint?.daily
      ? {
          ...checkpoint.daily,
          balanceAtomic: String(
            checkpoint.daily.balanceAtomic ?? checkpoint.balanceAtomic ?? '0',
          ),
          remainingCostBasisFiat:
            Number(
              checkpoint.daily.remainingCostBasisFiat ??
                checkpoint.remainingCostBasisFiat ??
                0,
            ) || 0,
          txIds: Array.isArray(checkpoint.daily.txIds)
            ? checkpoint.daily.txIds.slice()
            : undefined,
        }
      : undefined,
    nextSkip: Number(checkpoint?.nextSkip ?? 0),
    recentTxIds: Array.isArray(checkpoint?.recentTxIds)
      ? checkpoint.recentTxIds.filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        )
      : [],
    carryoverGroup: restoreCarryoverGroup(checkpoint?.carryoverGroup),
  };
}

export function getPortfolioSnapshotBuilderCheckpoint(
  state: PortfolioSnapshotBuilderState,
): SnapshotStreamCheckpoint {
  'worklet';

  return {
    nextSkip: state.nextSkip,
    recentTxIds: state.recentTxIds,
    carryoverGroup: state.carryoverGroup.length
      ? serializeCarryoverGroup(state.carryoverGroup)
      : undefined,
    balanceAtomic: state.balanceAtomic.toString(),
    remainingCostBasisFiat: state.remainingCostBasisFiat,
    lastMarkRate: state.lastMarkRate,
    lastTimestamp: state.lastTimestamp,
    daily: state.dailyState
      ? {
          ...state.dailyState,
          txIds: Array.isArray(state.dailyState.txIds)
            ? state.dailyState.txIds.slice()
            : undefined,
        }
      : undefined,
    firstNonZeroTs: state.firstNonZeroTs,
  };
}

export function portfolioSnapshotBuilderHasPendingCarryoverGroup(
  state: PortfolioSnapshotBuilderState,
): boolean {
  'worklet';

  return state.carryoverGroup.length > 0;
}

function makePersistSnapshot(
  state: PortfolioSnapshotBuilderState,
  args: {
    id: string;
    eventType: BalanceSnapshotEventType;
    timestamp: number;
    markRate: number;
    balanceAtomic?: string;
    remainingCostBasisFiat?: number;
  },
  txIds?: string[],
): SnapshotPersistInputV2 {
  'worklet';

  const snapshot: SnapshotPersistInputV2 = {
    timestamp: args.timestamp,
    cryptoBalance: args.balanceAtomic ?? state.balanceAtomic.toString(),
  };

  if (args.eventType === 'daily' && Array.isArray(txIds) && txIds.length) {
    snapshot.txIds = txIds.slice();
  }

  return snapshot;
}

function makeTxSnapshot(
  state: PortfolioSnapshotBuilderState,
  txId: string,
  timestamp: number,
  markRate: number,
): SnapshotPersistInputV2 {
  'worklet';

  return makePersistSnapshot(state, {
    id: `tx:${state.wallet.walletId}:${txId}`,
    eventType: 'tx',
    timestamp,
    markRate,
  });
}

function makeDailySnapshot(
  state: PortfolioSnapshotBuilderState,
  dailyState: NonNullable<SnapshotStreamCheckpoint['daily']>,
): SnapshotPersistInputV2 {
  'worklet';

  return makePersistSnapshot(
    state,
    {
      id: `daily:${state.wallet.walletId}:${utcDayKeyFromIndex(
        dailyState.dayIdx,
      )}`,
      eventType: 'daily',
      timestamp: dailyState.lastTimestamp,
      markRate: dailyState.lastMarkRate,
      balanceAtomic: dailyState.balanceAtomic,
      remainingCostBasisFiat: dailyState.remainingCostBasisFiat,
    },
    dailyState.txIds,
  );
}

function getMarkRate(
  state: PortfolioSnapshotBuilderState,
  timestamp: number,
): number {
  'worklet';

  const rate = state.rateLookup.getNearestRate(timestamp);
  if (rate === undefined) {
    return Number.isFinite(state.lastMarkRate) && state.lastMarkRate > 0
      ? state.lastMarkRate
      : 0;
  }
  return rate;
}

function processTx(
  state: PortfolioSnapshotBuilderState,
  tx: NormalizedTx,
): SnapshotPersistInputV2[] {
  'worklet';

  const out: SnapshotPersistInputV2[] = [];
  const markRate = getMarkRate(state, tx.tsMs);

  const {acquisitionAtomic, outflowAtomic} = classifyTxFlow({
    tx,
    applyFeesToBalance: state.applyFeesToBalance,
    feePaidByWallet: true,
  });

  if (acquisitionAtomic > 0n) {
    let acquisitionRemainder = acquisitionAtomic;

    if (state.balanceAtomic < 0n) {
      const deficit = -state.balanceAtomic;
      const cover =
        acquisitionRemainder > deficit ? deficit : acquisitionRemainder;
      state.balanceAtomic += cover;
      acquisitionRemainder -= cover;
    }

    if (acquisitionRemainder > 0n) {
      state.balanceAtomic += acquisitionRemainder;
      state.remainingCostBasisFiat +=
        state.atomicToUnitNumber(acquisitionRemainder) * markRate;
    }
  }

  if (outflowAtomic > 0n) {
    const before = state.balanceAtomic;
    if (before <= 0n) {
      state.balanceAtomic = before - outflowAtomic;
      state.remainingCostBasisFiat = 0;
    } else {
      const disposeAgainstHoldings =
        outflowAtomic > before ? before : outflowAtomic;
      const ratio = ratioBigIntToNumber(disposeAgainstHoldings, before);
      state.remainingCostBasisFiat -= state.remainingCostBasisFiat * ratio;
      state.balanceAtomic = before - outflowAtomic;
      if (state.balanceAtomic <= 0n) {
        state.remainingCostBasisFiat = 0;
      }
    }
  }

  if (
    !Number.isFinite(state.remainingCostBasisFiat) ||
    state.remainingCostBasisFiat < 0
  ) {
    state.remainingCostBasisFiat = 0;
  }

  state.lastMarkRate = markRate;
  state.lastTimestamp = tx.tsMs;
  if (state.firstNonZeroTs === undefined && state.balanceAtomic > 0n) {
    state.firstNonZeroTs = tx.tsMs;
  }

  if (state.balanceAtomic < 0n) {
    throw createNegativeBalanceInvalidHistoryError({
      txId: tx.id,
      balanceAtomic: state.balanceAtomic,
      source: 'portfolio_worklet_snapshot_builder',
    });
  }

  const compressBefore = state.nowMs - COMPRESSION_AGE_MS;
  const shouldCompress = state.compressionEnabled && tx.tsMs < compressBefore;

  if (shouldCompress) {
    const dayIdx = utcDayIndex(tx.tsMs);
    if (!state.dailyState) {
      state.dailyState = {
        dayIdx,
        lastTimestamp: tx.tsMs,
        lastMarkRate: markRate,
        balanceAtomic: state.balanceAtomic.toString(),
        remainingCostBasisFiat: state.remainingCostBasisFiat,
        txIds: [tx.id],
      };
    } else if (state.dailyState.dayIdx !== dayIdx) {
      const dailyState = state.dailyState;
      out.push(makeDailySnapshot(state, dailyState));
      state.dailyState = {
        dayIdx,
        lastTimestamp: tx.tsMs,
        lastMarkRate: markRate,
        balanceAtomic: state.balanceAtomic.toString(),
        remainingCostBasisFiat: state.remainingCostBasisFiat,
        txIds: [tx.id],
      };
    } else {
      state.dailyState.lastTimestamp = tx.tsMs;
      state.dailyState.lastMarkRate = markRate;
      state.dailyState.balanceAtomic = state.balanceAtomic.toString();
      state.dailyState.remainingCostBasisFiat = state.remainingCostBasisFiat;
      if (!Array.isArray(state.dailyState.txIds)) {
        state.dailyState.txIds = [];
      }
      state.dailyState.txIds.push(tx.id);
    }

    return out;
  }

  if (state.dailyState) {
    const dailyState = state.dailyState;
    out.push(makeDailySnapshot(state, dailyState));
    state.dailyState = undefined;
  }

  out.push(makeTxSnapshot(state, tx.id, tx.tsMs, markRate));
  return out;
}

function processGroup(
  state: PortfolioSnapshotBuilderState,
  group: NormalizedTx[],
): SnapshotPersistInputV2[] {
  'worklet';

  if (!group.length) return [];

  const orderedGroup = group.map((tx, index) =>
    tx.originalIndex === index ? tx : {...tx, originalIndex: index},
  );
  const reordered = reorderTxBatchToPreventUnderflow({
    txs: orderedGroup,
    startingBalanceAtomic: state.balanceAtomic,
    getDeltaAtomic: tx => {
      'worklet';

      const flow = classifyTxFlow({
        tx,
        applyFeesToBalance: state.applyFeesToBalance,
        feePaidByWallet: true,
      });
      return flow.acquisitionAtomic - flow.outflowAtomic;
    },
  });

  const out: SnapshotPersistInputV2[] = [];
  for (const tx of reordered) {
    out.push(...processTx(state, tx));
  }
  return out;
}

export function portfolioSnapshotBuilderFlushPendingCarryoverGroup(
  state: PortfolioSnapshotBuilderState,
): SnapshotPersistInputV2[] {
  'worklet';

  if (!state.carryoverGroup.length) return [];
  const group = state.carryoverGroup;
  state.carryoverGroup = [];
  return processGroup(state, group);
}

export function portfolioSnapshotBuilderFinish(
  state: PortfolioSnapshotBuilderState,
): SnapshotPersistInputV2[] {
  'worklet';

  const out: SnapshotPersistInputV2[] = [];
  out.push(...portfolioSnapshotBuilderFlushPendingCarryoverGroup(state));
  if (state.dailyState) {
    const dailyState = state.dailyState;
    out.push(makeDailySnapshot(state, dailyState));
    state.dailyState = undefined;
  }
  return out;
}

export function portfolioSnapshotBuilderIngestPageWithSnapshotLimit(
  state: PortfolioSnapshotBuilderState,
  txs: Tx[],
  maxSnapshots?: number,
): {
  snapshots: SnapshotPersistInputV2[];
  logicalPageSize: number;
  consumedRawCount: number;
} {
  'worklet';

  const out: SnapshotPersistInputV2[] = [];
  const normalizedPage = dedupeNormalizedTxPage(
    txs
      .map((tx, originalIndex) =>
        normalizeTx({
          tx,
          originalIndex,
          applyFeesToBalance: state.applyFeesToBalance,
        }),
      )
      .filter((tx): tx is NormalizedTx => !!tx),
  );

  const recentTxIds = new Set(state.recentTxIds);
  const filteredPage = recentTxIds.size
    ? normalizedPage.filter(tx => !recentTxIds.has(tx.id))
    : normalizedPage;
  const limit =
    Number.isFinite(Number(maxSnapshots)) && Number(maxSnapshots) > 0
      ? Math.trunc(Number(maxSnapshots))
      : null;

  if (!filteredPage.length) {
    const logicalPageSize = getTxHistoryLogicalPageSize(txs);
    state.nextSkip += logicalPageSize;
    state.recentTxIds = normalizedPage.map(tx => tx.id).filter(Boolean);
    return {
      snapshots: out,
      logicalPageSize,
      consumedRawCount: txs.length,
    };
  }

  let group = state.carryoverGroup.length ? state.carryoverGroup.slice() : [];
  state.carryoverGroup = [];
  let groupKey: string | null = group.length
    ? getNormalizedTxGroupKey(group[0])
    : null;
  let groupMaxOriginalIndex = -1;
  let consumedRawCount = 0;
  let endedAtInputBoundary = true;

  const flushCurrentGroup = (): void => {
    if (!group.length) {
      return;
    }

    out.push(...processGroup(state, group));
    consumedRawCount = groupMaxOriginalIndex + 1;
    group = [];
    groupKey = null;
    groupMaxOriginalIndex = -1;
  };

  for (let index = 0; index < filteredPage.length; index += 1) {
    const tx = filteredPage[index];
    const key = getNormalizedTxGroupKey(tx);

    if (groupKey === null) {
      groupKey = key;
    }

    if (key !== groupKey) {
      flushCurrentGroup();
      if (limit !== null && out.length >= limit) {
        endedAtInputBoundary = false;
        break;
      }
      groupKey = key;
    }

    group.push(tx);
    if (tx.originalIndex > groupMaxOriginalIndex) {
      groupMaxOriginalIndex = tx.originalIndex;
    }
  }

  if (group.length) {
    const shouldCarryAcrossPageBoundary =
      endedAtInputBoundary &&
      groupMaxOriginalIndex >= 0 &&
      shouldCarryGroupAcrossPageBoundary(group);
    if (shouldCarryAcrossPageBoundary) {
      const logicalPageSize = getTxHistoryLogicalPageSize(txs);
      state.carryoverGroup = group;
      state.nextSkip += logicalPageSize;
      state.recentTxIds = normalizedPage.map(tx => tx.id).filter(Boolean);
      return {
        snapshots: out,
        logicalPageSize,
        consumedRawCount: txs.length,
      };
    }

    flushCurrentGroup();
  }

  const consumedRaw = txs.slice(0, consumedRawCount);
  const logicalPageSize = getTxHistoryLogicalPageSize(consumedRaw);
  state.nextSkip += logicalPageSize;
  state.recentTxIds = extractRecentTxIdsFromNormalizedPage(
    normalizedPage,
    consumedRawCount,
  );

  return {
    snapshots: out,
    logicalPageSize,
    consumedRawCount,
  };
}

export const SNAPSHOT_INVALID_HISTORY_VERSION = 1 as const;
export const SNAPSHOT_INVALID_HISTORY_RETRY_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const SNAPSHOT_INVALID_HISTORY_ERROR_NAME =
  'PortfolioInvalidHistoryError';
export const SNAPSHOT_INVALID_HISTORY_NEGATIVE_BALANCE_CODE =
  'PORTFOLIO_INVALID_HISTORY_NEGATIVE_BALANCE';

export type SnapshotInvalidHistoryReason = 'negative_balance';

export type SnapshotInvalidHistoryMarkerV1 = {
  v: typeof SNAPSHOT_INVALID_HISTORY_VERSION;
  walletId: string;
  reason: SnapshotInvalidHistoryReason;
  detectedAt: number;
  lastAttemptedAt?: number;
  message: string;
  source?: string;
  txId?: string;
  balanceAtomic?: string;
};

type SnapshotInvalidHistoryError = Error & {
  code?: string;
  invalidHistoryReason?: SnapshotInvalidHistoryReason;
  invalidHistorySource?: string;
  invalidHistoryTxId?: string;
  invalidHistoryBalanceAtomic?: string;
};

export type SnapshotRetryMarkerTimestamps = {
  detectedAt?: number;
  lastAttemptedAt?: number;
};

export function createNegativeBalanceInvalidHistoryError(args: {
  txId: string;
  balanceAtomic: bigint | string;
  source: string;
}): Error {
  'worklet';

  const txId = String(args.txId || '').trim() || 'unknown';
  const balanceAtomic = String(args.balanceAtomic ?? '').trim() || '0';
  const error = new Error(
    `Invalid tx history: negative balance after tx ${txId} (${balanceAtomic}).`,
  ) as SnapshotInvalidHistoryError;

  error.name = SNAPSHOT_INVALID_HISTORY_ERROR_NAME;
  error.code = SNAPSHOT_INVALID_HISTORY_NEGATIVE_BALANCE_CODE;
  error.invalidHistoryReason = 'negative_balance';
  error.invalidHistorySource = String(args.source || '').trim() || undefined;
  error.invalidHistoryTxId = txId;
  error.invalidHistoryBalanceAtomic = balanceAtomic;
  return error;
}

export function isSnapshotInvalidHistoryError(
  error: unknown,
): error is SnapshotInvalidHistoryError {
  'worklet';

  if (!(error instanceof Error)) {
    return false;
  }

  const anyError = error as SnapshotInvalidHistoryError;
  return (
    anyError.code === SNAPSHOT_INVALID_HISTORY_NEGATIVE_BALANCE_CODE ||
    anyError.name === SNAPSHOT_INVALID_HISTORY_ERROR_NAME ||
    error.message.startsWith('Invalid tx history:')
  );
}

export function toSnapshotInvalidHistoryMarker(args: {
  walletId: string;
  error: unknown;
  detectedAt?: number;
  lastAttemptedAt?: number;
}): SnapshotInvalidHistoryMarkerV1 | null {
  'worklet';

  if (!isSnapshotInvalidHistoryError(args.error)) {
    return null;
  }

  const detectedAt = Number(args.detectedAt ?? Date.now());
  const lastAttemptedAt = Number(args.lastAttemptedAt ?? detectedAt);
  const walletId = String(args.walletId || '').trim();
  if (
    !walletId ||
    !Number.isFinite(detectedAt) ||
    !Number.isFinite(lastAttemptedAt)
  ) {
    return null;
  }

  return {
    v: SNAPSHOT_INVALID_HISTORY_VERSION,
    walletId,
    reason: args.error.invalidHistoryReason ?? 'negative_balance',
    detectedAt,
    lastAttemptedAt,
    message: String(args.error.message || '').trim(),
    source: args.error.invalidHistorySource,
    txId: args.error.invalidHistoryTxId,
    balanceAtomic: args.error.invalidHistoryBalanceAtomic,
  };
}

export const isSnapshotMarkerRetryDue = (
  marker: SnapshotRetryMarkerTimestamps | null | undefined,
  nowMs: number,
  retryIntervalMs: number | undefined,
  defaultRetryIntervalMs: number,
): boolean => {
  'worklet';

  if (!marker) {
    return false;
  }

  const lastAttemptedAt = Number(marker.lastAttemptedAt);
  const retryAnchorMs = Number.isFinite(lastAttemptedAt)
    ? lastAttemptedAt
    : Number(marker.detectedAt);
  const normalizedIntervalMs = Number(
    retryIntervalMs ?? defaultRetryIntervalMs,
  );
  const intervalMs =
    Number.isFinite(normalizedIntervalMs) && normalizedIntervalMs > 0
      ? normalizedIntervalMs
      : defaultRetryIntervalMs;

  return !Number.isFinite(retryAnchorMs) || nowMs - retryAnchorMs >= intervalMs;
};

export function isSnapshotInvalidHistoryMarkerQuarantined(
  marker: SnapshotInvalidHistoryMarkerV1 | null | undefined,
): marker is SnapshotInvalidHistoryMarkerV1 {
  'worklet';

  return !!marker;
}

export function isSnapshotInvalidHistoryRetryDue(
  marker: SnapshotInvalidHistoryMarkerV1 | null | undefined,
  nowMs: number = Date.now(),
  retryIntervalMs?: number,
): boolean {
  'worklet';

  return isSnapshotMarkerRetryDue(
    marker,
    nowMs,
    retryIntervalMs,
    SNAPSHOT_INVALID_HISTORY_RETRY_INTERVAL_MS,
  );
}

export function isSnapshotInvalidHistoryMarkerActive(
  marker: SnapshotInvalidHistoryMarkerV1 | null | undefined,
  nowMs: number = Date.now(),
  retryIntervalMs?: number,
): boolean {
  'worklet';

  return (
    !!marker &&
    !isSnapshotInvalidHistoryRetryDue(marker, nowMs, retryIntervalMs)
  );
}

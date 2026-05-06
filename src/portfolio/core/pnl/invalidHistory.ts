export const SNAPSHOT_INVALID_HISTORY_VERSION = 1 as const;
export const SNAPSHOT_INVALID_HISTORY_RETRY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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
  retryAfter: number;
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
  retryCooldownMs?: number;
}): SnapshotInvalidHistoryMarkerV1 | null {
  'worklet';

  if (!isSnapshotInvalidHistoryError(args.error)) {
    return null;
  }

  const detectedAt = Number(args.detectedAt ?? Date.now());
  const retryCooldownMs = Number(
    args.retryCooldownMs ?? SNAPSHOT_INVALID_HISTORY_RETRY_COOLDOWN_MS,
  );
  const walletId = String(args.walletId || '').trim();
  if (!walletId || !Number.isFinite(detectedAt)) {
    return null;
  }

  return {
    v: SNAPSHOT_INVALID_HISTORY_VERSION,
    walletId,
    reason: args.error.invalidHistoryReason ?? 'negative_balance',
    detectedAt,
    retryAfter:
      detectedAt +
      (Number.isFinite(retryCooldownMs) && retryCooldownMs > 0
        ? retryCooldownMs
        : SNAPSHOT_INVALID_HISTORY_RETRY_COOLDOWN_MS),
    message: String(args.error.message || '').trim(),
    source: args.error.invalidHistorySource,
    txId: args.error.invalidHistoryTxId,
    balanceAtomic: args.error.invalidHistoryBalanceAtomic,
  };
}

export function isSnapshotInvalidHistoryMarkerActive(
  marker: SnapshotInvalidHistoryMarkerV1 | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  'worklet';

  if (!marker) {
    return false;
  }

  return Number.isFinite(marker.retryAfter) && marker.retryAfter > nowMs;
}

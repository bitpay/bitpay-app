import {
  SNAPSHOT_INVALID_HISTORY_ERROR_NAME,
  SNAPSHOT_INVALID_HISTORY_NEGATIVE_BALANCE_CODE,
  SNAPSHOT_INVALID_HISTORY_RETRY_COOLDOWN_MS,
  createNegativeBalanceInvalidHistoryError,
  isSnapshotInvalidHistoryError,
  isSnapshotInvalidHistoryMarkerActive,
  toSnapshotInvalidHistoryMarker,
} from './invalidHistory';

describe('invalidHistory', () => {
  it('classifies generated invalid history errors and builds markers', () => {
    const error = createNegativeBalanceInvalidHistoryError({
      txId: 'tx-123',
      balanceAtomic: -42n,
      source: 'unit_test',
    });

    expect(error.name).toBe(SNAPSHOT_INVALID_HISTORY_ERROR_NAME);
    expect((error as Error & {code?: string}).code).toBe(
      SNAPSHOT_INVALID_HISTORY_NEGATIVE_BALANCE_CODE,
    );
    expect(isSnapshotInvalidHistoryError(error)).toBe(true);

    const marker = toSnapshotInvalidHistoryMarker({
      walletId: 'wallet-1',
      error,
      detectedAt: 1000,
    });

    expect(marker).toEqual({
      v: 1,
      walletId: 'wallet-1',
      reason: 'negative_balance',
      detectedAt: 1000,
      retryAfter: 1000 + SNAPSHOT_INVALID_HISTORY_RETRY_COOLDOWN_MS,
      message: 'Invalid tx history: negative balance after tx tx-123 (-42).',
      source: 'unit_test',
      txId: 'tx-123',
      balanceAtomic: '-42',
    });
  });

  it('ignores non-invalid-history errors and expired markers', () => {
    const genericError = new Error('something else');

    expect(isSnapshotInvalidHistoryError(genericError)).toBe(false);
    expect(
      toSnapshotInvalidHistoryMarker({
        walletId: 'wallet-1',
        error: genericError,
        detectedAt: 1000,
      }),
    ).toBeNull();

    expect(
      isSnapshotInvalidHistoryMarkerActive(
        {
          v: 1,
          walletId: 'wallet-1',
          reason: 'negative_balance',
          detectedAt: 1000,
          retryAfter: 1500,
          message: 'expired',
        },
        1500,
      ),
    ).toBe(false);
    expect(
      isSnapshotInvalidHistoryMarkerActive(
        {
          v: 1,
          walletId: 'wallet-1',
          reason: 'negative_balance',
          detectedAt: 1000,
          retryAfter: 1501,
          message: 'active',
        },
        1500,
      ),
    ).toBe(true);
  });
});

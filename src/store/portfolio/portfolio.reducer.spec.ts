import {portfolioReducer} from './portfolio.reducer';
import type {PortfolioState, WalletIdMap} from './portfolio.models';
import type {PortfolioActionType} from './portfolio.types';
import {
  cancelPopulatePortfolio,
  clearWalletPortfolioState,
  failPopulatePortfolio,
  finishPopulatePortfolio,
  markInitialBaselineComplete,
  markPopulateResumeSettled,
  setInvalidDecimalsByWalletIdUpdates,
  setQuarantinesByWalletIdUpdates,
  setSnapshotBalanceMismatchesByWalletIdUpdates,
  startPopulatePortfolio,
  updatePopulateProgress,
} from './portfolio.actions';
import {selectCanRenderPortfolioBalanceCharts} from './portfolio.selectors';

const makeState = (
  overrides: Partial<PortfolioState> = {},
): PortfolioState => ({
  lastPopulatedAt: undefined,
  lastFullPopulateCompletedAt: null,
  quoteCurrency: undefined,
  populateStatus: {
    inProgress: true,
    startedAt: 100,
    finishedAt: undefined,
    elapsedMs: undefined,
    stopReason: undefined,
    currentWalletId: 'wallet-1',
    walletsTotal: 1,
    walletsCompleted: 0,
    txRequestsMade: 0,
    txsProcessed: 0,
    errors: [],
    walletStatusById: {'wallet-1': 'in_progress'},
  },
  snapshotBalanceMismatchesByWalletId: {},
  invalidDecimalsByWalletId: {},
  quarantinesByWalletId: {},
  ...overrides,
});

const expectStoresAndClearsWalletMapValue = <T>(args: {
  actionCreator: (payload: WalletIdMap<T>) => PortfolioActionType;
  selectMap: (state: PortfolioState) => WalletIdMap<T> | undefined;
  value: T;
}) => {
  const withValue = portfolioReducer(
    makeState(),
    args.actionCreator({'wallet-1': args.value}),
  );

  expect(args.selectMap(withValue)?.['wallet-1']).toBe(args.value);

  const cleared = portfolioReducer(
    withValue,
    args.actionCreator({'wallet-1': undefined}),
  );

  expect(args.selectMap(cleared)?.['wallet-1']).toBeUndefined();
};

const excessiveBalanceMismatchMarker = (walletId = 'wallet-1') => ({
  walletId,
  reason: 'excessive_balance_mismatch' as const,
  computedAtomic: '200000000',
  liveAtomic: '100000000',
  deltaAtomic: '100000000',
  ratio: '2',
  threshold: 0.1,
  detectedAt: 1234,
  message:
    'Wallet wallet-1 snapshot balance differs from live balance by 2x (threshold 10%).',
});

const invalidDecimalsMarker = (walletId = 'wallet-1') => ({
  walletId,
  reason: 'invalid_decimals' as const,
  message: 'Wallet wallet-1 has unresolved token decimals.',
});

describe('portfolioReducer', () => {
  it('preserves state identity for unrelated and rehydrate actions', () => {
    const state = makeState();

    expect(portfolioReducer(state, {type: 'APP/NOOP'} as any)).toBe(state);
    expect(portfolioReducer(state, {type: 'persist/REHYDRATE'} as any)).toBe(
      state,
    );
  });

  it('sets lastFullPopulateCompletedAt when a populate finish includes a completed full-populate timestamp', () => {
    const result = portfolioReducer(
      makeState(),
      finishPopulatePortfolio({
        finishedAt: 200,
        lastFullPopulateCompletedAt: 200,
        quoteCurrency: 'USD',
        reason: 'done',
      }),
    );

    expect(result.lastPopulatedAt).toBe(200);
    expect(result.lastFullPopulateCompletedAt).toBe(200);
  });

  it('keeps charts blocked after an unflagged partial finish from a no-baseline state', () => {
    const result = portfolioReducer(
      makeState({
        lastPopulatedAt: undefined,
      }),
      finishPopulatePortfolio({
        finishedAt: 200,
        quoteCurrency: 'USD',
        reason: 'done',
      }),
    );

    expect(result.lastPopulatedAt).toBe(200);
    expect(result.lastFullPopulateCompletedAt).toBeNull();
    expect(
      selectCanRenderPortfolioBalanceCharts({
        APP: {showPortfolioValue: true},
        PORTFOLIO: result,
      } as any),
    ).toBe(false);
  });

  it('keeps the previous full-populate timestamp when a later finish does not complete all work', () => {
    const result = portfolioReducer(
      makeState({
        lastFullPopulateCompletedAt: 150,
        lastPopulatedAt: 150,
      }),
      finishPopulatePortfolio({
        finishedAt: 200,
        quoteCurrency: 'USD',
        reason: 'completed after 0/1 wallets',
      }),
    );

    expect(result.lastPopulatedAt).toBe(200);
    expect(result.lastFullPopulateCompletedAt).toBe(150);
  });

  it('does not update the full-populate timestamp when populate fails or is cancelled', () => {
    const failed = portfolioReducer(
      makeState({
        lastFullPopulateCompletedAt: 150,
      }),
      failPopulatePortfolio({error: 'boom'}),
    );

    expect(failed.lastFullPopulateCompletedAt).toBe(150);

    const cancelled = portfolioReducer(
      makeState({
        lastFullPopulateCompletedAt: 150,
      }),
      cancelPopulatePortfolio(),
    );

    expect(cancelled.lastFullPopulateCompletedAt).toBe(150);
  });

  it('stores active populate decision reasons when populate starts', () => {
    const result = portfolioReducer(
      makeState(),
      startPopulatePortfolio({
        quoteCurrency: 'USD',
        decisionReasonByWalletId: {'wallet-1': 'missing_index'},
        decisionSource: 'app_launch_staleness',
      }),
    );

    expect(result.populateStatus.decisionReasonByWalletId).toEqual({
      'wallet-1': 'missing_index',
    });
    expect(result.populateStatus.decisionSource).toBe('app_launch_staleness');
  });

  it('stores and clears atomic snapshot balance mismatches by wallet id', () => {
    const mismatch = {
      walletId: 'wallet-1',
      computedAtomic: '100000000',
      currentAtomic: '150000000',
      deltaAtomic: '-50000000',
      computedUnitsHeld: '1',
      currentWalletBalance: '1.5',
      delta: '-0.5',
    };
    expectStoresAndClearsWalletMapValue({
      actionCreator: setSnapshotBalanceMismatchesByWalletIdUpdates,
      selectMap: state => state.snapshotBalanceMismatchesByWalletId,
      value: mismatch,
    });
  });

  it('stores and clears invalid-decimals markers by wallet id', () => {
    const marker = invalidDecimalsMarker();
    expectStoresAndClearsWalletMapValue({
      actionCreator: setInvalidDecimalsByWalletIdUpdates,
      selectMap: state => state.invalidDecimalsByWalletId,
      value: marker,
    });
  });

  it('stores and clears portfolio quarantine markers by wallet id', () => {
    const marker = excessiveBalanceMismatchMarker();
    expectStoresAndClearsWalletMapValue({
      actionCreator: setQuarantinesByWalletIdUpdates,
      selectMap: state => state.quarantinesByWalletId,
      value: marker,
    });
  });

  it('clears invalid-decimals markers with wallet portfolio state', () => {
    const marker = invalidDecimalsMarker();
    const withMarker = makeState({
      invalidDecimalsByWalletId: {
        'wallet-1': marker,
        'wallet-2': {
          ...marker,
          walletId: 'wallet-2',
        },
      },
    });

    const cleared = portfolioReducer(
      withMarker,
      clearWalletPortfolioState({walletIds: ['wallet-1']}),
    );

    expect(cleared.invalidDecimalsByWalletId?.['wallet-1']).toBeUndefined();
    expect(cleared.invalidDecimalsByWalletId?.['wallet-2']).toEqual({
      ...marker,
      walletId: 'wallet-2',
    });
  });

  it('clears portfolio quarantine markers with wallet portfolio state', () => {
    const marker = excessiveBalanceMismatchMarker();
    const withMarker = makeState({
      quarantinesByWalletId: {
        'wallet-1': marker,
        'wallet-2': {
          ...marker,
          walletId: 'wallet-2',
        },
      },
    });

    const cleared = portfolioReducer(
      withMarker,
      clearWalletPortfolioState({walletIds: ['wallet-1']}),
    );

    expect(cleared.quarantinesByWalletId?.['wallet-1']).toBeUndefined();
    expect(cleared.quarantinesByWalletId?.['wallet-2']).toEqual({
      ...marker,
      walletId: 'wallet-2',
    });
  });

  it('clears populate decision reasons with wallet portfolio state', () => {
    const cleared = portfolioReducer(
      makeState({
        populateStatus: {
          ...makeState().populateStatus,
          decisionReasonByWalletId: {
            'wallet-1': 'missing_index',
            'wallet-2': 'balance_mismatch',
          },
        },
      }),
      clearWalletPortfolioState({walletIds: ['wallet-1']}),
    );

    expect(
      cleared.populateStatus.decisionReasonByWalletId?.['wallet-1'],
    ).toBeUndefined();
    expect(cleared.populateStatus.decisionReasonByWalletId?.['wallet-2']).toBe(
      'balance_mismatch',
    );
  });

  it('marks the initial baseline complete and unblocks last-populated render paths', () => {
    const state = makeState({
      lastFullPopulateCompletedAt: null,
      lastPopulatedAt: undefined,
      populateStatus: {
        ...makeState().populateStatus,
        inProgress: false,
      },
    });
    const result = portfolioReducer(
      state,
      markInitialBaselineComplete({
        completedAt: 300,
        quoteCurrency: 'USD',
      }),
    );

    expect(result.lastFullPopulateCompletedAt).toBe(300);
    expect(result.lastPopulatedAt).toBe(300);
    expect(result.populateStatus).toBe(state.populateStatus);
  });

  it('does not overwrite an existing completed initial baseline timestamp', () => {
    const state = makeState({
      lastFullPopulateCompletedAt: 200,
      lastPopulatedAt: 200,
    });

    expect(
      portfolioReducer(
        state,
        markInitialBaselineComplete({
          completedAt: 300,
          quoteCurrency: 'USD',
        }),
      ),
    ).toBe(state);
  });

  it('marks an interrupted populate resume settled without overwriting an existing baseline', () => {
    const state = makeState({
      lastFullPopulateCompletedAt: 200,
      lastPopulatedAt: 200,
      populateStatus: {
        ...makeState().populateStatus,
        inProgress: false,
        finishedAt: undefined,
        stopReason: undefined,
        currentWalletId: undefined,
        walletStatusById: {},
      },
    });

    const result = portfolioReducer(
      state,
      markPopulateResumeSettled({settledAt: 300}),
    );

    expect(result.lastFullPopulateCompletedAt).toBe(200);
    expect(result.populateStatus.finishedAt).toBe(300);
    expect(result.populateStatus.stopReason).toBeUndefined();
  });

  it('does not mark an active populate resume settled', () => {
    const state = makeState();

    expect(
      portfolioReducer(state, markPopulateResumeSettled({settledAt: 300})),
    ).toBe(state);
  });

  // UPDATE_POPULATE_PROGRESS is dispatched from a 200ms poll loop, so the
  // identity of the returned slice decides whether every whole-slice subscriber
  // re-renders 5x/second. These guard the bailout.
  describe('UPDATE_POPULATE_PROGRESS', () => {
    it('returns the SAME state object when nothing changed', () => {
      const state = makeState();
      const next = portfolioReducer(
        state,
        updatePopulateProgress({
          currentWalletId: state.populateStatus.currentWalletId,
          walletsTotal: state.populateStatus.walletsTotal,
          walletsCompleted: state.populateStatus.walletsCompleted,
          txRequestsMade: state.populateStatus.txRequestsMade,
          txsProcessed: state.populateStatus.txsProcessed,
        }),
      );
      expect(next).toBe(state);
    });

    it('returns the SAME state when walletStatusByIdUpdates repeats current values', () => {
      const state = makeState();
      const next = portfolioReducer(
        state,
        updatePopulateProgress({
          walletStatusByIdUpdates: {'wallet-1': 'in_progress'},
        }),
      );
      expect(next).toBe(state);
    });

    it('propagates a changed progress counter', () => {
      const state = makeState();
      const next = portfolioReducer(
        state,
        updatePopulateProgress({txsProcessed: 42}),
      );
      expect(next).not.toBe(state);
      expect(next.populateStatus.txsProcessed).toBe(42);
      // untouched fields are preserved
      expect(next.populateStatus.currentWalletId).toBe(
        state.populateStatus.currentWalletId,
      );
    });

    it('propagates a changed walletsCompleted', () => {
      const state = makeState();
      const next = portfolioReducer(
        state,
        updatePopulateProgress({walletsCompleted: 1}),
      );
      expect(next).not.toBe(state);
      expect(next.populateStatus.walletsCompleted).toBe(1);
    });

    it('propagates a genuinely changed walletStatusById value', () => {
      const state = makeState();
      const next = portfolioReducer(
        state,
        updatePopulateProgress({
          walletStatusByIdUpdates: {'wallet-1': 'done'},
        }),
      );
      expect(next).not.toBe(state);
      expect(next.populateStatus.walletStatusById?.['wallet-1']).toBe('done');
    });

    it('propagates a new wallet id in walletStatusById', () => {
      const state = makeState();
      const next = portfolioReducer(
        state,
        updatePopulateProgress({
          walletStatusByIdUpdates: {'wallet-2': 'in_progress'},
        }),
      );
      expect(next).not.toBe(state);
      expect(next.populateStatus.walletStatusById).toEqual({
        'wallet-1': 'in_progress',
        'wallet-2': 'in_progress',
      });
    });

    it('propagates appended errors', () => {
      const state = makeState();
      const next = portfolioReducer(
        state,
        updatePopulateProgress({
          errorsToAdd: [{walletId: 'wallet-1', message: 'boom'}],
        }),
      );
      expect(next).not.toBe(state);
      expect(next.populateStatus.errors).toEqual([
        {walletId: 'wallet-1', message: 'boom'},
      ]);
    });

    it('does not treat an empty errorsToAdd array as a change', () => {
      const state = makeState();
      const next = portfolioReducer(
        state,
        updatePopulateProgress({errorsToAdd: []}),
      );
      expect(next).toBe(state);
    });
  });
});

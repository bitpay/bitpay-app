import {portfolioReducer} from './portfolio.reducer';
import type {PortfolioState, WalletIdMap} from './portfolio.models';
import type {PortfolioActionType} from './portfolio.types';
import {
  cancelPopulatePortfolio,
  clearWalletPortfolioState,
  failPopulatePortfolio,
  finishPopulatePortfolio,
  markInitialBaselineComplete,
  setExcessiveBalanceMismatchesByWalletIdUpdates,
  setInvalidDecimalsByWalletIdUpdates,
  setSnapshotBalanceMismatchesByWalletIdUpdates,
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
  excessiveBalanceMismatchesByWalletId: {},
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
    'Wallet wallet-1 snapshot balance exceeds live balance by 2x (threshold 10%).',
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
        reason: 'completed',
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
        reason: 'completed',
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

  it('stores and clears excessive balance mismatch markers by wallet id', () => {
    const marker = excessiveBalanceMismatchMarker();
    expectStoresAndClearsWalletMapValue({
      actionCreator: setExcessiveBalanceMismatchesByWalletIdUpdates,
      selectMap: state => state.excessiveBalanceMismatchesByWalletId,
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

  it('clears excessive balance mismatch markers with wallet portfolio state', () => {
    const marker = excessiveBalanceMismatchMarker();
    const withMarker = makeState({
      excessiveBalanceMismatchesByWalletId: {
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

    expect(
      cleared.excessiveBalanceMismatchesByWalletId?.['wallet-1'],
    ).toBeUndefined();
    expect(cleared.excessiveBalanceMismatchesByWalletId?.['wallet-2']).toEqual({
      ...marker,
      walletId: 'wallet-2',
    });
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
});

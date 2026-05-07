import {portfolioReducer} from './portfolio.reducer';
import type {PortfolioState} from './portfolio.models';
import {
  cancelPopulatePortfolio,
  failPopulatePortfolio,
  finishPopulatePortfolio,
  markInitialBaselineComplete,
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
  ...overrides,
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
      makeState({
        populateStatus: {
          ...makeState().populateStatus,
          inProgress: true,
          startedAt: 100,
        },
      }),
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
        populateStatus: {
          ...makeState().populateStatus,
          inProgress: true,
          startedAt: 100,
        },
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
        populateStatus: {
          ...makeState().populateStatus,
          inProgress: true,
          startedAt: 100,
        },
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
        populateStatus: {
          ...makeState().populateStatus,
          inProgress: true,
          startedAt: 100,
        },
      }),
      failPopulatePortfolio({error: 'boom'}),
    );

    expect(failed.lastFullPopulateCompletedAt).toBe(150);

    const cancelled = portfolioReducer(
      makeState({
        lastFullPopulateCompletedAt: 150,
        populateStatus: {
          ...makeState().populateStatus,
          inProgress: true,
        },
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
    const withMismatch = portfolioReducer(
      makeState(),
      setSnapshotBalanceMismatchesByWalletIdUpdates({
        'wallet-1': mismatch,
      }),
    );

    expect(withMismatch.snapshotBalanceMismatchesByWalletId?.['wallet-1']).toBe(
      mismatch,
    );

    const cleared = portfolioReducer(
      withMismatch,
      setSnapshotBalanceMismatchesByWalletIdUpdates({
        'wallet-1': undefined,
      }),
    );

    expect(
      cleared.snapshotBalanceMismatchesByWalletId?.['wallet-1'],
    ).toBeUndefined();
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

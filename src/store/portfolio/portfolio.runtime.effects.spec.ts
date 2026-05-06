jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    addListener: jest.fn(() => ({remove: jest.fn()})),
  },
}));

jest.mock('../../constants/device-emitter-events', () => ({
  DeviceEmitterEvents: {APP_LOCK_MODAL_DISMISSED: 'APP_LOCK_MODAL_DISMISSED'},
}));

jest.mock('../../utils/portfolio/assets', () => ({
  getVisibleWalletsFromKeys: jest.fn(() => []),
  sortWalletsByAssetFiatPriority: jest.fn((wallets: any[]) => wallets),
}));

const mockPopulateWallets = jest.fn();
const mockCancel = jest.fn();
const mockGetPortfolioPopulateDecisionsForWallets = jest.fn();
const mockWaitForStartupWalletStoreInitForPortfolio = jest.fn();

jest.mock('../../portfolio/service', () => ({
  PortfolioPopulateService: jest.fn(() => ({
    cancel: mockCancel,
    populateWallets: mockPopulateWallets,
  })),
  getPortfolioPopulateDecisionsForWallets: (...args: any[]) =>
    mockGetPortfolioPopulateDecisionsForWallets(...args),
}));

const mockRuntimeClient = {
  cancelPopulateJob: jest.fn(() => Promise.resolve()),
  clearAllStorage: jest.fn(() => Promise.resolve()),
  clearWallet: jest.fn(() => Promise.resolve()),
  getPopulateJobStatus: jest.fn(() => Promise.resolve({inProgress: false})),
  getSnapshotIndex: jest.fn(() => Promise.resolve(null)),
  kvStats: jest.fn(() => Promise.resolve({totalKeys: 0})),
  listRates: jest.fn(() => Promise.resolve([])),
};

jest.mock('../../portfolio/runtime/portfolioRuntime', () => ({
  getPortfolioRuntimeClient: jest.fn(() => mockRuntimeClient),
}));

jest.mock('../../portfolio/adapters/rn/walletMappers', () => ({
  isPortfolioRuntimeEligibleWallet: jest.fn(() => true),
  toPortfolioStoredWallet: jest.fn(({wallet}: {wallet: any}) => ({
    walletId: wallet.id,
    summary: {walletId: wallet.id},
  })),
}));

jest.mock('../wallet/utils/currency', () => ({
  GetPrecision: jest.fn(() => ({unitDecimals: 8})),
}));

jest.mock('../wallet/effects/init/init', () => ({
  waitForStartupWalletStoreInitForPortfolio: (...args: any[]) =>
    mockWaitForStartupWalletStoreInitForPortfolio(...args),
}));

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('./portfolio.actions', () => ({
  cancelPopulatePortfolio: jest.fn(() => ({type: 'CANCEL_POPULATE'})),
  clearPortfolio: jest.fn((payload?: any) => ({
    payload,
    type: 'CLEAR_PORTFOLIO',
  })),
  clearWalletPortfolioState: jest.fn((payload: any) => ({
    payload,
    type: 'CLEAR_WALLET_PORTFOLIO_STATE',
  })),
  failPopulatePortfolio: jest.fn((payload: any) => ({
    payload,
    type: 'FAIL_POPULATE',
  })),
  finishPopulatePortfolio: jest.fn((payload: any) => ({
    payload,
    type: 'FINISH_POPULATE',
  })),
  markInitialBaselineComplete: jest.fn((payload: any) => ({
    payload,
    type: 'MARK_INITIAL_BASELINE_COMPLETE',
  })),
  setSnapshotBalanceMismatchesByWalletIdUpdates: jest.fn((payload: any) => ({
    payload,
    type: 'SET_MISMATCHES',
  })),
  startPopulatePortfolio: jest.fn((payload: any) => ({
    payload,
    type: 'START_POPULATE',
  })),
  updatePopulateProgress: jest.fn((payload: any) => ({
    payload,
    type: 'UPDATE_PROGRESS',
  })),
}));

import {DeviceEventEmitter} from 'react-native';
import {
  cancelPopulatePortfolioWithRuntime,
  clearPortfolioRuntimeUnlockDeferralForTests,
  maybePopulatePortfolioForWalletsWithRuntime,
  maybePopulatePortfolioOnAppLaunchWithRuntime,
  populatePortfolioWithRuntime,
} from './portfolio.runtime.effects';

const mockGetVisibleWalletsFromKeys = jest.requireMock(
  '../../utils/portfolio/assets',
).getVisibleWalletsFromKeys as jest.Mock;
const mockPortfolioService = jest.requireMock('../../portfolio/service')
  .PortfolioPopulateService as jest.Mock;
const mockStartPopulatePortfolio = jest.requireMock('./portfolio.actions')
  .startPopulatePortfolio as jest.Mock;
const mockFinishPopulatePortfolio = jest.requireMock('./portfolio.actions')
  .finishPopulatePortfolio as jest.Mock;
const mockLogManager = jest.requireMock('../../managers/LogManager')
  .logManager as {
  warn: jest.Mock;
};

type State = Record<string, any>;

const walletFactory = (overrides: Record<string, any> = {}) => ({
  chain: 'btc',
  currencyAbbreviation: 'btc',
  id: 'wallet-1',
  name: 'Wallet 1',
  network: 'livenet',
  ...overrides,
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, reject, resolve};
};

const makeState = (overrides: State = {}) => {
  const {
    APP: appOverrides,
    PORTFOLIO: portfolioOverrides,
    WALLET: walletOverrides,
    ...rootOverrides
  } = overrides;

  return {
    ...rootOverrides,
    APP: {
      defaultAltCurrency: {isoCode: 'USD'},
      homeCarouselConfig: [],
      lockAuthorizedUntil: undefined,
      biometricLockActive: false,
      pinLockActive: false,
      showPortfolioValue: true,
      ...appOverrides,
    },
    PORTFOLIO: {
      lastPopulatedAt: undefined,
      populateStatus: {inProgress: false},
      ...portfolioOverrides,
    },
    WALLET: {
      keys: {},
      ...walletOverrides,
    },
  };
};

const makeStore = (state: State) => {
  const dispatched: any[] = [];
  const getState = () => state;
  const dispatch = jest.fn((action: any): any => {
    if (typeof action === 'function') {
      return action(dispatch, getState);
    }
    dispatched.push(action);
    if (action?.type === 'START_POPULATE') {
      state.PORTFOLIO.populateStatus = {inProgress: true};
    }
    if (
      action?.type === 'FINISH_POPULATE' ||
      action?.type === 'FAIL_POPULATE' ||
      action?.type === 'CANCEL_POPULATE'
    ) {
      state.PORTFOLIO.populateStatus = {inProgress: false};
    }
    return action;
  });

  return {dispatch, dispatched, getState};
};

const getUnlockCallback = () =>
  (DeviceEventEmitter.addListener as jest.Mock).mock.calls[0]?.[1] as
    | (() => Promise<void>)
    | undefined;

describe('portfolio runtime effects lock deferral', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    clearPortfolioRuntimeUnlockDeferralForTests();
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGetVisibleWalletsFromKeys.mockReturnValue([walletFactory()]);
    mockWaitForStartupWalletStoreInitForPortfolio.mockResolvedValue({
      status: 'completed',
      walletInitSuccess: true,
    });
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValue({
      decisions: [
        {
          latestSnapshot: null,
          index: null,
          reason: 'up_to_date',
          shouldPopulate: false,
          walletId: 'wallet-1',
        },
      ],
      mismatchByWalletId: {'wallet-1': undefined},
      walletIdsToPopulate: ['wallet-1'],
    });
    mockPopulateWallets.mockResolvedValue({
      cancelled: false,
      finishedAt: 1234,
      results: [{walletId: 'wallet-1'}],
      status: {
        currentWalletId: undefined,
        errors: [],
        inProgress: false,
        jobId: 'populate-job-1',
        lastUpdatedAt: 1234,
        startedAt: 1200,
        state: 'completed',
        txRequestsMade: 0,
        txsProcessed: 0,
        walletStatusById: {'wallet-1': 'done'},
        walletsCompleted: 1,
        walletsTotal: 1,
      },
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    clearPortfolioRuntimeUnlockDeferralForTests();
    jest.useRealTimers();
  });

  it('preserves default Show Portfolio value for partial APP overrides', () => {
    const state = makeState({APP: {pinLockActive: true}});

    expect(state.APP).toMatchObject({
      pinLockActive: true,
      showPortfolioValue: true,
    });
  });

  it('runtime populate defers when PIN lock is active and lockAuthorizedUntil is undefined', async () => {
    const state = makeState({
      APP: {pinLockActive: true, lockAuthorizedUntil: undefined},
    });
    const {dispatch} = makeStore(state);

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expect(DeviceEventEmitter.addListener).toHaveBeenCalledWith(
      'APP_LOCK_MODAL_DISMISSED',
      expect.any(Function),
    );
    expect(mockPortfolioService).not.toHaveBeenCalled();
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('runtime populate defers when biometric lock is active and lockAuthorizedUntil is undefined', async () => {
    const state = makeState({
      APP: {biometricLockActive: true, lockAuthorizedUntil: undefined},
    });
    const {dispatch} = makeStore(state);

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expect(DeviceEventEmitter.addListener).toHaveBeenCalledWith(
      'APP_LOCK_MODAL_DISMISSED',
      expect.any(Function),
    );
    expect(mockPortfolioService).not.toHaveBeenCalled();
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('runtime populate does not defer when lockAuthorizedUntil is finite', async () => {
    const state = makeState({
      APP: {
        lockAuthorizedUntil: Date.now() + 60000,
        pinLockActive: true,
      },
    });
    const {dispatch} = makeStore(state);

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expect(DeviceEventEmitter.addListener).not.toHaveBeenCalled();
    expect(mockStartPopulatePortfolio).toHaveBeenCalledWith({
      quoteCurrency: 'USD',
    });
    expect(mockPortfolioService).toHaveBeenCalledTimes(1);
  });

  it('marks a completed full populate as completing the initial baseline', async () => {
    const state = makeState();
    const {dispatch} = makeStore(state);

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expect(mockFinishPopulatePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({
        finishedAt: 1234,
        lastFullPopulateCompletedAt: 1234,
        quoteCurrency: 'USD',
        reason: 'completed',
      }),
    );
  });

  it('updates the completed full-populate timestamp on later full populates', async () => {
    const state = makeState({
      PORTFOLIO: {lastFullPopulateCompletedAt: 1000},
    });
    const {dispatch} = makeStore(state);

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expect(mockFinishPopulatePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({
        finishedAt: 1234,
        lastFullPopulateCompletedAt: 1234,
        quoteCurrency: 'USD',
        reason: 'completed',
      }),
    );
  });

  it('queues scoped wallet populate requests made during an active populate', async () => {
    const wallet1 = walletFactory({id: 'wallet-1'});
    const wallet2 = walletFactory({id: 'wallet-2'});
    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);
    const activePopulate = deferred<any>();
    mockGetVisibleWalletsFromKeys.mockReturnValue([wallet1, wallet2]);
    mockPopulateWallets.mockImplementationOnce(() => activePopulate.promise);

    const firstPopulatePromise = dispatch(
      populatePortfolioWithRuntime({
        quoteCurrency: 'USD',
        wallets: [wallet1],
      }),
    );

    await Promise.resolve();
    await dispatch(
      populatePortfolioWithRuntime({
        quoteCurrency: 'EUR',
        wallets: [wallet2],
      }),
    );

    expect(mockPopulateWallets).toHaveBeenCalledTimes(1);

    activePopulate.resolve({
      cancelled: false,
      finishedAt: 1234,
      results: [{walletId: 'wallet-1'}],
      status: {
        currentWalletId: undefined,
        errors: [],
        inProgress: false,
        jobId: 'populate-job-1',
        lastUpdatedAt: 1234,
        startedAt: 1200,
        state: 'completed',
        txRequestsMade: 0,
        txsProcessed: 0,
        walletStatusById: {'wallet-1': 'done'},
        walletsCompleted: 1,
        walletsTotal: 1,
      },
    });
    await firstPopulatePromise;

    expect(mockPopulateWallets).toHaveBeenCalledTimes(2);
    expect(mockPopulateWallets.mock.calls[1][0].wallets).toEqual([
      expect.objectContaining({walletId: 'wallet-2'}),
    ]);

    const startPayloads = dispatched
      .filter(action => action.type === 'START_POPULATE')
      .map(action => action.payload);
    expect(startPayloads).toEqual([
      {quoteCurrency: 'USD'},
      {quoteCurrency: 'EUR'},
    ]);
  });

  it('drains queued scoped wallet populates after explicit cancel with the current app quote', async () => {
    const wallet1 = walletFactory({id: 'wallet-1'});
    const wallet2 = walletFactory({id: 'wallet-2'});
    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);
    const activePopulate = deferred<any>();
    mockGetVisibleWalletsFromKeys.mockReturnValue([wallet1, wallet2]);
    mockPopulateWallets.mockImplementationOnce(() => activePopulate.promise);

    const firstPopulatePromise = dispatch(
      populatePortfolioWithRuntime({
        quoteCurrency: 'USD',
        wallets: [wallet1],
      }),
    );

    await Promise.resolve();
    await dispatch(
      populatePortfolioWithRuntime({
        quoteCurrency: 'USD',
        wallets: [wallet2],
      }),
    );

    const cancelPromise = dispatch(cancelPopulatePortfolioWithRuntime());
    state.APP.defaultAltCurrency = {isoCode: 'GBP'};
    await cancelPromise;

    expect(mockRuntimeClient.getPopulateJobStatus).toHaveBeenCalled();
    expect(mockPopulateWallets).toHaveBeenCalledTimes(2);
    expect(mockPopulateWallets.mock.calls[1][0].wallets).toEqual([
      expect.objectContaining({walletId: 'wallet-2'}),
    ]);

    activePopulate.resolve({
      cancelled: false,
      finishedAt: 1234,
      results: [{walletId: 'wallet-1'}],
      status: {
        currentWalletId: undefined,
        errors: [],
        inProgress: false,
        jobId: 'populate-job-1',
        lastUpdatedAt: 1234,
        startedAt: 1200,
        state: 'completed',
        txRequestsMade: 0,
        txsProcessed: 0,
        walletStatusById: {'wallet-1': 'done'},
        walletsCompleted: 1,
        walletsTotal: 1,
      },
    });
    await firstPopulatePromise;

    const dispatchedTypes = dispatched.map(action => action.type);
    expect(dispatchedTypes).toEqual(
      expect.arrayContaining([
        'START_POPULATE',
        'CANCEL_POPULATE',
        'FINISH_POPULATE',
      ]),
    );

    const startPayloads = dispatched
      .filter(action => action.type === 'START_POPULATE')
      .map(action => action.payload);
    expect(startPayloads).toEqual([
      {quoteCurrency: 'USD'},
      {quoteCurrency: 'GBP'},
    ]);
  });

  it('refreshes done-wallet mismatch state after populate instead of blindly clearing it', async () => {
    const refreshedMismatch = {
      walletId: 'wallet-1',
      computedAtomic: '100000000',
      currentAtomic: '150000000',
      deltaAtomic: '-50000000',
      computedUnitsHeld: '1',
      currentWalletBalance: '1.5',
      delta: '-0.5',
    };
    const state = makeState({
      PORTFOLIO: {
        snapshotBalanceMismatchesByWalletId: {
          'wallet-1': {
            ...refreshedMismatch,
            deltaAtomic: '-40000000',
          },
        },
      },
    });
    const {dispatch, dispatched} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce({
      decisions: [
        {
          index: {walletId: 'wallet-1'},
          latestSnapshot: {walletId: 'wallet-1', cryptoBalance: '100000000'},
          mismatch: refreshedMismatch,
          reason: 'balance_mismatch',
          shouldPopulate: true,
          walletId: 'wallet-1',
        },
      ],
      mismatchByWalletId: {'wallet-1': refreshedMismatch},
      walletIdsToPopulate: ['wallet-1'],
    });

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expect(dispatched).toContainEqual({
      payload: {'wallet-1': refreshedMismatch},
      type: 'SET_MISMATCHES',
    });
    const dispatchedTypes = dispatched.map(action => action.type);
    expect(dispatchedTypes.indexOf('FINISH_POPULATE')).toBeLessThan(
      dispatchedTypes.indexOf('SET_MISMATCHES'),
    );
  });

  it('marks a completed full populate with wallet errors as completing the initial baseline', async () => {
    const state = makeState();
    const {dispatch} = makeStore(state);

    mockPopulateWallets.mockResolvedValueOnce({
      cancelled: false,
      finishedAt: 1234,
      results: [],
      status: {
        currentWalletId: undefined,
        disabledForLargeHistory: false,
        errors: [{walletId: 'wallet-1', message: 'first failure'}],
        inProgress: false,
        jobId: 'populate-job-1',
        lastUpdatedAt: 1234,
        startedAt: 1200,
        state: 'completed',
        txRequestsMade: 3,
        txsProcessed: 31,
        walletStatusById: {
          'wallet-1': 'error',
        },
        walletsCompleted: 0,
        walletsTotal: 1,
      },
    });

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expect(mockFinishPopulatePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({
        finishedAt: 1234,
        lastFullPopulateCompletedAt: 1234,
        quoteCurrency: 'USD',
        reason: 'completed with wallet error: wallet-1: first failure',
      }),
    );
  });

  it('marks scoped wallet populates incomplete when remaining initial work exists', async () => {
    const wallet = walletFactory();
    const state = makeState();
    const {dispatch} = makeStore(state);

    await dispatch(
      populatePortfolioWithRuntime({
        quoteCurrency: 'USD',
        wallets: [wallet as any],
      }),
    );

    const payload = mockFinishPopulatePortfolio.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      finishedAt: 1234,
      quoteCurrency: 'USD',
      reason: 'completed',
    });
    expect(payload).not.toHaveProperty('lastFullPopulateCompletedAt');
  });

  it('marks a scoped resumed populate as completing the initial baseline when no remaining wallets need work', async () => {
    const wallet = walletFactory();
    const state = makeState();
    const {dispatch} = makeStore(state);

    mockGetPortfolioPopulateDecisionsForWallets
      .mockResolvedValueOnce({
        decisions: [],
        mismatchByWalletId: {},
        walletIdsToPopulate: ['wallet-1'],
      })
      .mockResolvedValueOnce({
        decisions: [
          {
            latestSnapshot: null,
            index: null,
            reason: 'up_to_date',
            shouldPopulate: false,
            walletId: 'wallet-1',
          },
        ],
        mismatchByWalletId: {'wallet-1': undefined},
        walletIdsToPopulate: [],
      })
      .mockResolvedValueOnce({
        decisions: [],
        mismatchByWalletId: {},
        walletIdsToPopulate: [],
      });

    await dispatch(
      maybePopulatePortfolioForWalletsWithRuntime({
        quoteCurrency: 'USD',
        wallets: [wallet as any],
      }),
    );

    expect(mockGetPortfolioPopulateDecisionsForWallets).toHaveBeenCalledTimes(
      3,
    );
    expect(mockFinishPopulatePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({
        finishedAt: 1234,
        lastFullPopulateCompletedAt: 1234,
        quoteCurrency: 'USD',
        reason: 'completed',
      }),
    );
  });

  it('logs all wallet errors from the terminal populate status', async () => {
    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);
    const errors = [
      {walletId: 'wallet-1', message: 'first failure'},
      {walletId: 'wallet-2', message: 'second failure'},
    ];

    mockGetVisibleWalletsFromKeys.mockReturnValue([
      walletFactory({id: 'wallet-1'}),
      walletFactory({id: 'wallet-2'}),
    ]);
    mockPopulateWallets.mockResolvedValueOnce({
      cancelled: false,
      finishedAt: 1234,
      results: [],
      status: {
        currentWalletId: undefined,
        disabledForLargeHistory: false,
        errors,
        inProgress: false,
        jobId: 'populate-job-1',
        lastUpdatedAt: 1234,
        startedAt: 1200,
        state: 'completed',
        txRequestsMade: 3,
        txsProcessed: 31,
        walletStatusById: {
          'wallet-1': 'error',
          'wallet-2': 'error',
        },
        walletsCompleted: 0,
        walletsTotal: 2,
      },
    });

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    const warning = mockLogManager.warn.mock.calls.find(
      call => call[0] === '[portfolio] Populate completed with wallet errors',
    );
    expect(warning).toBeDefined();

    const payload = JSON.parse(warning![1]);
    expect(payload).toMatchObject({
      completedWalletCount: 0,
      errorCount: 2,
      jobId: 'populate-job-1',
      quoteCurrency: 'USD',
      requestedWalletCount: 2,
      state: 'completed',
      txRequestsMade: 3,
      txsProcessed: 31,
      walletsTotal: 2,
    });
    expect(payload.errors).toEqual([
      {index: 0, walletId: 'wallet-1', message: 'first failure'},
      {index: 1, walletId: 'wallet-2', message: 'second failure'},
    ]);
    expect(dispatched).toContainEqual({
      payload: {
        finishedAt: 1234,
        lastFullPopulateCompletedAt: 1234,
        quoteCurrency: 'USD',
        reason:
          'completed with 2 wallet errors; last: wallet-2: second failure',
      },
      type: 'FINISH_POPULATE',
    });
  });

  it('re-dispatches deferred populate after unlock without registering duplicate listeners', async () => {
    jest.useFakeTimers();
    const state = makeState({
      APP: {pinLockActive: true, lockAuthorizedUntil: undefined},
    });
    const {dispatch} = makeStore(state);

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));
    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expect(DeviceEventEmitter.addListener).toHaveBeenCalledTimes(1);
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();

    state.APP.lockAuthorizedUntil = Date.now() + 60000;
    const unlockCallback = getUnlockCallback();
    expect(unlockCallback).toEqual(expect.any(Function));

    const unlockPromise = unlockCallback!();
    jest.advanceTimersByTime(3000);
    await unlockPromise;

    expect(mockStartPopulatePortfolio).toHaveBeenCalledTimes(1);
  });

  it('maybePopulatePortfolioForWalletsWithRuntime also defers while locked', async () => {
    const wallet = walletFactory();
    const state = makeState({
      APP: {biometricLockActive: true, lockAuthorizedUntil: undefined},
    });
    const {dispatch} = makeStore(state);

    await dispatch(
      maybePopulatePortfolioForWalletsWithRuntime({
        quoteCurrency: 'USD',
        wallets: [wallet as any],
      }),
    );

    expect(DeviceEventEmitter.addListener).toHaveBeenCalledWith(
      'APP_LOCK_MODAL_DISMISSED',
      expect.any(Function),
    );
    expect(mockGetPortfolioPopulateDecisionsForWallets).not.toHaveBeenCalled();
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('maybePopulatePortfolioForWalletsWithRuntime resolves scoped wallet ids from current state', async () => {
    const wallet = walletFactory({id: 'wallet-from-state'});
    const state = makeState({
      WALLET: {
        keys: {
          'key-1': {
            wallets: [wallet],
          },
        },
      },
    });
    const {dispatch} = makeStore(state);

    mockGetPortfolioPopulateDecisionsForWallets
      .mockResolvedValueOnce({
        decisions: [
          {
            latestSnapshot: null,
            index: null,
            reason: 'missing_snapshot',
            shouldPopulate: true,
            walletId: 'wallet-from-state',
          },
        ],
        mismatchByWalletId: {},
        walletIdsToPopulate: ['wallet-from-state'],
      })
      .mockResolvedValueOnce({
        decisions: [],
        mismatchByWalletId: {},
        walletIdsToPopulate: [],
      });

    await dispatch(
      maybePopulatePortfolioForWalletsWithRuntime({
        quoteCurrency: 'USD',
        walletIds: ['wallet-from-state'],
      }),
    );

    expect(
      mockGetPortfolioPopulateDecisionsForWallets.mock.calls[0][0].wallets,
    ).toEqual([wallet]);
    expect(mockPopulateWallets.mock.calls[0][0].wallets).toEqual([
      {walletId: 'wallet-from-state', summary: {walletId: 'wallet-from-state'}},
    ]);
  });

  it('app launch selective populate skips wallets with unchanged persisted mismatch', async () => {
    const wallet = walletFactory();
    const persistedMismatch = {
      walletId: 'wallet-1',
      computedAtomic: '100000000',
      currentAtomic: '150000000',
      deltaAtomic: '-50000000',
      computedUnitsHeld: '1',
      currentWalletBalance: '1.5',
      delta: '-0.5',
    };
    const state = makeState({
      PORTFOLIO: {
        snapshotBalanceMismatchesByWalletId: {
          'wallet-1': persistedMismatch,
        },
      },
    });
    const {dispatch, dispatched} = makeStore(state);
    mockGetVisibleWalletsFromKeys.mockReturnValue([wallet]);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce({
      decisions: [
        {
          index: {walletId: 'wallet-1'},
          latestSnapshot: {walletId: 'wallet-1', cryptoBalance: '100000000'},
          mismatch: persistedMismatch,
          reason: 'unchanged_balance_mismatch',
          shouldPopulate: false,
          walletId: 'wallet-1',
        },
      ],
      mismatchByWalletId: {'wallet-1': persistedMismatch},
      walletIdsToPopulate: [],
    });

    await dispatch(
      maybePopulatePortfolioOnAppLaunchWithRuntime({quoteCurrency: 'USD'}),
    );

    expect(mockGetPortfolioPopulateDecisionsForWallets).toHaveBeenCalledWith(
      expect.objectContaining({
        previousMismatchByWalletId: {
          'wallet-1': persistedMismatch,
        },
        wallets: [wallet],
      }),
    );
    expect(dispatched).toContainEqual({
      payload: {'wallet-1': persistedMismatch},
      type: 'SET_MISMATCHES',
    });
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
    expect(mockPortfolioService).not.toHaveBeenCalled();
  });

  it('app launch waits for startup wallet init before staleness decisions', async () => {
    const wallet = walletFactory();
    const state = makeState();
    const {dispatch} = makeStore(state);
    const walletInitWait = deferred<any>();
    mockGetVisibleWalletsFromKeys.mockReturnValue([wallet]);
    mockWaitForStartupWalletStoreInitForPortfolio.mockReturnValueOnce(
      walletInitWait.promise,
    );
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce({
      decisions: [],
      mismatchByWalletId: {'wallet-1': undefined},
      walletIdsToPopulate: [],
    });

    const launchPromise = dispatch(
      maybePopulatePortfolioOnAppLaunchWithRuntime({quoteCurrency: 'USD'}),
    );
    await Promise.resolve();

    expect(mockGetPortfolioPopulateDecisionsForWallets).not.toHaveBeenCalled();

    walletInitWait.resolve({status: 'completed', walletInitSuccess: true});
    await launchPromise;

    expect(mockGetPortfolioPopulateDecisionsForWallets).toHaveBeenCalledWith(
      expect.objectContaining({wallets: [wallet]}),
    );
  });

  it('app launch falls back to full populate when startup wallet init fails', async () => {
    const state = makeState();
    const {dispatch} = makeStore(state);
    mockWaitForStartupWalletStoreInitForPortfolio.mockResolvedValueOnce({
      status: 'failed',
      walletInitSuccess: false,
    });
    mockPopulateWallets.mockResolvedValueOnce({
      cancelled: false,
      finishedAt: 1234,
      results: [],
      status: {
        currentWalletId: undefined,
        errors: [],
        inProgress: false,
        jobId: 'populate-job-1',
        lastUpdatedAt: 1234,
        startedAt: 1200,
        state: 'completed',
        txRequestsMade: 0,
        txsProcessed: 0,
        walletStatusById: {},
        walletsCompleted: 0,
        walletsTotal: 1,
      },
    });

    await dispatch(
      maybePopulatePortfolioOnAppLaunchWithRuntime({quoteCurrency: 'USD'}),
    );

    expect(mockLogManager.warn).toHaveBeenCalledWith(
      '[portfolio] Launch wallet status refresh did not complete before populate decision',
      expect.any(String),
    );
    expect(mockGetPortfolioPopulateDecisionsForWallets).not.toHaveBeenCalled();
    expect(mockStartPopulatePortfolio).toHaveBeenCalledWith({
      quoteCurrency: 'USD',
    });
    expect(mockPortfolioService).toHaveBeenCalledTimes(1);
  });

  it('app launch falls back to full populate when startup wallet init is not confirmed completed', async () => {
    const state = makeState();
    const {dispatch} = makeStore(state);
    mockWaitForStartupWalletStoreInitForPortfolio.mockResolvedValueOnce({
      status: 'skipped',
      walletInitSuccess: false,
    });
    mockPopulateWallets.mockResolvedValueOnce({
      cancelled: false,
      finishedAt: 1234,
      results: [],
      status: {
        currentWalletId: undefined,
        errors: [],
        inProgress: false,
        jobId: 'populate-job-1',
        lastUpdatedAt: 1234,
        startedAt: 1200,
        state: 'completed',
        txRequestsMade: 0,
        txsProcessed: 0,
        walletStatusById: {},
        walletsCompleted: 0,
        walletsTotal: 1,
      },
    });

    await dispatch(
      maybePopulatePortfolioOnAppLaunchWithRuntime({quoteCurrency: 'USD'}),
    );

    expect(mockGetPortfolioPopulateDecisionsForWallets).not.toHaveBeenCalled();
    expect(mockStartPopulatePortfolio).toHaveBeenCalledWith({
      quoteCurrency: 'USD',
    });
    expect(mockPortfolioService).toHaveBeenCalledTimes(1);
  });

  it('app launch marks the initial baseline complete when all wallets are up to date', async () => {
    const state = makeState({
      PORTFOLIO: {
        lastFullPopulateCompletedAt: null,
      },
    });
    const {dispatch, dispatched} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce({
      decisions: [
        {
          index: {walletId: 'wallet-1'},
          latestSnapshot: {walletId: 'wallet-1', cryptoBalance: '100000000'},
          reason: 'up_to_date',
          shouldPopulate: false,
          walletId: 'wallet-1',
        },
      ],
      mismatchByWalletId: {'wallet-1': undefined},
      walletIdsToPopulate: [],
    });

    await dispatch(
      maybePopulatePortfolioOnAppLaunchWithRuntime({quoteCurrency: 'USD'}),
    );

    expect(dispatched).toEqual(
      expect.arrayContaining([
        {
          payload: expect.objectContaining({quoteCurrency: 'USD'}),
          type: 'MARK_INITIAL_BASELINE_COMPLETE',
        },
      ]),
    );
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('app launch marks a scoped initial wallet-work pass as completing the baseline', async () => {
    const state = makeState({
      PORTFOLIO: {
        lastFullPopulateCompletedAt: null,
      },
    });
    const {dispatch} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce({
      decisions: [
        {
          index: null,
          latestSnapshot: null,
          reason: 'missing_index',
          shouldPopulate: true,
          walletId: 'wallet-1',
        },
      ],
      mismatchByWalletId: {'wallet-1': undefined},
      walletIdsToPopulate: ['wallet-1'],
    });

    await dispatch(
      maybePopulatePortfolioOnAppLaunchWithRuntime({quoteCurrency: 'USD'}),
    );

    expect(mockStartPopulatePortfolio).toHaveBeenCalledWith({
      quoteCurrency: 'USD',
    });
    expect(mockFinishPopulatePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({
        finishedAt: 1234,
        lastFullPopulateCompletedAt: 1234,
        quoteCurrency: 'USD',
      }),
    );
  });

  it('app launch marks the initial baseline complete for unchanged persisted mismatches', async () => {
    const mismatch = {
      walletId: 'wallet-1',
      computedAtomic: '100000000',
      currentAtomic: '150000000',
      deltaAtomic: '-50000000',
      computedUnitsHeld: '1',
      currentWalletBalance: '1.5',
      delta: '-0.5',
    };
    const state = makeState({
      PORTFOLIO: {
        lastFullPopulateCompletedAt: null,
        snapshotBalanceMismatchesByWalletId: {'wallet-1': mismatch},
      },
    });
    const {dispatch, dispatched} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce({
      decisions: [
        {
          index: {walletId: 'wallet-1'},
          latestSnapshot: {walletId: 'wallet-1', cryptoBalance: '100000000'},
          mismatch,
          reason: 'unchanged_balance_mismatch',
          shouldPopulate: false,
          walletId: 'wallet-1',
        },
      ],
      mismatchByWalletId: {'wallet-1': mismatch},
      walletIdsToPopulate: [],
    });

    await dispatch(
      maybePopulatePortfolioOnAppLaunchWithRuntime({quoteCurrency: 'USD'}),
    );

    expect(dispatched).toEqual(
      expect.arrayContaining([
        {
          payload: expect.objectContaining({quoteCurrency: 'USD'}),
          type: 'MARK_INITIAL_BASELINE_COMPLETE',
        },
      ]),
    );
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('app launch marks the initial baseline complete for invalid-history no-op decisions', async () => {
    const state = makeState({
      PORTFOLIO: {
        lastFullPopulateCompletedAt: null,
      },
    });
    const {dispatch, dispatched} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce({
      decisions: [
        {
          index: null,
          latestSnapshot: null,
          reason: 'invalid_history',
          shouldPopulate: false,
          walletId: 'wallet-1',
        },
      ],
      mismatchByWalletId: {'wallet-1': undefined},
      walletIdsToPopulate: [],
    });

    await dispatch(
      maybePopulatePortfolioOnAppLaunchWithRuntime({quoteCurrency: 'USD'}),
    );

    expect(dispatched).toEqual(
      expect.arrayContaining([
        {
          payload: expect.objectContaining({quoteCurrency: 'USD'}),
          type: 'MARK_INITIAL_BASELINE_COMPLETE',
        },
      ]),
    );
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('app launch marks the initial baseline complete when there are zero eligible wallets', async () => {
    const state = makeState({
      PORTFOLIO: {
        lastFullPopulateCompletedAt: null,
      },
    });
    const {dispatch, dispatched} = makeStore(state);
    mockGetVisibleWalletsFromKeys.mockReturnValueOnce([]);

    await dispatch(
      maybePopulatePortfolioOnAppLaunchWithRuntime({quoteCurrency: 'USD'}),
    );

    expect(mockGetPortfolioPopulateDecisionsForWallets).not.toHaveBeenCalled();
    expect(dispatched).toEqual(
      expect.arrayContaining([
        {
          payload: expect.objectContaining({quoteCurrency: 'USD'}),
          type: 'MARK_INITIAL_BASELINE_COMPLETE',
        },
      ]),
    );
  });

  it('does not dispatch stale progress or finish after active runtime populate is cancelled', async () => {
    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);
    const populateDeferred = deferred<any>();
    let onProgress: ((status: any) => void) | undefined;
    const finalStatus = {
      currentWalletId: undefined,
      errors: [],
      txRequestsMade: 1,
      txsProcessed: 2,
      walletStatusById: {'wallet-1': 'done'},
      walletsCompleted: 1,
      walletsTotal: 1,
    };

    mockPopulateWallets.mockImplementationOnce(({onProgress: callback}) => {
      onProgress = callback;
      return populateDeferred.promise;
    });

    const populatePromise = dispatch(
      populatePortfolioWithRuntime({quoteCurrency: 'USD'}),
    );
    expect(onProgress).toEqual(expect.any(Function));

    dispatch(cancelPopulatePortfolioWithRuntime());
    onProgress!(finalStatus);
    populateDeferred.resolve({
      cancelled: false,
      finishedAt: 1234,
      results: [{walletId: 'wallet-1'}],
      status: finalStatus,
    });
    await populatePromise;

    const dispatchedTypes = dispatched.map(action => action.type);
    expect(dispatchedTypes).toContain('START_POPULATE');
    expect(dispatchedTypes).toContain('CANCEL_POPULATE');
    expect(dispatchedTypes).not.toEqual(
      expect.arrayContaining([
        'UPDATE_PROGRESS',
        'SET_MISMATCHES',
        'FINISH_POPULATE',
        'FAIL_POPULATE',
      ]),
    );
  });

  it('does not dispatch stale failure after active runtime populate is cancelled', async () => {
    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);
    const populateDeferred = deferred<any>();

    mockPopulateWallets.mockImplementationOnce(() => populateDeferred.promise);

    const populatePromise = dispatch(
      populatePortfolioWithRuntime({quoteCurrency: 'USD'}),
    );
    dispatch(cancelPopulatePortfolioWithRuntime());
    populateDeferred.reject(new Error('late failure'));
    await populatePromise;

    const dispatchedTypes = dispatched.map(action => action.type);
    expect(dispatchedTypes).toContain('START_POPULATE');
    expect(dispatchedTypes).toContain('CANCEL_POPULATE');
    expect(dispatchedTypes).not.toEqual(
      expect.arrayContaining([
        'UPDATE_PROGRESS',
        'SET_MISMATCHES',
        'FINISH_POPULATE',
        'FAIL_POPULATE',
      ]),
    );
  });
});

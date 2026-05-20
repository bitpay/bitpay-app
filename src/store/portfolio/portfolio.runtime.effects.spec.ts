jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    addListener: jest.fn(() => ({remove: jest.fn()})),
  },
}));

jest.mock('../../constants/device-emitter-events', () => ({
  DeviceEmitterEvents: {APP_LOCK_MODAL_DISMISSED: 'APP_LOCK_MODAL_DISMISSED'},
}));

jest.mock('../../utils/portfolio/assets', () => ({
  getPortfolioWalletTokenAddress: jest.fn((wallet: any) => wallet.tokenAddress),
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
  buildPortfolioExcessiveBalanceMismatchMarker: jest.fn(
    ({mismatch, detectedAt, lastAttemptedAt, previousMarker}: any) => {
      const computedAtomic = BigInt(mismatch.computedAtomic);
      const liveAtomic = BigInt(mismatch.currentAtomic);
      const deltaAtomic = computedAtomic - liveAtomic;
      const absDeltaAtomic = deltaAtomic < 0n ? -deltaAtomic : deltaAtomic;
      const absLiveAtomic = liveAtomic < 0n ? -liveAtomic : liveAtomic;
      const isExcessive =
        absDeltaAtomic > 0n &&
        (absLiveAtomic === 0n ||
          absDeltaAtomic * 10000n >= absLiveAtomic * 1000n);
      if (!isExcessive) {
        return undefined;
      }
      const ratio =
        absLiveAtomic === 0n
          ? 'Infinity'
          : (Number(absDeltaAtomic) / Number(absLiveAtomic)).toString();
      return {
        walletId: mismatch.walletId,
        reason: 'excessive_balance_mismatch',
        computedAtomic: computedAtomic.toString(),
        liveAtomic: liveAtomic.toString(),
        deltaAtomic: deltaAtomic.toString(),
        ratio,
        threshold: 0.1,
        detectedAt: previousMarker?.detectedAt ?? detectedAt,
        lastAttemptedAt: lastAttemptedAt ?? detectedAt,
        message: `Wallet ${mismatch.walletId} snapshot balance differs from live balance by ${ratio}x (threshold 10%).`,
      };
    },
  ),
  getPortfolioInvalidDecimalsMessage: (walletId: string) =>
    `Wallet ${walletId || 'unknown'} has unresolved token decimals.`,
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
  resolvePortfolioWalletUnitDecimalsFromPrecision: jest.fn(
    ({
      wallet,
      precisionUnitDecimals,
    }: {
      wallet: any;
      precisionUnitDecimals?: number;
    }) => {
      if (typeof precisionUnitDecimals === 'number') {
        return precisionUnitDecimals;
      }
      if (
        wallet?.tokenAddress ||
        wallet?.credentials?.token?.address ||
        wallet?.credentials?.tokenAddress
      ) {
        return undefined;
      }
      return 8;
    },
  ),
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
    warnWithSentryMessage: jest.fn(),
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
  markPopulateResumeSettled: jest.fn((payload: any) => ({
    payload,
    type: 'MARK_POPULATE_RESUME_SETTLED',
  })),
  setSnapshotBalanceMismatchesByWalletIdUpdates: jest.fn((payload: any) => ({
    payload,
    type: 'SET_MISMATCHES',
  })),
  setInvalidDecimalsByWalletIdUpdates: jest.fn((payload: any) => ({
    payload,
    type: 'SET_INVALID_DECIMALS',
  })),
  setQuarantinesByWalletIdUpdates: jest.fn((payload: any) => ({
    payload,
    type: 'SET_QUARANTINES',
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
  clearPortfolioWithRuntime,
  clearPortfolioRuntimeUnlockDeferralForTests,
  clearWalletPortfolioDataWithRuntime,
  maybePopulatePortfolioForWalletsWithRuntime,
  maybePopulatePortfolioOnAppLaunchWithRuntime,
  populateImportedKeyPortfolio,
  populatePortfolioWithRuntime,
} from './portfolio.runtime.effects';
import {
  buildAssetPnlSummaryCacheKey,
  clearAssetPnlSummaryCacheForTests,
  getAssetPnlSummaryCacheEntry,
  seedAssetPnlSummaryCache,
} from '../../portfolio/ui/assetPnlSummaryCache';

const mockGetVisibleWalletsFromKeys = jest.requireMock(
  '../../utils/portfolio/assets',
).getVisibleWalletsFromKeys as jest.Mock;
const mockGetPrecision = jest.requireMock('../wallet/utils/currency')
  .GetPrecision as jest.Mock;
const mockToPortfolioStoredWallet = jest.requireMock(
  '../../portfolio/adapters/rn/walletMappers',
).toPortfolioStoredWallet as jest.Mock;
const mockPortfolioService = jest.requireMock('../../portfolio/service')
  .PortfolioPopulateService as jest.Mock;
const mockStartPopulatePortfolio = jest.requireMock('./portfolio.actions')
  .startPopulatePortfolio as jest.Mock;
const mockFinishPopulatePortfolio = jest.requireMock('./portfolio.actions')
  .finishPopulatePortfolio as jest.Mock;
const mockLogManager = jest.requireMock('../../managers/LogManager')
  .logManager as {
  warn: jest.Mock;
  warnWithSentryMessage: jest.Mock;
};

type State = Record<string, any>;

const walletFactory = (overrides: Record<string, any> = {}): any => ({
  chain: 'btc',
  currencyAbbreviation: 'btc',
  id: 'wallet-1',
  name: 'Wallet 1',
  network: 'livenet',
  ...overrides,
});

const makeSharedWallet = (source: string) =>
  walletFactory({id: 'shared-wallet', source});

const makeImportedKey = (wallet: ReturnType<typeof walletFactory>) =>
  ({
    id: 'imported-key',
    wallets: [wallet],
  } as Parameters<typeof populateImportedKeyPortfolio>[0]['key']);

const excessiveMismatchDecisionResult = ({
  shouldPopulate = true,
}: {shouldPopulate?: boolean} = {}) => {
  const walletId = 'wallet-1';
  const quarantine = {
    reason: 'excessive_balance_mismatch',
    walletId,
  };

  return {
    decisions: [
      {
        quarantine,
        reason: 'excessive_balance_mismatch',
        shouldPopulate,
        walletId,
      },
    ],
    quarantinesByWalletId: {
      [walletId]: quarantine,
    },
    mismatchByWalletId: {[walletId]: undefined},
    walletIdsToPopulate: shouldPopulate ? [walletId] : [],
  };
};

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
      invalidDecimalsByWalletId: {},
      quarantinesByWalletId: {},
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

const expectOnlyStartAndCancelPopulateActions = (dispatched: any[]) => {
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
};

const successfulPopulateResult = ({
  results = [{walletId: 'wallet-1'}],
  status = {},
}: {results?: any[]; status?: Record<string, any>} = {}) => ({
  cancelled: false,
  finishedAt: 1234,
  results,
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
    ...status,
  },
});

const populateDecision = (overrides: Record<string, any> = {}) => ({
  latestSnapshot: null,
  index: null,
  reason: 'up_to_date',
  shouldPopulate: false,
  walletId: 'wallet-1',
  ...overrides,
});

const populateDecisionResult = (overrides: Record<string, any> = {}) => ({
  decisions: [populateDecision()],
  mismatchByWalletId: {'wallet-1': undefined},
  walletIdsToPopulate: [],
  ...overrides,
});

const walletSnapshot = (cryptoBalance: string) => ({
  walletId: 'wallet-1',
  cryptoBalance,
});

const mismatchDecisionResult = (mismatch: Record<string, any>) => ({
  decisions: [{mismatch, walletId: 'wallet-1'}],
});

const emptyScopedDecisionResult = (walletIdsToPopulate: string[] = []) => ({
  decisions: [],
  mismatchByWalletId: {},
  walletIdsToPopulate,
});

const expectInitialBaselineCompleteAction = (dispatched: any[]) =>
  expect(dispatched).toEqual(
    expect.arrayContaining([
      {
        payload: expect.objectContaining({quoteCurrency: 'USD'}),
        type: 'MARK_INITIAL_BASELINE_COMPLETE',
      },
    ]),
  );

const expectPopulateResumeSettledAction = (dispatched: any[]) =>
  expect(dispatched).toEqual(
    expect.arrayContaining([
      {
        payload: {settledAt: expect.any(Number)},
        type: 'MARK_POPULATE_RESUME_SETTLED',
      },
    ]),
  );

const expectStartPopulateWithUsd = () =>
  expect(mockStartPopulatePortfolio).toHaveBeenCalledWith({
    quoteCurrency: 'USD',
  });

const expectFinishedFullPopulate = (overrides: Record<string, any> = {}) =>
  expect(mockFinishPopulatePortfolio).toHaveBeenCalledWith(
    expect.objectContaining({
      finishedAt: 1234,
      lastFullPopulateCompletedAt: 1234,
      quoteCurrency: 'USD',
      reason: 'completed',
      ...overrides,
    }),
  );

const dispatchAppLaunchPopulateWithUsd = (dispatch: any) =>
  dispatch(
    maybePopulatePortfolioOnAppLaunchWithRuntime({quoteCurrency: 'USD'}),
  );

const makeInitialBaselineState = (portfolio: Record<string, any> = {}) =>
  makeState({
    PORTFOLIO: {
      lastFullPopulateCompletedAt: null,
      ...portfolio,
    },
  });

const getUnlockCallback = () =>
  (DeviceEventEmitter.addListener as jest.Mock).mock.calls[0]?.[1] as
    | (() => Promise<void>)
    | undefined;

describe('portfolio runtime effects lock deferral', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    clearPortfolioRuntimeUnlockDeferralForTests();
    clearAssetPnlSummaryCacheForTests();
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGetVisibleWalletsFromKeys.mockReturnValue([walletFactory()]);
    mockWaitForStartupWalletStoreInitForPortfolio.mockResolvedValue({
      status: 'completed',
      walletInitSuccess: true,
    });
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValue(
      populateDecisionResult({
        invalidDecimalsByWalletId: {},
        quarantinesByWalletId: {},
        walletIdsToPopulate: ['wallet-1'],
      }),
    );
    mockPopulateWallets.mockResolvedValue(successfulPopulateResult());
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    clearAssetPnlSummaryCacheForTests();
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

  it('clears asset PnL summaries when full portfolio clear succeeds', async () => {
    const identity = {
      assetKey: 'btc',
      currencyAbbreviation: 'btc',
      chain: 'btc',
      walletIds: ['wallet-1'],
      storedWalletRequestSig: '',
      quoteCurrency: 'USD',
      timeframe: '1D',
      currentRatesSignature: '',
      chartDataRevisionSig: 'rev-1',
      summaryCacheRevisionSig: '',
      balanceOffset: 0,
    } as const;
    const cacheKey = buildAssetPnlSummaryCacheKey(identity);

    seedAssetPnlSummaryCache({
      identity,
      viewModel: {
        timeframe: '1D',
        quoteCurrency: 'USD',
        walletIds: ['wallet-1'],
        dataRevisionSig: 'rev-1',
        balanceOffset: 0,
        graphPoints: [],
        analysisPoints: [
          {
            timestamp: 1,
            totalFiatBalance: 100,
            totalRemainingCostBasisFiat: 90,
            totalUnrealizedPnlFiat: 10,
            totalPnlChange: 10,
            totalPnlPercent: 11.11,
          },
        ],
        latestTotalFiatBalance: 100,
        latestDisplayedTotalFiatBalance: 100,
        totalPnlChange: 10,
        totalPnlPercent: 11.11,
        changeRow: {
          totalPnlChange: 10,
          totalPnlPercent: 11.11,
        },
      } as any,
    });
    expect(getAssetPnlSummaryCacheEntry(cacheKey)?.summary?.hasPnl).toBe(true);

    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);

    await dispatch(clearPortfolioWithRuntime());

    expect(mockRuntimeClient.clearAllStorage).toHaveBeenCalledTimes(1);
    expect(getAssetPnlSummaryCacheEntry(cacheKey)).toBeUndefined();
    expect(dispatched).toEqual(
      expect.arrayContaining([{payload: undefined, type: 'CLEAR_PORTFOLIO'}]),
    );
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
    expectStartPopulateWithUsd();
    expect(mockPortfolioService).toHaveBeenCalledTimes(1);
  });

  it('quarantines token wallets with unresolved decimals before runtime populate', async () => {
    mockGetPrecision.mockReturnValueOnce(undefined);
    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);

    await dispatch(
      populatePortfolioWithRuntime({
        quoteCurrency: 'USD',
        wallets: [
          walletFactory({
            id: 'token-wallet',
            chain: 'sol',
            currencyAbbreviation: 'weird',
            tokenAddress: 'soltokenmint111111111111111111111111111111',
            credentials: {
              chain: 'sol',
              coin: 'sol',
              token: {
                address: 'soltokenmint111111111111111111111111111111',
                symbol: 'WEIRD',
              },
            },
          }),
        ],
      }),
    );

    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
    expect(mockPortfolioService).not.toHaveBeenCalled();
    expect(dispatched).toEqual(
      expect.arrayContaining([
        {
          type: 'SET_INVALID_DECIMALS',
          payload: {
            'token-wallet': {
              walletId: 'token-wallet',
              reason: 'invalid_decimals',
              message: 'Wallet token-wallet has unresolved token decimals.',
            },
          },
        },
      ]),
    );
    const warning = mockLogManager.warnWithSentryMessage.mock.calls.find(call =>
      String(call[0] || '').includes('unresolved token decimals'),
    );
    expect(warning).toBeDefined();
    expect(String(warning![0] || '')).toContain('token-wallet');
    expect(String(warning![1] || '')).toContain('[redacted]');
    expect(String(warning![1] || '')).not.toContain('token-wallet');
  });

  it('redacts wallet ids from sentry wallet storage clearing failures', async () => {
    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);
    mockRuntimeClient.clearWallet.mockRejectedValueOnce(
      new Error('clear failed for wallet-2'),
    );

    await dispatch(
      clearWalletPortfolioDataWithRuntime({walletIds: ['wallet-2']}),
    );

    const warning = mockLogManager.warnWithSentryMessage.mock.calls.find(call =>
      String(call[0] || '').includes(
        'Failed clearing runtime wallet storage for wallet-2',
      ),
    );
    expect(warning).toBeDefined();
    expect(String(warning![0] || '')).toContain('wallet-2');
    expect(String(warning![1] || '')).toContain('[redacted]');
    expect(String(warning![1] || '')).not.toContain('wallet-2');
    expect(dispatched).toContainEqual({
      payload: {walletIds: ['wallet-2']},
      type: 'CLEAR_WALLET_PORTFOLIO_STATE',
    });
  });

  it('uses the current imported key wallets from state when populating an import', async () => {
    const staleImportedWallet = makeSharedWallet('stale-import-return');
    const existingSharedWallet = makeSharedWallet('previous-key');
    const currentImportedWallet = makeSharedWallet(
      'imported-key-current-state',
    );
    const state = makeState({
      PORTFOLIO: {
        lastFullPopulateCompletedAt: 1000,
      },
      WALLET: {
        keys: {
          'previous-key': {
            id: 'previous-key',
            wallets: [existingSharedWallet],
          },
          'imported-key': {
            id: 'imported-key',
            wallets: [currentImportedWallet],
          },
        },
      },
    });
    const {dispatch} = makeStore(state);
    const logger = {error: jest.fn()};

    populateImportedKeyPortfolio({
      dispatch: dispatch as any,
      key: makeImportedKey(staleImportedWallet),
      logger,
    });
    await (dispatch as jest.Mock).mock.results[0]?.value;

    expect(mockToPortfolioStoredWallet).toHaveBeenCalledWith(
      expect.objectContaining({wallet: currentImportedWallet}),
    );
    expect(mockToPortfolioStoredWallet).not.toHaveBeenCalledWith(
      expect.objectContaining({wallet: existingSharedWallet}),
    );
    expect(mockPopulateWallets).toHaveBeenCalledTimes(1);
    expect(mockPopulateWallets.mock.calls[0][0].wallets).toHaveLength(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('uses launch-level populate when importing before the initial baseline is complete', async () => {
    const staleImportedWallet = walletFactory({
      id: 'wallet-1',
      source: 'stale-import-return',
    });
    const importedWallet = walletFactory({id: 'wallet-1'});
    const state = makeState({
      PORTFOLIO: {
        lastFullPopulateCompletedAt: null,
      },
      WALLET: {
        keys: {
          'blank-key': {
            id: 'blank-key',
            wallets: [],
          },
          'imported-key': {
            id: 'imported-key',
            wallets: [importedWallet],
          },
        },
      },
    });
    const {dispatch} = makeStore(state);
    const logger = {error: jest.fn()};
    mockGetVisibleWalletsFromKeys.mockReturnValue([importedWallet]);

    populateImportedKeyPortfolio({
      dispatch: dispatch as any,
      key: makeImportedKey(staleImportedWallet),
      logger,
    });
    await (dispatch as jest.Mock).mock.results[0]?.value;

    expect(mockWaitForStartupWalletStoreInitForPortfolio).toHaveBeenCalled();
    expect(mockToPortfolioStoredWallet).toHaveBeenCalledWith(
      expect.objectContaining({wallet: importedWallet}),
    );
    expect(mockToPortfolioStoredWallet).not.toHaveBeenCalledWith(
      expect.objectContaining({wallet: staleImportedWallet}),
    );
    expectFinishedFullPopulate();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('preserves imported key wallet identity when import populate is queued', async () => {
    const activeWallet = walletFactory({id: 'active-wallet'});
    const staleImportedWallet = makeSharedWallet('stale-import-return');
    const existingSharedWallet = makeSharedWallet('previous-key');
    const currentImportedWallet = makeSharedWallet(
      'imported-key-current-state',
    );
    const state = makeState({
      PORTFOLIO: {
        lastFullPopulateCompletedAt: 1000,
      },
      WALLET: {
        keys: {
          'previous-key': {
            id: 'previous-key',
            wallets: [existingSharedWallet],
          },
          'imported-key': {
            id: 'imported-key',
            wallets: [currentImportedWallet],
          },
        },
      },
    });
    const {dispatch} = makeStore(state);
    const activePopulate = deferred<any>();
    const logger = {error: jest.fn()};
    mockGetVisibleWalletsFromKeys.mockReturnValue([
      existingSharedWallet,
      currentImportedWallet,
    ]);
    mockPopulateWallets.mockImplementationOnce(() => activePopulate.promise);

    const activePopulatePromise = dispatch(
      populatePortfolioWithRuntime({
        quoteCurrency: 'USD',
        wallets: [activeWallet],
      }),
    );
    await Promise.resolve();

    populateImportedKeyPortfolio({
      dispatch: dispatch as any,
      key: makeImportedKey(staleImportedWallet),
      logger,
    });

    expect(mockPopulateWallets).toHaveBeenCalledTimes(1);

    activePopulate.resolve(
      successfulPopulateResult({
        results: [{walletId: 'active-wallet'}],
        status: {
          walletStatusById: {'active-wallet': 'done'},
          walletsCompleted: 1,
          walletsTotal: 1,
        },
      }),
    );
    await activePopulatePromise;

    expect(mockPopulateWallets).toHaveBeenCalledTimes(2);
    expect(mockToPortfolioStoredWallet).toHaveBeenCalledWith(
      expect.objectContaining({wallet: currentImportedWallet}),
    );
    expect(mockToPortfolioStoredWallet).not.toHaveBeenCalledWith(
      expect.objectContaining({wallet: existingSharedWallet}),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('dedupes duplicate wallet ids before starting a runtime populate job', async () => {
    const state = makeState();
    const {dispatch} = makeStore(state);
    const firstSharedWallet = makeSharedWallet('first');
    const secondSharedWallet = makeSharedWallet('second');

    await dispatch(
      populatePortfolioWithRuntime({
        quoteCurrency: 'USD',
        wallets: [firstSharedWallet, secondSharedWallet],
      }),
    );

    expect(mockToPortfolioStoredWallet).toHaveBeenCalledTimes(1);
    expect(mockToPortfolioStoredWallet).toHaveBeenCalledWith(
      expect.objectContaining({wallet: firstSharedWallet}),
    );
    expect(mockPopulateWallets).toHaveBeenCalledTimes(1);
    expect(mockPopulateWallets.mock.calls[0][0].wallets).toHaveLength(1);
  });

  it('marks a completed full populate as completing the initial baseline', async () => {
    const state = makeState();
    const {dispatch} = makeStore(state);

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expectFinishedFullPopulate();
  });

  it('updates the completed full-populate timestamp on later full populates', async () => {
    const state = makeState({
      PORTFOLIO: {lastFullPopulateCompletedAt: 1000},
    });
    const {dispatch} = makeStore(state);

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expectFinishedFullPopulate();
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

    activePopulate.resolve(successfulPopulateResult());
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

    activePopulate.resolve(successfulPopulateResult());
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
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      mismatchDecisionResult(refreshedMismatch),
    );

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expect(dispatched).toContainEqual({
      payload: {'wallet-1': refreshedMismatch},
      type: 'SET_MISMATCHES',
    });
    const dispatchedTypes = dispatched.map(action => action.type);
    expect(dispatchedTypes.indexOf('SET_MISMATCHES')).toBeLessThan(
      dispatchedTypes.indexOf('FINISH_POPULATE'),
    );
  });

  it('quarantines excessive balance mismatches after a completed populate', async () => {
    const excessiveMismatch = {
      walletId: 'wallet-1',
      computedAtomic: '200000000',
      currentAtomic: '100000000',
    };
    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      mismatchDecisionResult(excessiveMismatch),
    );

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expect(dispatched).toEqual(
      expect.arrayContaining([
        {
          payload: {
            'wallet-1': expect.objectContaining({
              walletId: 'wallet-1',
              reason: 'excessive_balance_mismatch',
              computedAtomic: '200000000',
              liveAtomic: '100000000',
              deltaAtomic: '100000000',
              threshold: 0.1,
            }),
          },
          type: 'SET_QUARANTINES',
        },
      ]),
    );
    const dispatchedTypes = dispatched.map(action => action.type);
    expect(dispatchedTypes.indexOf('SET_QUARANTINES')).toBeLessThan(
      dispatchedTypes.indexOf('FINISH_POPULATE'),
    );
  });

  it('quarantines zero-balance token missing-index wallets after a failed populate attempt', async () => {
    const quarantine = {
      walletId: 'wallet-1',
      reason: 'zero_balance_token_missing_index',
      tokenAddress: 'token-1',
      liveAtomic: '0',
      chain: 'sol',
      detectedAt: 1234,
      lastAttemptedAt: 1234,
      message:
        'Wallet wallet-1 is a zero-balance token wallet with no portfolio snapshot index for token token-1.',
    };
    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);
    mockPopulateWallets.mockResolvedValueOnce(
      successfulPopulateResult({
        results: [],
        status: {
          errors: [{walletId: 'wallet-1', message: 'tx history failed'}],
          walletStatusById: {'wallet-1': 'error'},
          walletsCompleted: 0,
        },
      }),
    );
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce({
      decisions: [
        {
          quarantine,
          reason: 'zero_balance_token_missing_index',
          shouldPopulate: false,
          walletId: 'wallet-1',
        },
      ],
      mismatchByWalletId: {'wallet-1': undefined},
      quarantinesByWalletId: {'wallet-1': quarantine},
      walletIdsToPopulate: [],
    });

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expect(mockGetPortfolioPopulateDecisionsForWallets).toHaveBeenCalledWith(
      expect.objectContaining({
        zeroBalanceTokenMissingIndexErrorByWalletId: {
          'wallet-1': 'tx history failed',
        },
      }),
    );
    expect(dispatched).toEqual(
      expect.arrayContaining([
        {
          payload: {'wallet-1': quarantine},
          type: 'SET_QUARANTINES',
        },
      ]),
    );
  });

  it('marks a completed full populate with wallet errors as completing the initial baseline', async () => {
    const state = makeState();
    const {dispatch} = makeStore(state);

    mockPopulateWallets.mockResolvedValueOnce(
      successfulPopulateResult({
        results: [],
        status: {
          disabledForLargeHistory: false,
          errors: [{walletId: 'wallet-1', message: 'first failure'}],
          txRequestsMade: 3,
          txsProcessed: 31,
          walletStatusById: {
            'wallet-1': 'error',
          },
          walletsCompleted: 0,
        },
      }),
    );

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    expectFinishedFullPopulate({
      reason: 'completed with wallet error: wallet-1: first failure',
    });
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

  it('does not complete the initial baseline from scoped non-terminal no-op decisions', async () => {
    const wallet = walletFactory();
    const state = makeState();
    const {dispatch} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [populateDecision({reason: 'missing_snapshot'})],
        invalidDecimalsByWalletId: {},
      }),
    );

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
      .mockResolvedValueOnce(emptyScopedDecisionResult(['wallet-1']))
      .mockResolvedValueOnce(emptyScopedDecisionResult())
      .mockResolvedValueOnce(populateDecisionResult());

    await dispatch(
      maybePopulatePortfolioForWalletsWithRuntime({
        quoteCurrency: 'USD',
        wallets: [wallet as any],
      }),
    );

    expect(mockGetPortfolioPopulateDecisionsForWallets).toHaveBeenCalledTimes(
      3,
    );
    expectFinishedFullPopulate();
  });

  it('dispatches done wallet progress only after balance health markers are applied', async () => {
    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);
    const excessiveMismatch = {
      walletId: 'wallet-1',
      computedAtomic: '200000000',
      currentAtomic: '100000000',
    };

    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      mismatchDecisionResult(excessiveMismatch),
    );
    mockPopulateWallets.mockImplementationOnce(async ({onProgress}) => {
      await onProgress({
        currentWalletId: 'wallet-1',
        errors: [],
        inProgress: true,
        jobId: 'populate-job-1',
        lastUpdatedAt: 1200,
        startedAt: 1200,
        state: 'running',
        txRequestsMade: 1,
        txsProcessed: 10,
        walletStatusById: {'wallet-1': 'in_progress'},
        walletsCompleted: 0,
        walletsTotal: 1,
      });
      await onProgress({
        currentWalletId: undefined,
        errors: [],
        inProgress: false,
        jobId: 'populate-job-1',
        lastUpdatedAt: 1234,
        startedAt: 1200,
        state: 'completed',
        txRequestsMade: 1,
        txsProcessed: 10,
        walletStatusById: {'wallet-1': 'done'},
        walletsCompleted: 1,
        walletsTotal: 1,
      });
      return successfulPopulateResult();
    });

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    const excessiveMarkerIndex = dispatched.findIndex(
      action => action.type === 'SET_QUARANTINES',
    );
    const doneProgressIndex = dispatched.findIndex(
      action =>
        action.type === 'UPDATE_PROGRESS' &&
        action.payload?.walletStatusByIdUpdates?.['wallet-1'] === 'done',
    );
    expect(excessiveMarkerIndex).toBeGreaterThanOrEqual(0);
    expect(doneProgressIndex).toBeGreaterThanOrEqual(0);
    expect(excessiveMarkerIndex).toBeLessThan(doneProgressIndex);
  });

  it('logs all wallet errors from the terminal populate status', async () => {
    const state = makeState();
    const {dispatch, dispatched} = makeStore(state);
    const errors = [
      {walletId: 'wallet-1', message: 'first failure for wallet-1'},
      {walletId: 'wallet-2', message: 'second failure'},
    ];

    mockGetVisibleWalletsFromKeys.mockReturnValue([
      walletFactory({id: 'wallet-1'}),
      walletFactory({id: 'wallet-2'}),
    ]);
    mockPopulateWallets.mockResolvedValueOnce(
      successfulPopulateResult({
        results: [],
        status: {
          disabledForLargeHistory: false,
          errors,
          txRequestsMade: 3,
          txsProcessed: 31,
          walletStatusById: {
            'wallet-1': 'error',
            'wallet-2': 'error',
          },
          walletsCompleted: 0,
          walletsTotal: 2,
        },
      }),
    );

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    const logPrefix = '[portfolio] Populate completed with wallet errors';
    const warning = mockLogManager.warnWithSentryMessage.mock.calls.find(call =>
      String(call[0] || '').startsWith(logPrefix),
    );
    expect(warning).toBeDefined();

    const payload = JSON.parse(String(warning![0]).slice(logPrefix.length + 1));
    const sentryPayload = JSON.parse(
      String(warning![1]).slice(logPrefix.length + 1),
    );
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
      {index: 0, walletId: 'wallet-1', message: 'first failure for wallet-1'},
      {index: 1, walletId: 'wallet-2', message: 'second failure'},
    ]);
    expect(sentryPayload.errors).toEqual([
      {
        index: 0,
        walletId: '[redacted]',
        message: 'first failure for [redacted]',
      },
      {index: 1, walletId: '[redacted]', message: 'second failure'},
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

  it('redacts overlapping wallet ids from sentry populate wallet error logs without leaking suffixes', async () => {
    const state = makeState();
    const {dispatch} = makeStore(state);
    const errors = [
      {walletId: 'wallet-1', message: 'short wallet wallet-1 failed'},
      {
        walletId: 'wallet-10',
        message: 'long wallet wallet-10 failed after wallet-1',
      },
    ];

    mockGetVisibleWalletsFromKeys.mockReturnValue([
      walletFactory({id: 'wallet-1'}),
      walletFactory({id: 'wallet-10'}),
    ]);
    mockPopulateWallets.mockResolvedValueOnce(
      successfulPopulateResult({
        results: [],
        status: {
          disabledForLargeHistory: false,
          errors,
          txRequestsMade: 3,
          txsProcessed: 31,
          walletStatusById: {
            'wallet-1': 'error',
            'wallet-10': 'error',
          },
          walletsCompleted: 0,
          walletsTotal: 2,
        },
      }),
    );

    await dispatch(populatePortfolioWithRuntime({quoteCurrency: 'USD'}));

    const logPrefix = '[portfolio] Populate completed with wallet errors';
    const warning = mockLogManager.warnWithSentryMessage.mock.calls.find(call =>
      String(call[0] || '').startsWith(logPrefix),
    );
    expect(warning).toBeDefined();

    const localMessage = String(warning![0] || '');
    const sentryMessage = String(warning![1] || '');
    const sentryPayload = JSON.parse(sentryMessage.slice(logPrefix.length + 1));

    expect(localMessage).toContain('wallet-1');
    expect(localMessage).toContain('wallet-10');
    expect(sentryMessage).not.toContain('wallet-1');
    expect(sentryMessage).not.toContain('wallet-10');
    expect(sentryMessage).not.toContain('[redacted]0');
    expect(sentryPayload.errors).toEqual([
      {
        index: 0,
        walletId: '[redacted]',
        message: 'short wallet [redacted] failed',
      },
      {
        index: 1,
        walletId: '[redacted]',
        message: 'long wallet [redacted] failed after [redacted]',
      },
    ]);
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
      .mockResolvedValueOnce(emptyScopedDecisionResult());
    mockPopulateWallets.mockResolvedValueOnce(
      successfulPopulateResult({
        results: [{walletId: 'wallet-from-state'}],
        status: {
          walletStatusById: {'wallet-from-state': 'done'},
          walletsCompleted: 1,
        },
      }),
    );

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

  it('passes manual quarantine retry intent into scoped populate decisions', async () => {
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

    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [populateDecision({walletId: 'wallet-from-state'})],
        walletIdsToPopulate: [],
      }),
    );

    await dispatch(
      maybePopulatePortfolioForWalletsWithRuntime({
        quoteCurrency: 'USD',
        walletIds: ['wallet-from-state'],
        forceRetryQuarantined: true,
      }),
    );

    expect(mockGetPortfolioPopulateDecisionsForWallets).toHaveBeenCalledWith(
      expect.objectContaining({
        forceRetryQuarantined: true,
        wallets: [wallet],
      }),
    );
    expect(mockPopulateWallets).not.toHaveBeenCalled();
  });

  it('passes manual quarantine retry intent into home-scope launch decisions', async () => {
    const wallet = walletFactory({id: 'home-wallet'});
    const state = makeState();
    const {dispatch} = makeStore(state);
    mockGetVisibleWalletsFromKeys.mockReturnValue([wallet]);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [populateDecision({walletId: 'home-wallet'})],
        walletIdsToPopulate: [],
      }),
    );

    await dispatch(
      maybePopulatePortfolioOnAppLaunchWithRuntime({
        quoteCurrency: 'USD',
        forceRetryQuarantined: true,
      }),
    );

    expect(mockGetPortfolioPopulateDecisionsForWallets).toHaveBeenCalledWith(
      expect.objectContaining({
        forceRetryQuarantined: true,
        wallets: [wallet],
      }),
    );
    expect(mockPopulateWallets).not.toHaveBeenCalled();
  });

  it('queues forced scoped populate decisions made during an active populate', async () => {
    const wallet1 = walletFactory({id: 'wallet-1'});
    const wallet2 = walletFactory({id: 'wallet-2'});
    const state = makeState();
    const {dispatch} = makeStore(state);
    const activePopulate = deferred<any>();
    mockGetVisibleWalletsFromKeys.mockReturnValue([wallet1, wallet2]);
    mockPopulateWallets
      .mockImplementationOnce(() => activePopulate.promise)
      .mockResolvedValueOnce(
        successfulPopulateResult({
          results: [{walletId: 'wallet-2'}],
          status: {
            walletStatusById: {'wallet-2': 'done'},
            walletsCompleted: 1,
          },
        }),
      );
    mockGetPortfolioPopulateDecisionsForWallets.mockImplementation(
      async ({wallets}: {wallets: any[]}) =>
        populateDecisionResult({
          decisions: wallets.map(wallet =>
            populateDecision({
              reason: 'missing_snapshot',
              shouldPopulate: true,
              walletId: wallet.id,
            }),
          ),
          walletIdsToPopulate: wallets.map(wallet => wallet.id),
        }),
    );

    const firstPopulatePromise = dispatch(
      populatePortfolioWithRuntime({
        quoteCurrency: 'USD',
        wallets: [wallet1],
      }),
    );

    await Promise.resolve();
    await dispatch(
      maybePopulatePortfolioForWalletsWithRuntime({
        quoteCurrency: 'EUR',
        wallets: [wallet2],
        forceRetryQuarantined: true,
      }),
    );

    expect(mockPopulateWallets).toHaveBeenCalledTimes(1);

    activePopulate.resolve(successfulPopulateResult());
    await firstPopulatePromise;

    expect(mockPopulateWallets).toHaveBeenCalledTimes(2);
    expect(mockPopulateWallets.mock.calls[1][0].wallets).toEqual([
      expect.objectContaining({walletId: 'wallet-2'}),
    ]);
    expect(
      mockGetPortfolioPopulateDecisionsForWallets.mock.calls.some(
        ([callArgs]) =>
          callArgs.forceRetryQuarantined === true &&
          callArgs.wallets?.some((wallet: any) => wallet.id === 'wallet-2'),
      ),
    ).toBe(true);
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
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [
          populateDecision({
            index: {walletId: 'wallet-1'},
            latestSnapshot: walletSnapshot('100000000'),
            mismatch: persistedMismatch,
            reason: 'unchanged_balance_mismatch',
          }),
        ],
        mismatchByWalletId: {'wallet-1': persistedMismatch},
      }),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

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
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({decisions: []}),
    );

    const launchPromise = dispatchAppLaunchPopulateWithUsd(dispatch);
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
    mockPopulateWallets.mockResolvedValueOnce(
      successfulPopulateResult({
        results: [],
        status: {walletStatusById: {}, walletsCompleted: 0},
      }),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expect(mockLogManager.warn).toHaveBeenCalledWith(
      '[portfolio] Launch wallet status refresh did not complete before populate decision',
      expect.any(String),
    );
    expect(mockGetPortfolioPopulateDecisionsForWallets).not.toHaveBeenCalled();
    expectStartPopulateWithUsd();
    expect(mockPortfolioService).toHaveBeenCalledTimes(1);
  });

  it('app launch falls back to full populate when startup wallet init is not confirmed completed', async () => {
    const state = makeState();
    const {dispatch} = makeStore(state);
    mockWaitForStartupWalletStoreInitForPortfolio.mockResolvedValueOnce({
      status: 'skipped',
      walletInitSuccess: false,
    });
    mockPopulateWallets.mockResolvedValueOnce(
      successfulPopulateResult({
        results: [],
        status: {walletStatusById: {}, walletsCompleted: 0},
      }),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expect(mockGetPortfolioPopulateDecisionsForWallets).not.toHaveBeenCalled();
    expectStartPopulateWithUsd();
    expect(mockPortfolioService).toHaveBeenCalledTimes(1);
  });

  it('app launch marks the initial baseline complete when all wallets are up to date', async () => {
    const state = makeInitialBaselineState();
    const {dispatch, dispatched} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [
          populateDecision({
            index: {walletId: 'wallet-1'},
            latestSnapshot: walletSnapshot('100000000'),
          }),
        ],
      }),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expectInitialBaselineCompleteAction(dispatched);
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('app launch marks a scoped initial wallet-work pass as completing the baseline', async () => {
    const state = makeInitialBaselineState();
    const {dispatch} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [
          populateDecision({reason: 'missing_index', shouldPopulate: true}),
        ],
        walletIdsToPopulate: ['wallet-1'],
      }),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expectStartPopulateWithUsd();
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
    const state = makeInitialBaselineState({
      snapshotBalanceMismatchesByWalletId: {'wallet-1': mismatch},
    });
    const {dispatch, dispatched} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [
          populateDecision({
            index: {walletId: 'wallet-1'},
            latestSnapshot: walletSnapshot('100000000'),
            mismatch,
            reason: 'unchanged_balance_mismatch',
          }),
        ],
        mismatchByWalletId: {'wallet-1': mismatch},
      }),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expectInitialBaselineCompleteAction(dispatched);
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('app launch marks the initial baseline complete for invalid-history no-op decisions', async () => {
    const state = makeInitialBaselineState();
    const {dispatch, dispatched} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [populateDecision({reason: 'invalid_history'})],
      }),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expectInitialBaselineCompleteAction(dispatched);
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('app launch marks the initial baseline complete for zero-balance no-history decisions', async () => {
    const state = makeInitialBaselineState();
    const {dispatch, dispatched} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [
          populateDecision({
            index: {walletId: 'wallet-1'},
            reason: 'zero_balance_no_history',
          }),
        ],
      }),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expectInitialBaselineCompleteAction(dispatched);
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('app launch marks the initial baseline complete and reports invalid-decimals no-op decisions', async () => {
    const state = makeInitialBaselineState();
    const {dispatch, dispatched} = makeStore(state);
    const invalidDecimals = {
      walletId: 'wallet-1',
      reason: 'invalid_decimals',
      message: 'Wallet wallet-1 has unresolved token decimals.',
    };
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [
          populateDecision({invalidDecimals, reason: 'invalid_decimals'}),
        ],
        invalidDecimalsByWalletId: {'wallet-1': invalidDecimals},
      }),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expect(dispatched).toEqual(
      expect.arrayContaining([
        {
          payload: {'wallet-1': invalidDecimals},
          type: 'SET_INVALID_DECIMALS',
        },
        {
          payload: expect.objectContaining({quoteCurrency: 'USD'}),
          type: 'MARK_INITIAL_BASELINE_COMPLETE',
        },
      ]),
    );
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('app launch marks the initial baseline complete and reports excessive-mismatch no-op decisions', async () => {
    const state = makeInitialBaselineState();
    const {dispatch, dispatched} = makeStore(state);
    const excessiveMismatchDecision = excessiveMismatchDecisionResult({
      shouldPopulate: false,
    });
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      excessiveMismatchDecision,
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expect(dispatched).toEqual(
      expect.arrayContaining([
        {
          payload: excessiveMismatchDecision.quarantinesByWalletId,
          type: 'SET_QUARANTINES',
        },
        {
          payload: expect.objectContaining({quoteCurrency: 'USD'}),
          type: 'MARK_INITIAL_BASELINE_COMPLETE',
        },
      ]),
    );
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('app launch clears existing excessive-mismatch snapshots before repair populate', async () => {
    const state = makeState();
    const {dispatch} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets
      .mockResolvedValueOnce(excessiveMismatchDecisionResult())
      .mockResolvedValueOnce({decisions: []});

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expect(mockRuntimeClient.clearWallet).toHaveBeenCalledWith({
      walletId: 'wallet-1',
    });
    expectStartPopulateWithUsd();
    expect(
      mockRuntimeClient.clearWallet.mock.invocationCallOrder[0],
    ).toBeLessThan(mockPopulateWallets.mock.invocationCallOrder[0]);
  });

  it('app launch skips excessive-mismatch repair populate when snapshot clearing fails', async () => {
    const state = makeState();
    const {dispatch} = makeStore(state);
    mockRuntimeClient.clearWallet.mockRejectedValueOnce(
      new Error('clear failed'),
    );
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      excessiveMismatchDecisionResult(),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expect(mockRuntimeClient.clearWallet).toHaveBeenCalledWith({
      walletId: 'wallet-1',
    });
    const warning = mockLogManager.warnWithSentryMessage.mock.calls.find(call =>
      String(call[0] || '').includes(
        'Failed clearing runtime wallet snapshots before excessive balance mismatch repair for wallet-1',
      ),
    );
    expect(warning).toBeDefined();
    expect(String(warning![0] || '')).toContain('wallet-1');
    expect(String(warning![1] || '')).toContain('[redacted]');
    expect(String(warning![1] || '')).not.toContain('wallet-1');
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
    expect(mockPopulateWallets).not.toHaveBeenCalled();
  });

  it('app launch does not mark the initial baseline complete for non-terminal no-op decisions', async () => {
    const state = makeInitialBaselineState();
    const {dispatch, dispatched} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [populateDecision({reason: 'missing_snapshot'})],
        invalidDecimalsByWalletId: {},
      }),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expect(dispatched).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({type: 'MARK_INITIAL_BASELINE_COMPLETE'}),
      ]),
    );
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('app launch marks the initial baseline complete when there are zero eligible wallets', async () => {
    const state = makeInitialBaselineState();
    const {dispatch, dispatched} = makeStore(state);
    mockGetVisibleWalletsFromKeys.mockReturnValueOnce([]);

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expect(mockGetPortfolioPopulateDecisionsForWallets).not.toHaveBeenCalled();
    expectPopulateResumeSettledAction(dispatched);
    expectInitialBaselineCompleteAction(dispatched);
  });

  it('app launch marks interrupted populate resume settled when an existing baseline has no work', async () => {
    const state = makeState({
      PORTFOLIO: {
        lastFullPopulateCompletedAt: 1000,
        populateStatus: {
          inProgress: false,
          startedAt: 900,
          finishedAt: undefined,
          stopReason: undefined,
          currentWalletId: undefined,
          walletStatusById: {},
        },
      },
    });
    const {dispatch, dispatched} = makeStore(state);
    mockGetPortfolioPopulateDecisionsForWallets.mockResolvedValueOnce(
      populateDecisionResult({
        decisions: [
          populateDecision({
            index: {walletId: 'wallet-1'},
            latestSnapshot: walletSnapshot('100000000'),
          }),
        ],
        walletIdsToPopulate: [],
      }),
    );

    await dispatchAppLaunchPopulateWithUsd(dispatch);

    expectPopulateResumeSettledAction(dispatched);
    expect(dispatched).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({type: 'MARK_INITIAL_BASELINE_COMPLETE'}),
      ]),
    );
    expect(mockStartPopulatePortfolio).not.toHaveBeenCalled();
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

    expectOnlyStartAndCancelPopulateActions(dispatched);
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

    expectOnlyStartAndCancelPopulateActions(dispatched);
  });
});

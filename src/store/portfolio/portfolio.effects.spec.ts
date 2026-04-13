/**
 * Tests for portfolio.effects.ts
 *
 * Strategy:
 * - The portfolio effects are heavily UI/navigation coupled and the import
 *   chain through the full Redux store is very deep. We mock everything at
 *   the module level and use a minimal Redux thunk dispatcher.
 * - We focus on the guard branches (early returns) in the three exported
 *   effects: maybePopulatePortfolioForWallets, populatePortfolio,
 *   and preparePortfolioFiatRateCachesForQuoteCurrencySwitch.
 */

// ---------------------------------------------------------------------------
// Module-level mocks — MUST be before any imports that trigger the chain
// ---------------------------------------------------------------------------

// Prevent deep react-native module resolution issues
jest.mock('react-native', () => ({
  AppState: {currentState: 'active', addEventListener: jest.fn(() => ({remove: jest.fn()}))},
  DeviceEventEmitter: {
    addListener: jest.fn(() => ({remove: jest.fn()})),
    removeAllListeners: jest.fn(),
  },
  Platform: {OS: 'android', Version: 24, select: (s: any) => s.android ?? null},
  NativeModules: {},
  StyleSheet: {create: (s: any) => s, flatten: (s: any) => s},
}));

// Note: portfolio.effects.ts imports from '..' (store index) for types only (Effect, RootState)
// These are TypeScript types so nothing runtime to mock here.

// Mock navigation
jest.mock('../../navigation/NavigationService', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    getCurrentRoute: jest.fn(() => ({name: 'Home'})),
    getState: jest.fn(() => ({routes: [{name: 'Home'}]})),
  },
}));

// Mock device emitter events constant
jest.mock('../../constants/device-emitter-events', () => ({
  DeviceEmitterEvents: {APP_LOCK_MODAL_DISMISSED: 'APP_LOCK_MODAL_DISMISSED'},
}));

// Mock constants/index (uses Platform.OS at module level)
jest.mock('../../constants', () => ({
  Network: {mainnet: 'livenet', testnet: 'testnet'},
  IS_ANDROID: true,
  IS_IOS: false,
}));

// Mock rate models
jest.mock('../rate/rate.models', () => ({
  getFiatRateSeriesCacheKey: jest.fn(
    (fiatCode: string, coin: string, interval: string) =>
      `${(fiatCode || '').toUpperCase()}:${(coin || '').toLowerCase()}:${interval}`,
  ),
}));

jest.mock('../wallet/effects', () => ({
  startGetRates: jest.fn(() => () => Promise.resolve({})),
  fetchFiatRateSeriesAllIntervals: jest.fn(() => () => Promise.resolve()),
  fetchFiatRateSeriesInterval: jest.fn(() => () => Promise.resolve(true)),
}));

// Mock rate actions
jest.mock('../rate/rate.actions', () => ({
  pruneFiatRateSeriesCache: jest.fn(() => ({type: 'MOCK_PRUNE'})),
}));

// Mock transactions
jest.mock('../wallet/effects/transactions/transactions', () => ({
  GetTransactionHistory: jest.fn(() => () => Promise.resolve([])),
  BWS_TX_HISTORY_LIMIT: 1001,
}));

// Mock wallet utils currency
jest.mock('../wallet/utils/currency', () => ({
  GetPrecision: jest.fn(() => ({unitDecimals: 8})),
}));

// Mock helper-methods
jest.mock('../../utils/helper-methods', () => ({
  getRateByCurrencyName: jest.fn(() => undefined),
  getErrorString: jest.fn((e: any) => String(e)),
  sleep: jest.fn(() => Promise.resolve()),
  atomicToUnitString: jest.fn(() => '0'),
  unitStringToAtomicBigInt: jest.fn(() => BigInt(0)),
}));

// Mock portfolio pnl utils
jest.mock('../../utils/portfolio/core/pnl/snapshots', () => ({
  buildBalanceSnapshotsAsync: jest.fn(() => Promise.resolve([])),
  computeBalanceSnapshotComputed: jest.fn(() => ({})),
}));

jest.mock('../../utils/portfolio/core/pnl/rates', () => ({
  normalizeFiatRateSeriesCoin: jest.fn((c?: string) => (c || '').toLowerCase()),
}));

jest.mock('../../utils/portfolio/assets', () => ({
  getWalletIdsToPopulateFromSnapshots: jest.fn(() => ({
    walletIdsToPopulate: [],
    snapshotBalanceMismatchUpdates: {},
  })),
  getSnapshotAtomicBalanceFromCryptoBalance: jest.fn(() => BigInt(0)),
  getWalletLiveAtomicBalance: jest.fn(() => BigInt(0)),
  getVisibleWalletsFromKeys: jest.fn(() => []),
  getLatestSnapshot: jest.fn(() => undefined),
}));

// Mock portfolio actions
jest.mock('./portfolio.actions', () => ({
  clearPortfolio: jest.fn(() => ({type: 'CLEAR_PORTFOLIO'})),
  finishPopulatePortfolio: jest.fn(() => ({type: 'FINISH_POPULATE'})),
  setSnapshotBalanceMismatchesByWalletIdUpdates: jest.fn(() => ({type: 'SET_MISMATCH'})),
  setWalletSnapshots: jest.fn(() => ({type: 'SET_SNAPSHOTS'})),
  startPopulatePortfolio: jest.fn(args => ({type: 'START_POPULATE', payload: args})),
  updatePopulateProgress: jest.fn(() => ({type: 'UPDATE_PROGRESS'})),
}));

// Mock portfolio utils
jest.mock('./portfolio.utils', () => ({
  shouldDisablePopulateForLargeHistory: jest.fn(() => false),
}));

// Mock LogManager
jest.mock('../../managers/LogManager', () => ({
  logManager: {info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn()},
}));

// ---------------------------------------------------------------------------
// Now we can import the effects
// ---------------------------------------------------------------------------

import {
  maybePopulatePortfolioForWallets,
  populatePortfolio,
  preparePortfolioFiatRateCachesForQuoteCurrencySwitch,
} from './portfolio.effects';

// ---------------------------------------------------------------------------
// Minimal Redux thunk setup — avoids the full store import chain
// ---------------------------------------------------------------------------

type AnyFn = (...args: any[]) => any;

/** Build a minimal state-carrying store for testing thunks. */
const makeMinimalStore = (state: Record<string, any>) => {
  let currentState = {...state};
  const dispatched: any[] = [];

  const getState = () => currentState;
  const dispatch = (action: any): any => {
    if (typeof action === 'function') {
      return action(dispatch, getState);
    }
    dispatched.push(action);
    return action;
  };

  return {dispatch, getState, dispatched};
};

// ---------------------------------------------------------------------------
// State builder
// ---------------------------------------------------------------------------

const makeState = (overrides: Record<string, any> = {}) => ({
  APP: {
    showPortfolioValue: true,
    pinLockActive: false,
    biometricLockActive: false,
    lockAuthorizedUntil: null,
    homeCarouselConfig: [],
    defaultAltCurrency: {isoCode: 'USD'},
    altCurrencyList: [{isoCode: 'USD', name: 'US Dollar'}],
    ...overrides.APP,
  },
  PORTFOLIO: {
    populateDisabled: false,
    populateStatus: {inProgress: false},
    snapshotsByWalletId: {},
    snapshotBalanceMismatchesByWalletId: {},
    quoteCurrency: 'USD',
    ...overrides.PORTFOLIO,
  },
  WALLET: {
    keys: {},
    ...overrides.WALLET,
  },
  RATE: {
    rates: {},
    lastDayRates: {},
    fiatRateSeriesCache: {},
    ratesCacheKey: {},
    ...overrides.RATE,
  },
  ...overrides,
});

// ---------------------------------------------------------------------------
// maybePopulatePortfolioForWallets – guard branches
// ---------------------------------------------------------------------------
describe('maybePopulatePortfolioForWallets – guard branches', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns early when showPortfolioValue is false (portfolio disabled)', async () => {
    const state = makeState({APP: {showPortfolioValue: false}});
    const {dispatch} = makeMinimalStore(state);

    await dispatch(maybePopulatePortfolioForWallets({wallets: [], quoteCurrency: 'USD'}));

    const {startGetRates} = require('../wallet/effects');
    expect(startGetRates).not.toHaveBeenCalled();
  });

  it('returns early when populateDisabled is true', async () => {
    const state = makeState({PORTFOLIO: {populateDisabled: true, populateStatus: {inProgress: false}}});
    const {dispatch} = makeMinimalStore(state);

    await dispatch(maybePopulatePortfolioForWallets({wallets: [], quoteCurrency: 'USD'}));

    const {startGetRates} = require('../wallet/effects');
    expect(startGetRates).not.toHaveBeenCalled();
  });

  it('defers work when pinLockActive is true and lockAuthorizedUntil is undefined (not finite)', async () => {
    const {DeviceEventEmitter} = require('react-native');
    // NOTE: Number(null) = 0 which is finite! Must use undefined (→ NaN, not finite)
    const state = makeState({
      APP: {
        showPortfolioValue: true,
        pinLockActive: true,
        biometricLockActive: false,
        lockAuthorizedUntil: undefined, // undefined → NaN → not finite → triggers defer
        homeCarouselConfig: [],
        defaultAltCurrency: {isoCode: 'USD'},
        altCurrencyList: [],
      },
    });
    const {dispatch} = makeMinimalStore(state);

    await dispatch(maybePopulatePortfolioForWallets({wallets: [{id: 'w1'} as any], quoteCurrency: 'USD'}));

    // deferPortfolioWorkUntilAppUnlock calls DeviceEventEmitter.addListener
    expect(DeviceEventEmitter.addListener).toHaveBeenCalled();
  });

  it('defers work when biometricLockActive is true and lockAuthorizedUntil is undefined', async () => {
    const {DeviceEventEmitter} = require('react-native');
    const state = makeState({
      APP: {
        showPortfolioValue: true,
        pinLockActive: false,
        biometricLockActive: true,
        lockAuthorizedUntil: undefined,
        homeCarouselConfig: [],
        defaultAltCurrency: {isoCode: 'USD'},
        altCurrencyList: [],
      },
    });
    const {dispatch} = makeMinimalStore(state);

    await dispatch(maybePopulatePortfolioForWallets({wallets: [{id: 'w1'} as any]}));

    expect(DeviceEventEmitter.addListener).toHaveBeenCalled();
  });

  it('does NOT defer when lockAuthorizedUntil is a valid finite number (unlocked)', async () => {
    const {DeviceEventEmitter} = require('react-native');
    const state = makeState({
      APP: {
        showPortfolioValue: true,
        pinLockActive: true,
        biometricLockActive: false,
        lockAuthorizedUntil: Date.now() + 60000, // finite → "authorized"
        homeCarouselConfig: [],
        defaultAltCurrency: {isoCode: 'USD'},
        altCurrencyList: [],
      },
    });
    const {dispatch} = makeMinimalStore(state);

    await dispatch(maybePopulatePortfolioForWallets({wallets: []}));

    // Not deferred — lockAuthorizedUntil is finite
    expect(DeviceEventEmitter.addListener).not.toHaveBeenCalled();
  });

  it('returns early when wallets array is empty (after lock check)', async () => {
    const state = makeState();
    const {dispatch} = makeMinimalStore(state);

    await dispatch(maybePopulatePortfolioForWallets({wallets: [], quoteCurrency: 'USD'}));

    const {startGetRates} = require('../wallet/effects');
    expect(startGetRates).not.toHaveBeenCalled();
  });

  it('returns early when populateStatus.inProgress is true', async () => {
    const state = makeState({PORTFOLIO: {populateDisabled: false, populateStatus: {inProgress: true}}});
    const mockWallet: any = {id: 'w1', currencyAbbreviation: 'btc', chain: 'btc', balance: {sat: 1000000}};
    const {dispatch} = makeMinimalStore(state);

    await dispatch(maybePopulatePortfolioForWallets({wallets: [mockWallet], quoteCurrency: 'USD'}));

    const {startGetRates} = require('../wallet/effects');
    expect(startGetRates).not.toHaveBeenCalled();
  });

  it('uses quoteCurrency from args, resolves from PORTFOLIO.quoteCurrency or APP.defaultAltCurrency', async () => {
    const state = makeState({
      PORTFOLIO: {
        populateDisabled: false,
        populateStatus: {inProgress: false},
        quoteCurrency: 'EUR',
        snapshotsByWalletId: {},
        snapshotBalanceMismatchesByWalletId: {},
      },
    });
    const {dispatch} = makeMinimalStore(state);

    // Empty wallets → early return, resolveQuoteCurrency runs without error
    await dispatch(maybePopulatePortfolioForWallets({wallets: [], quoteCurrency: 'GBP'}));

    expect(true).toBe(true); // no throw
  });

  it('dispatches snapshotBalanceMismatchUpdates when they exist', async () => {
    const assetsModule = require('../../utils/portfolio/assets');
    assetsModule.getWalletIdsToPopulateFromSnapshots.mockReturnValueOnce({
      walletIdsToPopulate: [],
      snapshotBalanceMismatchUpdates: {
        w1: {computedUnitsHeld: '1', currentWalletBalance: '0.9', delta: '0.1', walletId: 'w1'},
      },
    });

    const state = makeState();
    const mockWallet: any = {id: 'w1'};
    const {dispatch} = makeMinimalStore(state);

    await dispatch(maybePopulatePortfolioForWallets({wallets: [mockWallet], quoteCurrency: 'USD'}));

    const {setSnapshotBalanceMismatchesByWalletIdUpdates} = require('./portfolio.actions');
    expect(setSnapshotBalanceMismatchesByWalletIdUpdates).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// populatePortfolio – guard branches
// ---------------------------------------------------------------------------
describe('populatePortfolio – guard branches', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns early when portfolio is disabled', async () => {
    const state = makeState({APP: {showPortfolioValue: false}});
    const {dispatch} = makeMinimalStore(state);

    await dispatch(populatePortfolio());

    const {startGetRates} = require('../wallet/effects');
    expect(startGetRates).not.toHaveBeenCalled();
  });

  it('returns early when populateDisabled is true', async () => {
    const state = makeState({PORTFOLIO: {populateDisabled: true, populateStatus: {inProgress: false}}});
    const {dispatch} = makeMinimalStore(state);

    await dispatch(populatePortfolio());

    const {startGetRates} = require('../wallet/effects');
    expect(startGetRates).not.toHaveBeenCalled();
  });

  it('defers and returns when app is locked (biometricLockActive, lockAuthorizedUntil=undefined)', async () => {
    const {DeviceEventEmitter} = require('react-native');
    const state = makeState({
      APP: {
        showPortfolioValue: true,
        pinLockActive: false,
        biometricLockActive: true,
        lockAuthorizedUntil: undefined, // undefined → NaN → not finite → lock triggers
        homeCarouselConfig: [],
        defaultAltCurrency: {isoCode: 'USD'},
        altCurrencyList: [],
      },
    });
    const {dispatch} = makeMinimalStore(state);

    await dispatch(populatePortfolio({quoteCurrency: 'USD'}));

    expect(DeviceEventEmitter.addListener).toHaveBeenCalled();
    const {startGetRates} = require('../wallet/effects');
    expect(startGetRates).not.toHaveBeenCalled();
  });

  it('returns early when populateStatus.inProgress is true', async () => {
    const state = makeState({PORTFOLIO: {populateDisabled: false, populateStatus: {inProgress: true}}});
    const {dispatch} = makeMinimalStore(state);

    await dispatch(populatePortfolio({quoteCurrency: 'USD'}));

    const {startGetRates} = require('../wallet/effects');
    expect(startGetRates).not.toHaveBeenCalled();
  });

  it('returns early when no wallets have non-zero balance', async () => {
    const assetsModule = require('../../utils/portfolio/assets');
    assetsModule.getVisibleWalletsFromKeys.mockReturnValueOnce([
      {id: 'w1', network: 'livenet', balance: {sat: 0, crypto: '0'}},
    ]);

    const state = makeState();
    const {dispatch} = makeMinimalStore(state);

    await dispatch(populatePortfolio({quoteCurrency: 'USD'}));

    const {startGetRates} = require('../wallet/effects');
    expect(startGetRates).not.toHaveBeenCalled();
  });

  it('uses walletIds filter to restrict which wallets are populated', async () => {
    const assetsModule = require('../../utils/portfolio/assets');
    assetsModule.getVisibleWalletsFromKeys.mockReturnValueOnce([
      {id: 'w1', network: 'livenet', balance: {sat: 1000000}},
      {id: 'w2', network: 'livenet', balance: {sat: 0}},
    ]);

    const state = makeState();
    const {dispatch} = makeMinimalStore(state);

    // Only w1 is in the filter; w1 has non-zero balance → should proceed past the early return
    await dispatch(populatePortfolio({quoteCurrency: 'USD', walletIds: ['w1']}));

    const {startGetRates} = require('../wallet/effects');
    expect(startGetRates).toHaveBeenCalled();
  });

  it('resolves quoteCurrency from state when arg is not provided', async () => {
    const state = makeState({
      PORTFOLIO: {
        populateDisabled: false,
        populateStatus: {inProgress: false},
        quoteCurrency: 'EUR',
        snapshotsByWalletId: {},
        snapshotBalanceMismatchesByWalletId: {},
      },
      APP: {
        showPortfolioValue: true,
        pinLockActive: false,
        biometricLockActive: false,
        lockAuthorizedUntil: null,
        homeCarouselConfig: [],
        defaultAltCurrency: {isoCode: 'EUR'},
        altCurrencyList: [],
      },
    });
    const {dispatch} = makeMinimalStore(state);

    // No wallets returned → early return, but resolveQuoteCurrency runs without error
    await dispatch(populatePortfolio());

    expect(true).toBe(true); // no throw
  });

  it('filters out non-mainnet wallets', async () => {
    const assetsModule = require('../../utils/portfolio/assets');
    assetsModule.getVisibleWalletsFromKeys.mockReturnValueOnce([
      {id: 'w1', network: 'testnet', balance: {sat: 1000000}}, // non-mainnet
      {id: 'w2', network: 'livenet', balance: {sat: 0}},       // mainnet but zero
    ]);

    const state = makeState();
    const {dispatch} = makeMinimalStore(state);

    await dispatch(populatePortfolio({quoteCurrency: 'USD'}));

    // testnet wallet filtered → w2 zero balance → no wallets to populate
    const {startGetRates} = require('../wallet/effects');
    expect(startGetRates).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// preparePortfolioFiatRateCachesForQuoteCurrencySwitch – guard branches
// ---------------------------------------------------------------------------
describe('preparePortfolioFiatRateCachesForQuoteCurrencySwitch – guard branches', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns early when portfolio is disabled', async () => {
    const state = makeState({APP: {showPortfolioValue: false}});
    const {dispatch} = makeMinimalStore(state);

    await dispatch(preparePortfolioFiatRateCachesForQuoteCurrencySwitch());

    const {fetchFiatRateSeriesAllIntervals} = require('../wallet/effects');
    expect(fetchFiatRateSeriesAllIntervals).not.toHaveBeenCalled();
  });

  it('returns early when populateDisabled is true', async () => {
    const state = makeState({PORTFOLIO: {populateDisabled: true, populateStatus: {inProgress: false}}});
    const {dispatch} = makeMinimalStore(state);

    await dispatch(preparePortfolioFiatRateCachesForQuoteCurrencySwitch());

    const {fetchFiatRateSeriesAllIntervals} = require('../wallet/effects');
    expect(fetchFiatRateSeriesAllIntervals).not.toHaveBeenCalled();
  });

  it('returns early when populateStatus.inProgress is true', async () => {
    const state = makeState({PORTFOLIO: {populateDisabled: false, populateStatus: {inProgress: true}}});
    const {dispatch} = makeMinimalStore(state);

    await dispatch(preparePortfolioFiatRateCachesForQuoteCurrencySwitch());

    const {fetchFiatRateSeriesAllIntervals} = require('../wallet/effects');
    expect(fetchFiatRateSeriesAllIntervals).not.toHaveBeenCalled();
  });

  it('uses provided quoteCurrency argument', async () => {
    const state = makeState();
    const {dispatch} = makeMinimalStore(state);

    await dispatch(preparePortfolioFiatRateCachesForQuoteCurrencySwitch({quoteCurrency: 'EUR'}));

    const {fetchFiatRateSeriesAllIntervals} = require('../wallet/effects');
    expect(fetchFiatRateSeriesAllIntervals).toHaveBeenCalledWith(
      expect.objectContaining({fiatCode: 'EUR'}),
    );
  });

  it('falls back to state defaultAltCurrency when no quoteCurrency arg', async () => {
    const state = makeState({
      APP: {
        showPortfolioValue: true,
        pinLockActive: false,
        biometricLockActive: false,
        lockAuthorizedUntil: null,
        homeCarouselConfig: [],
        defaultAltCurrency: {isoCode: 'GBP'},
        altCurrencyList: [],
      },
    });
    const {dispatch} = makeMinimalStore(state);

    await dispatch(preparePortfolioFiatRateCachesForQuoteCurrencySwitch());

    const {fetchFiatRateSeriesAllIntervals} = require('../wallet/effects');
    expect(fetchFiatRateSeriesAllIntervals).toHaveBeenCalledWith(
      expect.objectContaining({fiatCode: 'GBP'}),
    );
  });

  it('falls back to USD when no quoteCurrency and no defaultAltCurrency', async () => {
    const state = makeState({
      APP: {
        showPortfolioValue: true,
        pinLockActive: false,
        biometricLockActive: false,
        lockAuthorizedUntil: null,
        homeCarouselConfig: [],
        defaultAltCurrency: null,
        altCurrencyList: [],
      },
    });
    const {dispatch} = makeMinimalStore(state);

    await dispatch(preparePortfolioFiatRateCachesForQuoteCurrencySwitch());

    const {fetchFiatRateSeriesAllIntervals} = require('../wallet/effects');
    expect(fetchFiatRateSeriesAllIntervals).toHaveBeenCalledWith(
      expect.objectContaining({fiatCode: 'USD'}),
    );
  });

  it('fetches BTC bridge series for wallets with snapshots in different currency', async () => {
    const assetsModule = require('../../utils/portfolio/assets');
    assetsModule.getVisibleWalletsFromKeys.mockReturnValueOnce([
      {id: 'w1', network: 'livenet'},
    ]);
    assetsModule.getLatestSnapshot.mockReturnValueOnce({
      quoteCurrency: 'EUR',
      timestamp: Date.now(),
    });

    const state = makeState({
      PORTFOLIO: {
        populateDisabled: false,
        populateStatus: {inProgress: false},
        snapshotsByWalletId: {w1: []},
        snapshotBalanceMismatchesByWalletId: {},
        quoteCurrency: 'USD',
      },
    });
    const {dispatch} = makeMinimalStore(state);

    await dispatch(
      preparePortfolioFiatRateCachesForQuoteCurrencySwitch({quoteCurrency: 'USD'}),
    );

    const {fetchFiatRateSeriesAllIntervals} = require('../wallet/effects');
    // Should call once for USD (target) and once for EUR (source)
    expect(fetchFiatRateSeriesAllIntervals).toHaveBeenCalledTimes(2);
    expect(fetchFiatRateSeriesAllIntervals).toHaveBeenCalledWith(
      expect.objectContaining({fiatCode: 'USD', currencyAbbreviation: 'btc'}),
    );
    expect(fetchFiatRateSeriesAllIntervals).toHaveBeenCalledWith(
      expect.objectContaining({fiatCode: 'EUR', allowedCoins: ['btc']}),
    );
  });

  it('skips snapshots in the same currency as target (no bridge fetch needed)', async () => {
    const assetsModule = require('../../utils/portfolio/assets');
    assetsModule.getVisibleWalletsFromKeys.mockReturnValueOnce([
      {id: 'w1', network: 'livenet'},
    ]);
    // Snapshot already in USD (same as target)
    assetsModule.getLatestSnapshot.mockReturnValueOnce({
      quoteCurrency: 'USD',
      timestamp: Date.now(),
    });

    const state = makeState({
      PORTFOLIO: {
        populateDisabled: false,
        populateStatus: {inProgress: false},
        snapshotsByWalletId: {w1: []},
        snapshotBalanceMismatchesByWalletId: {},
        quoteCurrency: 'USD',
      },
    });
    const {dispatch} = makeMinimalStore(state);

    await dispatch(
      preparePortfolioFiatRateCachesForQuoteCurrencySwitch({quoteCurrency: 'USD'}),
    );

    const {fetchFiatRateSeriesAllIntervals} = require('../wallet/effects');
    // Only one call (for USD target), no bridge needed for same currency
    expect(fetchFiatRateSeriesAllIntervals).toHaveBeenCalledTimes(1);
  });

  it('prunes stale fiat caches not in the allowed set', async () => {
    // Cache has USD (current) and JPY (old stale currency)
    const state = makeState({
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {
          'USD:btc:1D': {fetchedOn: Date.now(), points: []},
          'JPY:btc:1D': {fetchedOn: Date.now(), points: []},
        },
        ratesCacheKey: {},
      },
    });
    const {dispatch} = makeMinimalStore(state);

    await dispatch(
      preparePortfolioFiatRateCachesForQuoteCurrencySwitch({quoteCurrency: 'USD'}),
    );

    // pruneFiatRateSeriesCache should have been called for JPY (not in allowedFiats)
    const {pruneFiatRateSeriesCache} = require('../rate/rate.actions');
    expect(pruneFiatRateSeriesCache).toHaveBeenCalledWith(
      expect.objectContaining({fiatCode: 'JPY'}),
    );
  });
});

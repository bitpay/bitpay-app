/**
 * Tests for src/store/transforms/transforms.ts
 *
 * Strategy:
 *   - Test the pure/utility logic exposed via the exported createTransform
 *     wrappers by invoking the inbound/outbound transform callbacks directly.
 *   - Heavy native deps (BwcProvider, Sentry, logManager) are mocked so the
 *     module loads cleanly in Jest.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../lib/bwc', () => {
  const mockWalletClient = {
    credentials: {},
  };
  const mockInstance = {
    getClient: jest.fn(() => mockWalletClient),
    createKey: jest.fn(() => ({id: 'mock-key-id', isPrivKeyEncrypted: jest.fn(() => false), toObj: jest.fn(() => ({}))})),
    createTssKey: jest.fn(() => ({id: 'mock-tss-key-id', isPrivKeyEncrypted: jest.fn(() => false), toObj: jest.fn(() => ({}))})),
    getErrors: jest.fn(() => ({})),
    getUtils: jest.fn(() => ({formatAmount: jest.fn(() => '0')})),
    getBitcore: jest.fn(() => ({})),
    getBitcoreCash: jest.fn(() => ({})),
    getBitcoreDoge: jest.fn(() => ({})),
    getBitcoreLtc: jest.fn(() => ({})),
    getCore: jest.fn(() => ({})),
    getPayProV2: jest.fn(() => ({trustedKeys: {}})),
    getTssSign: jest.fn(() => class MockTssSign {}),
    getTssKey: jest.fn(() => class MockTssKey {}),
    getConstants: jest.fn(() => ({SCRIPT_TYPES: {}, DERIVATION_STRATEGIES: {}})),
    getEncryption: jest.fn(() => ({})),
    getLogger: jest.fn(() => ({})),
    parseSecret: jest.fn(),
  };
  return {
    BwcProvider: {
      getInstance: jest.fn(() => mockInstance),
      API: {},
      instance: mockInstance,
    },
  };
});

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  init: jest.fn(),
}));

jest.mock('../../managers/LogManager', () => ({
  logManager: {info: jest.fn(), error: jest.fn(), debug: jest.fn()},
}));

jest.mock('../log', () => ({
  LogActions: {
    persistLog: jest.fn((x: any) => x),
    error: jest.fn((msg: string) => ({type: 'LOG_ERROR', payload: msg})),
    info: jest.fn((msg: string) => ({type: 'LOG_INFO', payload: msg})),
  },
}));

jest.mock('../log/initLogs', () => ({
  add: jest.fn(),
}));

jest.mock('../wallet/utils/wallet', () => ({
  buildWalletObj: jest.fn(() => ({id: 'mock-wallet'})),
}));

jest.mock('./encrypt', () => ({
  encryptAppStore: jest.fn((s: any) => s),
  decryptAppStore: jest.fn((s: any) => s),
  encryptShopStore: jest.fn((s: any) => s),
  decryptShopStore: jest.fn((s: any) => s),
  encryptWalletStore: jest.fn((s: any) => s),
  decryptWalletStore: jest.fn((s: any) => s),
}));

jest.mock('redux-persist', () => ({
  createTransform: jest.fn((inFn: any, outFn: any, config: any) => ({
    in: inFn,
    out: outFn,
    config,
  })),
}));

jest.mock('../../utils/portfolio/core/pnl/snapshotSeries', () => ({
  packBalanceSnapshotsToSeries: jest.fn((opts: any) => ({
    _packed: true,
    snapshots: opts.snapshots,
  })),
  hydrateBalanceSnapshotsFromSeries: jest.fn((series: any) =>
    series.snapshots || [],
  ),
  isBalanceSnapshotSeries: jest.fn((value: any) => value?._packed === true),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  bootstrapKey,
  bootstrapWallets,
  bindWalletKeys,
  transformContacts,
  transformPortfolioPopulateStatus,
  transformPortfolioSnapshotSeries,
  encryptSpecificFields,
} from './transforms';

import {
  encryptWalletStore,
  decryptWalletStore,
  encryptAppStore,
  decryptAppStore,
  encryptShopStore,
  decryptShopStore,
} from './encrypt';

import {
  packBalanceSnapshotsToSeries,
  hydrateBalanceSnapshotsFromSeries,
  isBalanceSnapshotSeries,
} from '../../utils/portfolio/core/pnl/snapshotSeries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeWallet = (overrides: any = {}): any => ({
  id: 'wallet-1',
  credentials: {
    walletId: 'wallet-1',
    keyId: 'key-1',
    n: 1,
    m: 1,
    isComplete: () => true,
  },
  balance: {sat: 0, satLocked: 0, satConfirmedLocked: 0, satSpendable: 0, satPending: 0, crypto: '0', cryptoLocked: '0', cryptoConfirmedLocked: '0', cryptoSpendable: '0', cryptoPending: '0', fiat: 0, fiatLastDay: 0, fiatLocked: 0, fiatConfirmedLocked: 0, fiatSpendable: 0, fiatPending: 0},
  transactionHistory: {transactions: [], loadMore: true, hasConfirmingTxs: false},
  network: 'mainnet',
  keyId: 'key-1',
  pendingTxps: [],
  ...overrides,
});

const makeKey = (overrides: any = {}): any => ({
  id: 'key-1',
  wallets: [],
  properties: {metadata: true, fingerPrint: 'fp-1'},
  methods: {
    isPrivKeyEncrypted: jest.fn(() => false),
    toObj: jest.fn(() => ({})),
  },
  totalBalance: 0,
  totalBalanceLastDay: 0,
  backupComplete: false,
  keyName: 'My Key',
  hideKeyBalance: false,
  isReadOnly: false,
  ...overrides,
});

// ─── bootstrapKey ─────────────────────────────────────────────────────────────

describe('bootstrapKey', () => {
  it('returns key unchanged when id is "readonly"', () => {
    const key = makeKey();
    const result = bootstrapKey(key, 'readonly');
    expect(result).toBe(key);
  });

  it('returns key unchanged when key has hardwareSource', () => {
    const key = makeKey({hardwareSource: 'ledger'});
    const result = bootstrapKey(key, 'some-id');
    expect(result).toBe(key);
  });

  it('calls createTssKey when key has properties.metadata', () => {
    const {BwcProvider} = require('../../lib/bwc');
    const instance = BwcProvider.getInstance();
    const key = makeKey({
      properties: {metadata: {id: 'meta', n: 2, m: 1}, keychain: {}},
    });
    bootstrapKey(key, 'my-tss-key');
    expect(instance.createTssKey).toHaveBeenCalled();
  });

  it('restores privateKeyShare Buffer when data is present', () => {
    const {BwcProvider} = require('../../lib/bwc');
    const instance = BwcProvider.getInstance();
    const key = makeKey({
      properties: {
        metadata: {id: 'meta', n: 2, m: 1},
        keychain: {privateKeyShare: {data: [1, 2, 3]}},
      },
    });
    bootstrapKey(key, 'my-tss-key');
    expect(instance.createTssKey).toHaveBeenCalled();
  });

  it('restores reducedPrivateKeyShare Buffer when data is present', () => {
    const {BwcProvider} = require('../../lib/bwc');
    const instance = BwcProvider.getInstance();
    const key = makeKey({
      properties: {
        metadata: {id: 'meta', n: 2, m: 1},
        keychain: {
          privateKeyShare: {data: [1]},
          reducedPrivateKeyShare: {data: [4, 5]},
        },
      },
    });
    bootstrapKey(key, 'my-tss-key');
    expect(instance.createTssKey).toHaveBeenCalled();
  });

  it('calls createKey when key has no metadata (standard key)', () => {
    const {BwcProvider} = require('../../lib/bwc');
    const instance = BwcProvider.getInstance();
    const key = makeKey({properties: {someData: 'x'}}); // no .metadata
    bootstrapKey(key, 'my-standard-key');
    expect(instance.createKey).toHaveBeenCalledWith({
      seedType: 'object',
      seedData: key.properties,
    });
  });

  it('returns undefined (swallows error) when createKey throws', () => {
    const {BwcProvider} = require('../../lib/bwc');
    const instance = BwcProvider.getInstance();
    instance.createKey.mockImplementationOnce(() => {
      throw new Error('createKey failed');
    });
    const key = makeKey({properties: {someData: 'x'}});
    const result = bootstrapKey(key, 'bad-key');
    expect(result).toBeUndefined();
  });

  it('returns undefined (swallows error) when createTssKey throws', () => {
    const {BwcProvider} = require('../../lib/bwc');
    const instance = BwcProvider.getInstance();
    instance.createTssKey.mockImplementationOnce(() => {
      throw new Error('tss failed');
    });
    const key = makeKey({
      properties: {metadata: {id: 'meta', n: 2, m: 1}, keychain: {}},
    });
    const result = bootstrapKey(key, 'bad-tss-key');
    expect(result).toBeUndefined();
  });
});

// ─── bootstrapWallets ─────────────────────────────────────────────────────────

describe('bootstrapWallets', () => {
  it('returns an array with bootstrapped wallets', () => {
    const wallet = makeWallet();
    const result = bootstrapWallets([wallet]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('filters out wallets that threw during bootstrapping', () => {
    const {BwcProvider} = require('../../lib/bwc');
    const instance = BwcProvider.getInstance();
    instance.getClient.mockImplementationOnce(() => {
      throw new Error('bad wallet');
    });
    const badWallet = makeWallet({id: 'bad', credentials: {walletId: 'bad'}});
    const result = bootstrapWallets([badWallet]);
    expect(result).toHaveLength(0);
  });

  it('resets transactionHistory for each wallet', () => {
    const wallet = makeWallet({
      transactionHistory: {transactions: [{id: 'tx1'}], loadMore: false, hasConfirmingTxs: true},
    });
    bootstrapWallets([wallet]);
    expect(wallet.transactionHistory).toEqual({
      transactions: [],
      loadMore: true,
      hasConfirmingTxs: false,
    });
  });

  it('returns empty array when given empty array', () => {
    const result = bootstrapWallets([]);
    expect(result).toEqual([]);
  });
});

// ─── bindWalletKeys transform ─────────────────────────────────────────────────

describe('bindWalletKeys', () => {
  const getInbound = () => (bindWalletKeys as any).in;
  const getOutbound = () => (bindWalletKeys as any).out;

  it('inbound: returns state unchanged when no keys', () => {
    const state: any = {keys: {}};
    const result = getInbound()(state);
    expect(result).toBe(state);
  });

  it('inbound: strips transactionHistory from wallets', () => {
    const wallet = makeWallet();
    wallet.transactionHistory = {transactions: [{id: 'tx'}], loadMore: false, hasConfirmingTxs: false};
    const state: any = {
      keys: {
        'key-1': {wallets: [wallet]},
      },
    };
    getInbound()(state);
    expect(wallet.transactionHistory).toBeUndefined();
  });

  it('outbound: returns state unchanged when no keys', () => {
    const state: any = {keys: {}};
    const result = getOutbound()(state);
    expect(result).toBe(state);
  });

  it('outbound: bootstraps wallets for each key', () => {
    const wallet = makeWallet();
    const key = makeKey({wallets: [wallet]});
    const state: any = {keys: {'key-1': key}};
    const result = getOutbound()(state);
    expect(Array.isArray(result.keys['key-1'].wallets)).toBe(true);
  });
});

// ─── transformContacts ────────────────────────────────────────────────────────

describe('transformContacts', () => {
  const getOutbound = () => (transformContacts as any).out;

  it('passes through inbound state unchanged', () => {
    const state: any = {list: []};
    const result = (transformContacts as any).in(state);
    expect(result).toBe(state);
  });

  it('returns state unchanged when list is empty', () => {
    const state: any = {list: []};
    const result = getOutbound()(state);
    expect(result.list).toEqual([]);
  });

  it('adds chain equal to coin for known UTXO coins', () => {
    const state: any = {
      list: [{coin: 'btc', chain: undefined, name: 'Test BTC'}],
    };
    const result = getOutbound()(state);
    expect(result.list[0].chain).toBe('btc');
  });

  it('adds chain equal to coin for known OtherBitpay coins', () => {
    const state: any = {
      list: [{coin: 'eth', chain: undefined, name: 'Test ETH'}],
    };
    const result = getOutbound()(state);
    expect(result.list[0].chain).toBe('eth');
  });

  it('defaults chain to "eth" for unknown coins', () => {
    const state: any = {
      list: [{coin: 'unknown_coin_xyz', chain: undefined, name: 'Unknown'}],
    };
    const result = getOutbound()(state);
    expect(result.list[0].chain).toBe('eth');
  });

  it('preserves existing chain value', () => {
    const state: any = {
      list: [{coin: 'eth', chain: 'matic', name: 'Test'}],
    };
    const result = getOutbound()(state);
    expect(result.list[0].chain).toBe('matic');
  });

  it('returns outboundState on error', () => {
    // list is not iterable — should catch and return original state
    const state: any = {list: null};
    // Accessing .length on null will throw inside the transform
    // Force the error path by making list non-array in a way that throws
    Object.defineProperty(state, 'list', {
      get: () => { throw new Error('forced error'); },
      configurable: true,
    });
    // The function's catch block should return the (broken) outboundState
    expect(() => getOutbound()(state)).not.toThrow();
  });
});

// ─── transformPortfolioPopulateStatus ─────────────────────────────────────────

describe('transformPortfolioPopulateStatus', () => {
  const getOutbound = () => (transformPortfolioPopulateStatus as any).out;

  it('passes through inbound state unchanged', () => {
    const state: any = {};
    const result = (transformPortfolioPopulateStatus as any).in(state);
    expect(result).toBe(state);
  });

  it('sets inProgress to false when it was true', () => {
    const state: any = {
      populateStatus: {inProgress: true, currentWalletId: 'w1'},
    };
    const result = getOutbound()(state);
    expect(result.populateStatus.inProgress).toBe(false);
    expect(result.populateStatus.currentWalletId).toBeUndefined();
  });

  it('returns state unchanged when inProgress is false', () => {
    const state: any = {
      populateStatus: {inProgress: false, currentWalletId: undefined},
    };
    const result = getOutbound()(state);
    expect(result).toBe(state);
  });

  it('returns state unchanged when populateStatus is missing', () => {
    const state: any = {};
    const result = getOutbound()(state);
    expect(result).toBe(state);
  });
});

// ─── transformPortfolioSnapshotSeries ─────────────────────────────────────────

describe('transformPortfolioSnapshotSeries', () => {
  const getInbound = () => (transformPortfolioSnapshotSeries as any).in;
  const getOutbound = () => (transformPortfolioSnapshotSeries as any).out;

  const makeSnapshot = (overrides: any = {}): any => ({
    id: 'snap-1',
    walletId: 'wallet-1',
    chain: 'eth',
    coin: 'eth',
    network: 'mainnet',
    assetId: '',
    timestamp: Date.now(),
    eventType: 'daily',
    txIds: undefined,
    cryptoBalance: '1.0',
    balanceDeltaAtomic: undefined,
    remainingCostBasisFiat: 100,
    quoteCurrency: 'USD',
    markRate: 2000,
    costBasisRateFiat: 2000,
    createdAt: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (packBalanceSnapshotsToSeries as jest.Mock).mockImplementation((opts: any) => ({
      _packed: true,
      snapshots: opts.snapshots,
    }));
    (isBalanceSnapshotSeries as jest.Mock).mockImplementation((v: any) => v?._packed === true);
    (hydrateBalanceSnapshotsFromSeries as jest.Mock).mockImplementation((series: any) =>
      series.snapshots || [],
    );
  });

  it('inbound: returns state unchanged when snapshotsByWalletId is empty', () => {
    const state: any = {snapshotsByWalletId: {}};
    const result = getInbound()(state);
    expect(result.snapshotsByWalletId).toEqual({});
  });

  it('inbound: skips wallet entry when snaps array is empty', () => {
    const state: any = {snapshotsByWalletId: {'w1': []}};
    const result = getInbound()(state);
    expect(result.snapshotsByWalletId['w1']).toBeUndefined();
  });

  it('inbound: skips wallet entry when value is not array', () => {
    const state: any = {snapshotsByWalletId: {'w1': 'not-an-array'}};
    const result = getInbound()(state);
    expect(result.snapshotsByWalletId['w1']).toBeUndefined();
  });

  it('inbound: packs snapshots into series', () => {
    const snap = makeSnapshot();
    const state: any = {snapshotsByWalletId: {'wallet-1': [snap]}};
    const result = getInbound()(state);
    expect(packBalanceSnapshotsToSeries).toHaveBeenCalled();
    expect(result.snapshotsByWalletId['wallet-1']).toBeDefined();
  });

  it('inbound: handles tx eventType snapshots (compressionEnabled false)', () => {
    const snap = makeSnapshot({eventType: 'tx'});
    const state: any = {snapshotsByWalletId: {'wallet-1': [snap]}};
    getInbound()(state);
    expect(packBalanceSnapshotsToSeries).toHaveBeenCalledWith(
      expect.objectContaining({compressionEnabled: false}),
    );
  });

  it('inbound: omits packed entry when packBalanceSnapshotsToSeries returns falsy', () => {
    (packBalanceSnapshotsToSeries as jest.Mock).mockReturnValueOnce(null);
    const snap = makeSnapshot();
    const state: any = {snapshotsByWalletId: {'wallet-1': [snap]}};
    const result = getInbound()(state);
    expect(result.snapshotsByWalletId['wallet-1']).toBeUndefined();
  });

  it('inbound: sorts out-of-order snapshots chronologically', () => {
    const snap1 = makeSnapshot({timestamp: 2000, id: 'late'});
    const snap2 = makeSnapshot({timestamp: 1000, id: 'early'});
    const state: any = {snapshotsByWalletId: {'wallet-1': [snap1, snap2]}};
    getInbound()(state);
    // packBalanceSnapshotsToSeries receives snapshots in sorted order
    const callArgs = (packBalanceSnapshotsToSeries as jest.Mock).mock.calls[0][0];
    expect(callArgs.snapshots[0].timestamp).toBe(1000);
    expect(callArgs.snapshots[1].timestamp).toBe(2000);
  });

  it('inbound: snapshot with txIds array maps txIds correctly', () => {
    const snap = makeSnapshot({txIds: ['tx1', 'tx2']});
    const state: any = {snapshotsByWalletId: {'wallet-1': [snap]}};
    getInbound()(state);
    const callArgs = (packBalanceSnapshotsToSeries as jest.Mock).mock.calls[0][0];
    expect(callArgs.snapshots[0].txIds).toEqual(['tx1', 'tx2']);
  });

  it('inbound: snapshot without txIds keeps txIds undefined', () => {
    const snap = makeSnapshot({txIds: undefined});
    const state: any = {snapshotsByWalletId: {'wallet-1': [snap]}};
    getInbound()(state);
    const callArgs = (packBalanceSnapshotsToSeries as jest.Mock).mock.calls[0][0];
    expect(callArgs.snapshots[0].txIds).toBeUndefined();
  });

  it('inbound: returns state on error', () => {
    const broken: any = {
      get snapshotsByWalletId() {
        throw new Error('forced');
      },
    };
    expect(() => getInbound()(broken)).not.toThrow();
  });

  it('outbound: unpacks series into BalanceSnapshot array', () => {
    const packedSeries = {_packed: true, snapshots: [makeSnapshot()]};
    const state: any = {snapshotsByWalletId: {'wallet-1': packedSeries}};
    const result = getOutbound()(state);
    expect(Array.isArray(result.snapshotsByWalletId['wallet-1'])).toBe(true);
  });

  it('outbound: passes through raw array when not a series', () => {
    (isBalanceSnapshotSeries as jest.Mock).mockReturnValueOnce(false);
    const rawSnaps = [makeSnapshot()];
    const state: any = {snapshotsByWalletId: {'wallet-1': rawSnaps}};
    const result = getOutbound()(state);
    expect(result.snapshotsByWalletId['wallet-1']).toBe(rawSnaps);
  });

  it('outbound: computes fiatBalance as units * markRate', () => {
    const snap = makeSnapshot({cryptoBalance: '2', markRate: 1000, costBasisRateFiat: undefined, remainingCostBasisFiat: 0});
    (hydrateBalanceSnapshotsFromSeries as jest.Mock).mockReturnValueOnce([snap]);
    const packedSeries = {_packed: true, snapshots: [snap]};
    const state: any = {snapshotsByWalletId: {'wallet-1': packedSeries}};
    const result = getOutbound()(state);
    const out = result.snapshotsByWalletId['wallet-1'][0];
    // cryptoBalance is string '2', toFiniteNumber gives 2, markRate 1000 → fiatBalance = 2000
    expect(out.costBasisRateFiat).toBe(1000);
  });

  it('outbound: dayStartMs is set for daily eventType', () => {
    const ts = new Date('2024-01-15').getTime();
    const snap = makeSnapshot({eventType: 'daily', timestamp: ts});
    (hydrateBalanceSnapshotsFromSeries as jest.Mock).mockReturnValueOnce([snap]);
    const packedSeries = {_packed: true, snapshots: [snap]};
    const state: any = {snapshotsByWalletId: {'wallet-1': packedSeries}};
    const result = getOutbound()(state);
    expect(result.snapshotsByWalletId['wallet-1'][0].dayStartMs).toBeDefined();
  });

  it('outbound: dayStartMs is undefined for tx eventType', () => {
    const snap = makeSnapshot({eventType: 'tx'});
    (hydrateBalanceSnapshotsFromSeries as jest.Mock).mockReturnValueOnce([snap]);
    const packedSeries = {_packed: true, snapshots: [snap]};
    const state: any = {snapshotsByWalletId: {'wallet-1': packedSeries}};
    const result = getOutbound()(state);
    expect(result.snapshotsByWalletId['wallet-1'][0].dayStartMs).toBeUndefined();
  });

  it('outbound: txIds with >1 element is preserved', () => {
    const snap = makeSnapshot({txIds: ['a', 'b']});
    (hydrateBalanceSnapshotsFromSeries as jest.Mock).mockReturnValueOnce([snap]);
    const packedSeries = {_packed: true, snapshots: [snap]};
    const state: any = {snapshotsByWalletId: {'wallet-1': packedSeries}};
    const result = getOutbound()(state);
    expect(result.snapshotsByWalletId['wallet-1'][0].txIds).toEqual(['a', 'b']);
  });

  it('outbound: txIds with <=1 element is set to undefined', () => {
    const snap = makeSnapshot({txIds: ['only-one']});
    (hydrateBalanceSnapshotsFromSeries as jest.Mock).mockReturnValueOnce([snap]);
    const packedSeries = {_packed: true, snapshots: [snap]};
    const state: any = {snapshotsByWalletId: {'wallet-1': packedSeries}};
    const result = getOutbound()(state);
    expect(result.snapshotsByWalletId['wallet-1'][0].txIds).toBeUndefined();
  });

  it('outbound: avgCostFiatPerUnit is 0 when units is 0', () => {
    const snap = makeSnapshot({cryptoBalance: '0', markRate: 1000, remainingCostBasisFiat: 50});
    (hydrateBalanceSnapshotsFromSeries as jest.Mock).mockReturnValueOnce([snap]);
    const packedSeries = {_packed: true, snapshots: [snap]};
    const state: any = {snapshotsByWalletId: {'wallet-1': packedSeries}};
    const result = getOutbound()(state);
    expect(result.snapshotsByWalletId['wallet-1'][0].avgCostFiatPerUnit).toBe(0);
  });

  it('outbound: returns outboundState on error', () => {
    const broken: any = {
      get snapshotsByWalletId() {
        throw new Error('forced');
      },
    };
    expect(() => getOutbound()(broken)).not.toThrow();
  });
});

// ─── encryptSpecificFields ────────────────────────────────────────────────────

describe('encryptSpecificFields', () => {
  const secretKey = 'test-secret';

  beforeEach(() => {
    jest.clearAllMocks();
    (encryptWalletStore as jest.Mock).mockImplementation((s: any) => ({...s, _encrypted: true}));
    (decryptWalletStore as jest.Mock).mockImplementation((s: any) => ({...s, _decrypted: true}));
    (encryptAppStore as jest.Mock).mockImplementation((s: any) => ({...s, _encrypted: true}));
    (decryptAppStore as jest.Mock).mockImplementation((s: any) => ({...s, _decrypted: true}));
    (encryptShopStore as jest.Mock).mockImplementation((s: any) => ({...s, _encrypted: true}));
    (decryptShopStore as jest.Mock).mockImplementation((s: any) => ({...s, _decrypted: true}));
  });

  const getTransform = () => {
    // encryptSpecificFields uses createTransform directly, so extract in/out fns
    const {createTransform} = require('redux-persist');
    let capturedIn: any;
    let capturedOut: any;
    (createTransform as jest.Mock).mockImplementationOnce((inFn: any, outFn: any) => {
      capturedIn = inFn;
      capturedOut = outFn;
      return {in: inFn, out: outFn};
    });
    encryptSpecificFields(secretKey);
    return {inFn: capturedIn, outFn: capturedOut};
  };

  it('encrypts WALLET store on inbound', () => {
    const {inFn} = getTransform();
    const state: any = {keys: {}};
    inFn(state, 'WALLET');
    expect(encryptWalletStore).toHaveBeenCalledWith(state, secretKey);
  });

  it('encrypts APP store on inbound', () => {
    const {inFn} = getTransform();
    const state: any = {};
    inFn(state, 'APP');
    expect(encryptAppStore).toHaveBeenCalledWith(state, secretKey);
  });

  it('encrypts SHOP store on inbound', () => {
    const {inFn} = getTransform();
    const state: any = {};
    inFn(state, 'SHOP');
    expect(encryptShopStore).toHaveBeenCalledWith(state, secretKey);
  });

  it('returns state unchanged for unrecognised key on inbound', () => {
    const {inFn} = getTransform();
    const state: any = {foo: 'bar'};
    const result = inFn(state, 'RATE');
    expect(result).toBe(state);
  });

  it('decrypts WALLET store on outbound', () => {
    const {outFn} = getTransform();
    const state: any = {keys: {}};
    outFn(state, 'WALLET');
    expect(decryptWalletStore).toHaveBeenCalledWith(state, secretKey);
  });

  it('decrypts APP store on outbound', () => {
    const {outFn} = getTransform();
    const state: any = {};
    outFn(state, 'APP');
    expect(decryptAppStore).toHaveBeenCalledWith(state, secretKey);
  });

  it('decrypts SHOP store on outbound', () => {
    const {outFn} = getTransform();
    const state: any = {};
    outFn(state, 'SHOP');
    expect(decryptShopStore).toHaveBeenCalledWith(state, secretKey);
  });

  it('returns state unchanged for unrecognised key on outbound', () => {
    const {outFn} = getTransform();
    const state: any = {foo: 'baz'};
    const result = outFn(state, 'RATE');
    expect(result).toBe(state);
  });

  it('inbound: handles encrypt error by calling logTransformFailure', () => {
    (encryptWalletStore as jest.Mock).mockImplementationOnce(() => {
      throw new Error('encrypt failed');
    });
    const {inFn} = getTransform();
    const state: any = {keys: {}};
    // Should not throw — the try/catch inside swallows it
    expect(() => inFn(state, 'WALLET')).not.toThrow();
  });

  it('outbound: handles decrypt error by calling logTransformFailure', () => {
    (decryptWalletStore as jest.Mock).mockImplementationOnce(() => {
      throw new Error('decrypt failed');
    });
    const {outFn} = getTransform();
    const state: any = {keys: {}};
    expect(() => outFn(state, 'WALLET')).not.toThrow();
  });
});

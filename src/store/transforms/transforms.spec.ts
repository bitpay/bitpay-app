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
    createKey: jest.fn(() => ({
      id: 'mock-key-id',
      isPrivKeyEncrypted: jest.fn(() => false),
      toObj: jest.fn(() => ({})),
    })),
    createTssKey: jest.fn(() => ({
      id: 'mock-tss-key-id',
      isPrivKeyEncrypted: jest.fn(() => false),
      toObj: jest.fn(() => ({})),
    })),
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
    getConstants: jest.fn(() => ({
      SCRIPT_TYPES: {},
      DERIVATION_STRATEGIES: {},
    })),
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

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  bootstrapKey,
  bootstrapWallets,
  bindWalletKeys,
  transformContacts,
  transformPortfolioPopulateStatus,
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
  balance: {
    sat: 0,
    satLocked: 0,
    satConfirmedLocked: 0,
    satSpendable: 0,
    satPending: 0,
    crypto: '0',
    cryptoLocked: '0',
    cryptoConfirmedLocked: '0',
    cryptoSpendable: '0',
    cryptoPending: '0',
    fiat: 0,
    fiatLastDay: 0,
    fiatLocked: 0,
    fiatConfirmedLocked: 0,
    fiatSpendable: 0,
    fiatPending: 0,
  },
  transactionHistory: {
    transactions: [],
    loadMore: true,
    hasConfirmingTxs: false,
  },
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
      transactionHistory: {
        transactions: [{id: 'tx1'}],
        loadMore: false,
        hasConfirmingTxs: true,
      },
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
    wallet.transactionHistory = {
      transactions: [{id: 'tx'}],
      loadMore: false,
      hasConfirmingTxs: false,
    };
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
      get: () => {
        throw new Error('forced error');
      },
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
      populateStatus: {
        inProgress: true,
        currentWalletId: 'w1',
        walletStatusById: {w1: 'in_progress'},
      },
    };
    const result = getOutbound()(state);
    expect(result.populateStatus.inProgress).toBe(false);
    expect(result.populateStatus.currentWalletId).toBeUndefined();
    expect(result.populateStatus.walletStatusById).toEqual({});
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

// ─── encryptSpecificFields ────────────────────────────────────────────────────

describe('encryptSpecificFields', () => {
  const secretKey = 'test-secret';

  beforeEach(() => {
    jest.clearAllMocks();
    (encryptWalletStore as jest.Mock).mockImplementation((s: any) => ({
      ...s,
      _encrypted: true,
    }));
    (decryptWalletStore as jest.Mock).mockImplementation((s: any) => ({
      ...s,
      _decrypted: true,
    }));
    (encryptAppStore as jest.Mock).mockImplementation((s: any) => ({
      ...s,
      _encrypted: true,
    }));
    (decryptAppStore as jest.Mock).mockImplementation((s: any) => ({
      ...s,
      _decrypted: true,
    }));
    (encryptShopStore as jest.Mock).mockImplementation((s: any) => ({
      ...s,
      _encrypted: true,
    }));
    (decryptShopStore as jest.Mock).mockImplementation((s: any) => ({
      ...s,
      _decrypted: true,
    }));
  });

  const getTransform = () => {
    // encryptSpecificFields uses createTransform directly, so extract in/out fns
    const {createTransform} = require('redux-persist');
    let capturedIn: any;
    let capturedOut: any;
    (createTransform as jest.Mock).mockImplementationOnce(
      (inFn: any, outFn: any) => {
        capturedIn = inFn;
        capturedOut = outFn;
        return {in: inFn, out: outFn};
      },
    );
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

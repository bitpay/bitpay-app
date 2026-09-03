// Tests for the TSS transaction-signing effects (tss-send.ts). TssSign is a
// scriptable event-emitter fake; AsyncStorage uses the real in-memory mock so
// session save/load/clear round-trips run for real.

import _configureTestStore from '@test/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppActionTypes} from '../../../app/app.types';
import {
  isTSSWallet,
  isTSSKey,
  requiresTSSSigning,
  toBwsSignatureFormat,
  generateSessionId,
  startTSSSigning,
  pollTxpUntilBroadcast,
  joinTSSSigningSession,
} from './tss-send';

// ─── Mocks ──────────────────────────────────────────────────────────────────

/**
 * The jest.mock('@test/store') factory above replaces the real store with
 * this test double, so re-type the import to match what tests actually get
 * (the real configureTestStore requires an initialState argument and returns
 * a redux Store without getActions/setState).
 */
type MockStore = {
  dispatch: (action: any) => any;
  getActions: () => any[];
  getState: () => any;
  setState: (next: any) => void;
};
const configureTestStore = _configureTestStore as unknown as (
  overrides?: any,
) => MockStore;

jest.mock('@test/store', () => ({
  __esModule: true,
  default: jest.fn((overrides: any = {}) => {
    const state = {
      ...overrides,
      APP: {
        biometricLockActive: false,
        ...(overrides.APP || {}),
      },
    };
    const actions: any[] = [];
    const getState = () => state;
    const dispatch = jest.fn((action: any): any => {
      if (typeof action === 'function') {
        return action(dispatch, getState);
      }
      actions.push(action);
      return action;
    });

    return {
      dispatch,
      getActions: () => actions,
      getState,
      setState: (next: any) => Object.assign(state, next),
    };
  }),
}));

jest.mock('../../../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../../utils/helper-methods', () => ({
  sleep: jest.fn(() => Promise.resolve()),
  toggleTSSModal: jest.fn((setShow: any, show: boolean) => {
    setShow?.(show);
    return Promise.resolve();
  }),
  checkEncryptedKeysForEddsaMigration: jest.fn(() => () => Promise.resolve()),
}));

jest.mock('../../utils/wallet', () => ({
  checkEncryptPassword: jest.fn(() => true),
}));

jest.mock('../send/send', () => ({
  broadcastTx: jest.fn(() => Promise.resolve({status: 'broadcasted'})),
  checkBiometricForSending: jest.fn(() => () => Promise.resolve(true)),
  getTx: jest.fn(() => Promise.resolve({status: 'pending'})),
}));

// ─── Fake BWC primitives ────────────────────────────────────────────────────

let tssSignInstances: any[] = [];

// Chainable event-emitter fake for TssSign, one instance per input.
function makeTssSignCtor() {
  return function TssSignCtor(this: any, _opts: any) {
    const handlers: Record<string, (...args: any[]) => void> = {};
    const instance: any = {
      id: undefined,
      opts: _opts,
      on: jest.fn((event: string, cb: (...args: any[]) => void) => {
        handlers[event] = cb;
        return instance;
      }),
      emit: (event: string, ...args: any[]) => handlers[event]?.(...args),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      // Real BWC start() emits copayerReady with the caller's own copayerId.
      start: jest.fn(async () => {
        instance.emit('copayerReady', _opts?.credentials?.copayerId);
      }),
      // Real BWC restoreSession() takes the session id from everything before
      // the last colon of the exported string.
      restoreSession: jest.fn(({session}: {session: string}) => {
        instance.id = session.slice(0, session.lastIndexOf(':'));
        return Promise.resolve();
      }),
      exportSession: jest.fn(() => 'exported-sign-session'),
      getSignature: jest.fn(() => ({r: 'r', s: 's'})),
      getSignatureFromServer: jest.fn(() => Promise.resolve(null)),
    };
    tssSignInstances.push(instance);
    return instance;
  };
}

let mockBwcInstance: any;
let mockBwcModule: any;

// tss-send.ts captures TssSign at module load, so getTssSign() must return a
// stable ctor; tests swap its implementation via __setTssSignImpl.
jest.mock('../../../../lib/bwc', () => {
  let currentImpl: any = null;
  const stableTssSignCtor = function TssSign(this: any, opts: any) {
    return currentImpl(opts);
  };
  const instance: any = {
    getTssSign: jest.fn(() => stableTssSignCtor),
    getTssKey: jest.fn(() => class MockTssKey {}),
    getBitcore: jest.fn(),
    getCore: jest.fn(),
    getUtils: jest.fn(),
  };
  return {
    BwcProvider: {
      getInstance: jest.fn(() => instance),
      API: {},
      instance,
    },
    __mockInstance: instance,
    __setTssSignImpl: (fn: any) => {
      currentImpl = fn;
    },
  };
});

mockBwcModule = jest.requireMock('../../../../lib/bwc');
mockBwcInstance = mockBwcModule.__mockInstance;

function makeFakeBitcore() {
  return {
    HDPublicKey: class {
      deriveChild(_path: string) {
        return {publicKey: {toString: () => 'derived-pub-key'}};
      }
    },
  };
}

function makeFakeCore(overrides: any = {}) {
  return {
    Transactions: {
      getSighash: jest.fn(() => 'ab'.repeat(32)),
      transformSignatureObject: jest.fn(
        ({obj}: any) => `bws-sig(${JSON.stringify(obj)})`,
      ),
      ...overrides,
    },
  };
}

function makeFakeUtils() {
  return {
    buildTx: jest.fn(() => ({
      uncheckedSerialize: () => 'raw-tx-hex',
    })),
  };
}

beforeEach(async () => {
  // restoreAllMocks drops jest.spyOn overrides that clearAllMocks keeps.
  jest.restoreAllMocks();
  jest.clearAllMocks();
  tssSignInstances = [];
  mockBwcModule.__setTssSignImpl(makeTssSignCtor());
  mockBwcInstance.getBitcore.mockReturnValue(makeFakeBitcore());
  mockBwcInstance.getCore.mockReturnValue(makeFakeCore());
  mockBwcInstance.getUtils.mockReturnValue(makeFakeUtils());
  await AsyncStorage.clear();
});

// Restore real timers even when a fake-timer test fails mid-assertion.
afterEach(() => {
  jest.useRealTimers();
});

const tick = async (n = 10) => {
  for (let i = 0; i < n; i++) {
    await Promise.resolve();
  }
};

const advanceAndFlush = async (ms: number, steps = 10) => {
  const stepMs = Math.max(1, Math.floor(ms / steps));
  for (let i = 0; i < steps; i++) {
    jest.advanceTimersByTime(stepMs);
    await tick(3);
  }
};

// Customize the next TssSign instance before signInput's first microtasks use it.
const configureNextTssSign = (configure: (instance: any) => void) => {
  const Ctor = makeTssSignCtor();
  mockBwcModule.__setTssSignImpl((opts: any) => {
    const instance = Ctor(opts);
    configure(instance);
    return instance;
  });
};

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeTssKey(overrides: any = {}) {
  return {
    keychain: {},
    decrypt: jest.fn(),
    ...overrides,
  };
}

function makeTssKeyObj(overrides: any = {}) {
  return {
    id: 'tss-key-1',
    isReadOnly: false,
    methods: makeTssKey(),
    wallets: [],
    isPrivKeyEncrypted: false,
    ...overrides,
  };
}

function makeTssWallet(overrides: any = {}) {
  const wallet: any = {
    id: 'wallet-1',
    tssKeyId: 'tss-key-id-1',
    credentials: {
      chain: 'eth',
      network: 'livenet',
      copayerId: 'copayer-1',
      clientDerivedPublicKey: 'xpub-fixture',
    },
    pushSignatures: jest.fn((_txp: any, _sigs: any, cb: any) =>
      cb(null, {..._txp, status: 'accepted'}),
    ),
    request: {
      get: jest.fn(() => Promise.resolve({body: {participants: []}})),
    },
    ...overrides,
  };
  return wallet;
}

function makeTxp(overrides: any = {}) {
  return {
    id: 'txp-1',
    chain: 'eth',
    inputs: [],
    inputPaths: undefined,
    ...overrides,
  };
}

const noopCallbacks = () => ({
  onStatusChange: jest.fn(),
  onProgressUpdate: jest.fn(),
  onCopayerStatusChange: jest.fn(),
  onRoundUpdate: jest.fn(),
  onError: jest.fn(),
  onComplete: jest.fn(),
});

// ─── isTSSWallet / isTSSKey / requiresTSSSigning ───────────────────────────

describe('isTSSWallet', () => {
  it('is true when the wallet has a tssKeyId', () => {
    expect(isTSSWallet(makeTssWallet())).toBe(true);
  });

  it('is false when the wallet has no tssKeyId (e.g. the create-multisig retry-exhaustion bug)', () => {
    expect(isTSSWallet(makeTssWallet({tssKeyId: undefined}))).toBe(false);
  });
});

describe('isTSSKey', () => {
  it('is true when some wallet has a tssKeyId and the key is not read-only', () => {
    const key = makeTssKeyObj({wallets: [makeTssWallet()]});
    expect(isTSSKey(key)).toBe(true);
  });

  it('is false when no wallet has a tssKeyId', () => {
    const key = makeTssKeyObj({
      wallets: [makeTssWallet({tssKeyId: undefined})],
    });
    expect(isTSSKey(key)).toBe(false);
  });

  it('is false when the key is read-only, even if a wallet has a tssKeyId', () => {
    const key = makeTssKeyObj({
      wallets: [makeTssWallet()],
      isReadOnly: true,
    });
    expect(isTSSKey(key)).toBe(false);
  });

  it('is false for an undefined key', () => {
    expect(isTSSKey(undefined as any)).toBe(false);
  });
});

describe('requiresTSSSigning', () => {
  it('is true when the key is a TSS key and the wallet has a tssKeyId', () => {
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    expect(requiresTSSSigning(wallet, key)).toBe(true);
  });

  it('is false when the wallet has no tssKeyId even if the key looks like a TSS key', () => {
    const walletWithTss = makeTssWallet();
    const walletWithout = makeTssWallet({tssKeyId: undefined, id: 'wallet-2'});
    const key = makeTssKeyObj({wallets: [walletWithTss]});
    expect(requiresTSSSigning(walletWithout, key)).toBe(false);
  });
});

// ─── toBwsSignatureFormat / generateSessionId ──────────────────────────────

describe('toBwsSignatureFormat', () => {
  it('delegates to CWC.Transactions.transformSignatureObject with an uppercased chain', () => {
    const core = makeFakeCore();
    mockBwcInstance.getCore.mockReturnValue(core);

    const sig = {r: '1', s: '2'};
    const result = toBwsSignatureFormat(sig, 'btc');

    expect(core.Transactions.transformSignatureObject).toHaveBeenCalledWith({
      chain: 'BTC',
      obj: sig,
    });
    expect(result).toBe(`bws-sig(${JSON.stringify(sig)})`);
  });
});

describe('generateSessionId', () => {
  it('formats as "<txpId>:input<i>"', () => {
    expect(generateSessionId(makeTxp({id: 'txp-42'}), 3)).toBe('txp-42:input3');
  });
});

// ─── startTSSSigning (covers signInput) ────────────────────────────────────

// Mirrors the module-private constant in tss-send.ts (TSS_SESSION_PREFIX).
const TSS_SESSION_PREFIX = 'TSS_SIGN_SESSION_';

const seedSavedSession = async (
  sessionId: string,
  signData: string,
  round: number,
) => {
  await AsyncStorage.setItem(
    TSS_SESSION_PREFIX + sessionId,
    JSON.stringify({
      exported: `${sessionId}:${signData}`,
      round,
      savedAt: Date.now(),
    }),
  );
};

const driveToComplete = (tssSign: any, round = 1) => {
  tssSign.emit('roundready', round);
  tssSign.emit('roundprocessed', round);
  tssSign.emit('roundsubmitted', round);
  tssSign.emit('complete');
};

describe('startTSSSigning', () => {
  it('throws when the key is not a TSS key', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet({tssKeyId: undefined});
    const key = makeTssKeyObj({wallets: [wallet]});

    await expect(
      store.dispatch(
        startTSSSigning({
          key,
          wallet,
          txp: makeTxp(),
          callbacks: noopCallbacks(),
        }),
      ),
    ).rejects.toThrow('Key is not a TSS key');
  });

  it('throws when TSS key methods are not available', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet], methods: undefined});

    await expect(
      store.dispatch(
        startTSSSigning({
          key,
          wallet,
          txp: makeTxp(),
          callbacks: noopCallbacks(),
        }),
      ),
    ).rejects.toThrow('TSS key methods not available');
  });

  it('signs a single (non-UTXO) input end-to-end and pushes the signature', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const callbacks = noopCallbacks();
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks}),
    );
    await tick(20);

    expect(tssSignInstances).toHaveLength(1);
    const tssSign = tssSignInstances[0];
    expect(tssSign.start).toHaveBeenCalledWith(
      expect.objectContaining({id: 'txp-1:input0'}),
    );

    driveToComplete(tssSign);

    const result = await resultPromise;

    expect(callbacks.onStatusChange).toHaveBeenCalledWith('initializing');
    expect(callbacks.onStatusChange).toHaveBeenCalledWith(
      'waiting_for_cosigners',
    );
    expect(callbacks.onStatusChange).toHaveBeenCalledWith(
      'signature_generation',
    );
    expect(callbacks.onStatusChange).toHaveBeenCalledWith('broadcasting');
    expect(callbacks.onComplete).toHaveBeenCalledWith(
      expect.stringContaining('bws-sig('),
    );
    expect(wallet.pushSignatures).toHaveBeenCalled();
    expect(result.status).toBe('accepted');
  });

  it('persists the exported session after start() so a killed app can resume', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const saved = await AsyncStorage.getItem(
      TSS_SESSION_PREFIX + 'txp-1:input0',
    );
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!).round).toBe(0);

    driveToComplete(tssSignInstances[0]);
    await resultPromise;
  });

  it('clears the saved session once signing completes', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);
    driveToComplete(tssSignInstances[0]);
    await resultPromise;

    const saved = await AsyncStorage.getItem(
      TSS_SESSION_PREFIX + 'txp-1:input0',
    );
    expect(saved).toBeNull();
  });

  it('restores a saved session at round > 0 and reports existing participants as signed', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet({
      request: {
        get: jest.fn(() =>
          Promise.resolve({body: {participants: ['copayer-2']}}),
        ),
      },
    });
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    await seedSavedSession('txp-1:input0', 'saved-sign-data', 2);

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    expect(tssSign.restoreSession).toHaveBeenCalledWith({
      session: 'txp-1:input0:saved-sign-data',
    });
    expect(tssSign.id).toBe('txp-1:input0');
    expect(wallet.request.get).toHaveBeenCalledWith(
      '/v1/tss/sign/txp-1:input0/0',
    );

    driveToComplete(tssSign, 3);
    await resultPromise;
  });

  it('forwards the decrypt password to restoreSession so an encrypted key share can be read back', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    await seedSavedSession('txp-1:input0', 'saved-sign-data', 1);

    const resultPromise = store.dispatch(
      startTSSSigning({
        key,
        wallet,
        txp,
        callbacks: noopCallbacks(),
        password: 'my-password',
      }),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    expect(tssSign.restoreSession).toHaveBeenCalledWith({
      session: 'txp-1:input0:saved-sign-data',
      password: 'my-password',
    });

    driveToComplete(tssSign, 2);
    await resultPromise;
  });

  it('notifies onCopayerStatusChange for every restored participant plus self if missing', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet({
      request: {
        get: jest.fn(() =>
          Promise.resolve({body: {participants: ['someone-else']}}),
        ),
      },
    });
    const key = makeTssKeyObj({wallets: [wallet]});
    const callbacks = noopCallbacks();
    const txp = makeTxp();

    await seedSavedSession('txp-1:input0', 'saved-sign-data', 1);

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks}),
    );
    await tick(20);

    expect(callbacks.onCopayerStatusChange).toHaveBeenCalledWith(
      'someone-else',
      'signed',
    );
    // Self ('copayer-1') was not in the participants list → reported too.
    expect(callbacks.onCopayerStatusChange).toHaveBeenCalledWith(
      'copayer-1',
      'signed',
    );

    driveToComplete(tssSignInstances[0], 3);
    await resultPromise;
  });

  it('restoring at round 0 stays in waiting_for_cosigners without fetching participants', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const callbacks = noopCallbacks();
    const txp = makeTxp();

    await seedSavedSession('txp-1:input0', 'saved-sign-data', 0);

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks}),
    );
    await tick(20);

    expect(wallet.request.get).not.toHaveBeenCalled();
    expect(callbacks.onCopayerStatusChange).toHaveBeenCalledWith(
      'copayer-1',
      'signed',
    );

    driveToComplete(tssSignInstances[0]);
    await resultPromise;
  });

  it('falls back to start() when restoreSession() fails, and continues normally', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    await seedSavedSession('txp-1:input0', 'stale-sign-data', 1);

    configureNextTssSign(instance => {
      instance.restoreSession.mockRejectedValue(new Error('stale session'));
    });

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    expect(tssSign.restoreSession).toHaveBeenCalled();
    expect(tssSign.start).toHaveBeenCalled();

    driveToComplete(tssSign);
    await resultPromise;

    const saved = await AsyncStorage.getItem(
      TSS_SESSION_PREFIX + 'txp-1:input0',
    );
    expect(saved).toBeNull();
  });

  it('recovers from the server when restoreSession() fails AND the start() fallback also fails with TSS_ROUND_ALREADY_DONE', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    await seedSavedSession('txp-1:input0', 'stale-sign-data', 1);

    configureNextTssSign(instance => {
      instance.restoreSession.mockRejectedValue(new Error('stale session'));
      instance.start.mockRejectedValue(
        new Error('TSS_ROUND_ALREADY_DONE: after fallback'),
      );
      instance.getSignatureFromServer.mockResolvedValue({r: 'r', s: 's'});
    });

    const result = await store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );

    expect(result.status).toBe('accepted');
  });

  it('rejects with a friendly error when restoreSession() fails AND the start() fallback also fails with no recoverable signature', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    await seedSavedSession('txp-1:input0', 'stale-sign-data', 1);

    configureNextTssSign(instance => {
      instance.restoreSession.mockRejectedValue(new Error('stale session'));
      instance.start.mockRejectedValue(new Error('some other error'));
    });

    await expect(
      store.dispatch(
        startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
      ),
    ).rejects.toThrow(
      'TSS session interrupted. Try deleting this proposal and creating a new one.',
    );
  });

  it('restores a retry session when a fresh start() fails with TSS_ROUND_MESSAGE_EXISTS, no signature is ready yet, but a saved session exists', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    // First getItem misses (fresh-start branch); the retry lookup then
    // finds the seeded session.
    await seedSavedSession('txp-1:input0', 'retry-sign-data', 1);
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);

    configureNextTssSign(instance => {
      instance.start.mockRejectedValueOnce(
        new Error('TSS_ROUND_MESSAGE_EXISTS: dup'),
      );
      instance.getSignatureFromServer.mockResolvedValueOnce(null);
    });

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    expect(tssSign.start).toHaveBeenCalled();
    expect(tssSign.restoreSession).toHaveBeenCalledWith({
      session: 'txp-1:input0:retry-sign-data',
    });
    expect(tssSign.id).toBe('txp-1:input0');

    driveToComplete(tssSign);
    await resultPromise;
  });

  it('forwards the decrypt password to the retry-recovery restoreSession too', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    await seedSavedSession('txp-1:input0', 'retry-sign-data', 1);
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);

    configureNextTssSign(instance => {
      instance.start.mockRejectedValueOnce(
        new Error('TSS_ROUND_MESSAGE_EXISTS: dup'),
      );
      instance.getSignatureFromServer.mockResolvedValueOnce(null);
    });

    const resultPromise = store.dispatch(
      startTSSSigning({
        key,
        wallet,
        txp,
        callbacks: noopCallbacks(),
        password: 'my-password',
      }),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    expect(tssSign.restoreSession).toHaveBeenCalledWith({
      session: 'txp-1:input0:retry-sign-data',
      password: 'my-password',
    });

    driveToComplete(tssSign);
    await resultPromise;
  });

  it('rejects with a friendly error when the retry-recovery restoreSession() also fails', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    await seedSavedSession('txp-1:input0', 'retry-sign-data', 1);
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);

    configureNextTssSign(instance => {
      instance.start.mockRejectedValueOnce(
        new Error('TSS_ROUND_MESSAGE_EXISTS: dup'),
      );
      instance.getSignatureFromServer.mockResolvedValueOnce(null);
      instance.restoreSession.mockRejectedValue(
        new Error('retry session is also stale'),
      );
    });

    await expect(
      store.dispatch(
        startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
      ),
    ).rejects.toThrow(
      'TSS session interrupted. Try deleting this proposal and creating a new one.',
    );

    const saved = await AsyncStorage.getItem(
      TSS_SESSION_PREFIX + 'txp-1:input0',
    );
    expect(saved).toBeNull();
  });

  it('recovers the signature from the server when start() fails with TSS_ROUND_ALREADY_DONE', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const callbacks = noopCallbacks();
    const txp = makeTxp();

    configureNextTssSign(instance => {
      instance.start.mockRejectedValue(
        new Error('TSS_ROUND_ALREADY_DONE: already done'),
      );
      instance.getSignatureFromServer.mockResolvedValue({r: 'r', s: 's'});
    });

    const result = await store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks}),
    );

    expect(result.status).toBe('accepted');
    expect(callbacks.onComplete).toHaveBeenCalledWith(
      expect.stringContaining('bws-sig('),
    );
  });

  it('rejects with a friendly error when start() fails with TSS_ROUND_ALREADY_DONE and no signature is recoverable', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    configureNextTssSign(instance => {
      instance.start.mockRejectedValue(
        new Error('TSS_ROUND_MESSAGE_EXISTS: dup'),
      );
      instance.getSignatureFromServer.mockResolvedValue(null);
    });

    await expect(
      store.dispatch(
        startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
      ),
    ).rejects.toThrow(
      'TSS session interrupted. Try deleting this proposal and creating a new one.',
    );
  });

  it('rejects with the original error when start() fails for an unrelated reason', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    configureNextTssSign(instance => {
      instance.start.mockRejectedValue(new Error('network unreachable'));
    });

    await expect(
      store.dispatch(
        startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
      ),
    ).rejects.toThrow('network unreachable');
  });

  it('recovers from a mid-session TSS_ROUND_ALREADY_DONE error event via getSignatureFromServer', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const callbacks = noopCallbacks();
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.getSignatureFromServer.mockResolvedValue({r: 'r', s: 's'});
    tssSign.emit('error', new Error('TSS_ROUND_ALREADY_DONE: race'));
    await tick(10);

    const result = await resultPromise;
    expect(result.status).toBe('accepted');
    expect(tssSign.unsubscribe).toHaveBeenCalled();
  });

  it('swallows a mid-session TSS_ROUND_ALREADY_DONE error event when no signature is available yet', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.getSignatureFromServer.mockResolvedValue(null);
    tssSign.emit('error', new Error('TSS_ROUND_ALREADY_DONE: race'));
    await tick(10);

    // Not torn down — the local DKLS round may still complete.
    expect(tssSign.unsubscribe).not.toHaveBeenCalled();

    driveToComplete(tssSign);
    await resultPromise;
  });

  it('swallows TSS_ROUND_TOO_EARLY without rejecting or unsubscribing', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.emit('error', new Error('TSS_ROUND_TOO_EARLY: wait'));
    expect(tssSign.unsubscribe).not.toHaveBeenCalled();

    driveToComplete(tssSign);
    await resultPromise;
  });

  it('rejects and cleans up on a fatal (unrecognized) error event', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.emit('error', new Error('some other protocol error'));

    await expect(resultPromise).rejects.toThrow('some other protocol error');
    expect(tssSign.unsubscribe).toHaveBeenCalled();

    const saved = await AsyncStorage.getItem(
      TSS_SESSION_PREFIX + 'txp-1:input0',
    );
    expect(saved).toBeNull();
  });

  it('rejects with a stall error if no round progress happens for 30s', async () => {
    jest.useFakeTimers();
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.emit('roundready', 1); // arms the 30s stall timer

    await advanceAndFlush(30_000, 30);

    await expect(resultPromise).rejects.toThrow(
      'Signing session stalled waiting for the other co-signer. Please try signing again.',
    );
    expect(tssSign.unsubscribe).toHaveBeenCalled();
  });

  it('recovers from a stall via the server signature if one exists', async () => {
    jest.useFakeTimers();
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.getSignatureFromServer.mockResolvedValue({r: 'r', s: 's'});
    tssSign.emit('roundready', 1);

    await advanceAndFlush(30_000, 30);

    const result = await resultPromise;
    expect(result.status).toBe('accepted');
  });

  it('arms the stall timer immediately when resuming from a saved session', async () => {
    jest.useFakeTimers();
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    await seedSavedSession('txp-1:input0', 'saved-sign-data', 1);

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    // No roundready ever fires — the arm-on-restore path alone must stall out.
    await advanceAndFlush(30_000, 30);

    await expect(resultPromise).rejects.toThrow(
      'Signing session stalled waiting for the other co-signer. Please try signing again.',
    );
  });

  it('signs multiple UTXO inputs sequentially and reports onComplete with the first signature', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet({
      credentials: {
        chain: 'btc',
        network: 'livenet',
        copayerId: 'copayer-1',
        clientDerivedPublicKey: 'xpub-fixture',
      },
    });
    const key = makeTssKeyObj({wallets: [wallet]});
    const callbacks = noopCallbacks();
    const txp = makeTxp({
      chain: 'btc',
      inputPaths: ['m/0/0', 'm/0/1'],
      inputs: [{}, {}],
    });

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks}),
    );
    await tick(20);

    expect(tssSignInstances).toHaveLength(1);
    driveToComplete(tssSignInstances[0]);
    await tick(20);

    expect(tssSignInstances).toHaveLength(2);
    expect(tssSignInstances[1].start).toHaveBeenCalledWith(
      expect.objectContaining({id: 'txp-1:input1'}),
    );
    driveToComplete(tssSignInstances[1]);

    await resultPromise;

    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    expect(wallet.pushSignatures.mock.calls[0][1]).toHaveLength(2);
  });

  it('pushSignatures: swallows race-condition error codes and resolves with the original txp', async () => {
    const store = configureTestStore();
    const raceErr: any = new Error('copayer already voted');
    raceErr.code = 'COPAYER_VOTED';
    const wallet = makeTssWallet({
      pushSignatures: jest.fn((_txp: any, _sigs: any, cb: any) =>
        cb(raceErr, undefined),
      ),
    });
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);
    driveToComplete(tssSignInstances[0]);

    const result = await resultPromise;
    expect(result).toBe(txp);
  });

  it('pushSignatures: swallows race-condition errors identified by bwc.Error name (no code)', async () => {
    const store = configureTestStore();
    const raceErr: any = new Error('tx not accepted');
    raceErr.name = 'bwc.ErrorTX_NOT_ACCEPTED'; // BWS-style error: name, no code
    const wallet = makeTssWallet({
      pushSignatures: jest.fn((_txp: any, _sigs: any, cb: any) =>
        cb(raceErr, undefined),
      ),
    });
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);
    driveToComplete(tssSignInstances[0]);

    const result = await resultPromise;
    expect(result).toBe(txp);
  });

  it('pushSignatures: rethrows non-race-condition errors', async () => {
    const store = configureTestStore();
    const fatalErr: any = new Error('server exploded');
    const wallet = makeTssWallet({
      pushSignatures: jest.fn((_txp: any, _sigs: any, cb: any) =>
        cb(fatalErr, undefined),
      ),
    });
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);
    driveToComplete(tssSignInstances[0]);

    await expect(resultPromise).rejects.toThrow('server exploded');
  });

  it('fires onCopayerStatusChange when the other signer reports copayerReady', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const callbacks = noopCallbacks();
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.emit('copayerReady', 'copayer-2');
    expect(callbacks.onCopayerStatusChange).toHaveBeenCalledWith(
      'copayer-2',
      'signed',
    );

    driveToComplete(tssSign);
    await resultPromise;
  });

  it('restores Buffer-typed keychain shares that were serialized as plain arrays', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({
      wallets: [wallet],
      methods: makeTssKey({
        keychain: {
          privateKeyShare: {data: [1, 2, 3]},
          reducedPrivateKeyShare: {data: [4, 5, 6]},
        },
      }),
    });
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const {tssKey} = tssSignInstances[0].opts;
    expect(Buffer.isBuffer(tssKey.keychain.privateKeyShare)).toBe(true);
    expect([...tssKey.keychain.privateKeyShare]).toEqual([1, 2, 3]);
    expect(Buffer.isBuffer(tssKey.keychain.reducedPrivateKeyShare)).toBe(true);
    expect([...tssKey.keychain.reducedPrivateKeyShare]).toEqual([4, 5, 6]);

    driveToComplete(tssSignInstances[0]);
    await resultPromise;
  });

  it('falls back to marking only self as signed when fetching round-0 participants fails', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet({
      request: {get: jest.fn(() => Promise.reject(new Error('network down')))},
    });
    const key = makeTssKeyObj({wallets: [wallet]});
    const callbacks = noopCallbacks();
    const txp = makeTxp();

    await seedSavedSession('txp-1:input0', 'saved-sign-data', 2);

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks}),
    );
    await tick(20);

    expect(callbacks.onCopayerStatusChange).toHaveBeenCalledWith(
      'copayer-1',
      'signed',
    );

    driveToComplete(tssSignInstances[0], 3);
    await resultPromise;
  });

  it('persists the exported session verbatim, sessionId prefix included', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    configureNextTssSign(instance => {
      instance.exportSession.mockReturnValue('txp-1:input0:the-real-data');
    });

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const saved = await AsyncStorage.getItem(
      TSS_SESSION_PREFIX + 'txp-1:input0',
    );
    expect(JSON.parse(saved!).exported).toBe('txp-1:input0:the-real-data');

    driveToComplete(tssSignInstances[0]);
    await resultPromise;
  });

  it('continues signing (with a warning) when persisting the session after start() fails', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();
    const {logManager} = jest.requireMock('../../../../managers/LogManager');

    configureNextTssSign(instance => {
      instance.exportSession.mockImplementationOnce(() => {
        throw new Error('export failed after start()');
      });
    });

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    expect(logManager.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not export after start()'),
    );

    driveToComplete(tssSignInstances[0]);
    await resultPromise;
  });

  it('continues signing (with a debug log) when exportSession fails at roundprocessed', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();
    const {logManager} = jest.requireMock('../../../../managers/LogManager');

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.exportSession.mockImplementationOnce(() => {
      throw new Error('export failed mid-round');
    });
    tssSign.emit('roundready', 1);
    tssSign.emit('roundprocessed', 1);

    expect(logManager.debug).toHaveBeenCalledWith(
      expect.stringContaining('exportSession skipped at roundprocessed'),
    );

    tssSign.emit('roundsubmitted', 1);
    tssSign.emit('complete');
    await resultPromise;
  });

  it('rejects with a conversion error when getSignature() throws on complete', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.getSignature.mockImplementation(() => {
      throw new Error('malformed signature');
    });
    tssSign.emit('complete');

    await expect(resultPromise).rejects.toThrow(
      'Failed to convert signature: malformed signature',
    );
  });

  it('rejects with the stall message even if getSignatureFromServer itself throws during stall recovery', async () => {
    jest.useFakeTimers();
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.getSignatureFromServer.mockRejectedValue(new Error('network down'));
    tssSign.emit('roundready', 1);

    await advanceAndFlush(30_000, 30);

    await expect(resultPromise).rejects.toThrow(
      'Signing session stalled waiting for the other co-signer. Please try signing again.',
    );
  });

  it('clears the armed stall timer when a mid-session ROUND_ALREADY_DONE error recovers a signature', async () => {
    jest.useFakeTimers();
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.emit('roundready', 1); // arms the 30s stall timer
    tssSign.getSignatureFromServer.mockResolvedValue({r: 'r', s: 's'});
    tssSign.emit('error', new Error('TSS_ROUND_ALREADY_DONE: race'));
    await tick(10);

    const result = await resultPromise;
    expect(result.status).toBe('accepted');

    // A live stall timer would call getSignatureFromServer a second time.
    await advanceAndFlush(30_000, 5);
    expect(tssSign.getSignatureFromServer).toHaveBeenCalledTimes(1);
  });

  it('clears the armed stall timer on a fatal error too', async () => {
    jest.useFakeTimers();
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    const tssSign = tssSignInstances[0];
    tssSign.emit('roundready', 1); // arms the 30s stall timer
    tssSign.emit('error', new Error('some other protocol error'));

    await expect(resultPromise).rejects.toThrow('some other protocol error');

    // A live stall timer would call getSignatureFromServer during recovery.
    await advanceAndFlush(30_000, 5);
    expect(tssSign.getSignatureFromServer).not.toHaveBeenCalled();
  });
});

// ─── joinTSSSigningSession ──────────────────────────────────────────────────

const findShowDecryptAction = (store: any) =>
  store
    .getActions()
    .find((a: any) => a.type === AppActionTypes.SHOW_DECRYPT_PASSWORD_MODAL);

describe('joinTSSSigningSession', () => {
  it('signs and broadcasts successfully (no biometric lock, no encrypted key)', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet], isPrivKeyEncrypted: false});
    const callbacks = noopCallbacks();
    const txp = makeTxp();
    const setShowTSSProgressModal = jest.fn();

    const resultPromise = store.dispatch(
      joinTSSSigningSession({
        key,
        wallet,
        txp,
        callbacks,
        setShowTSSProgressModal,
      }),
    );
    await tick(20);
    driveToComplete(tssSignInstances[0]);

    const result = await resultPromise;

    expect(result.status).toBe('broadcasted');
    expect(callbacks.onStatusChange).toHaveBeenCalledWith('complete');
  });

  it('toggles biometric verification before signing when the app has an active biometric lock', async () => {
    const store = configureTestStore({APP: {biometricLockActive: true}});
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet], isPrivKeyEncrypted: false});
    const setShowTSSProgressModal = jest.fn();

    const {checkBiometricForSending} = jest.requireMock('../send/send');

    const resultPromise = store.dispatch(
      joinTSSSigningSession({
        key,
        wallet,
        txp: makeTxp(),
        callbacks: noopCallbacks(),
        setShowTSSProgressModal,
      }),
    );
    await tick(20);

    expect(setShowTSSProgressModal).toHaveBeenCalledWith(false);
    expect(checkBiometricForSending).toHaveBeenCalled();
    expect(setShowTSSProgressModal).toHaveBeenCalledWith(true);

    driveToComplete(tssSignInstances[0]);
    await resultPromise;
  });

  it('rethrows without ever calling startTSSSigning when the biometric check fails', async () => {
    const store = configureTestStore({APP: {biometricLockActive: true}});
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet], isPrivKeyEncrypted: false});

    const {checkBiometricForSending} = jest.requireMock('../send/send');
    checkBiometricForSending.mockReturnValue(() =>
      Promise.reject(new Error('biometric failed')),
    );

    await expect(
      store.dispatch(
        joinTSSSigningSession({
          key,
          wallet,
          txp: makeTxp(),
          callbacks: noopCallbacks(),
          setShowTSSProgressModal: jest.fn(),
        }),
      ),
    ).rejects.toThrow('biometric failed');

    expect(tssSignInstances).toHaveLength(0);
  });

  it('prompts for the decrypt password when the key is encrypted, and proceeds on a valid password', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet], isPrivKeyEncrypted: true});
    const {checkEncryptPassword} = jest.requireMock('../../utils/wallet');
    checkEncryptPassword.mockReturnValue(true);

    const resultPromise = store.dispatch(
      joinTSSSigningSession({
        key,
        wallet,
        txp: makeTxp(),
        callbacks: noopCallbacks(),
        setShowTSSProgressModal: jest.fn(),
      }),
    );
    await tick(20);

    const showAction = findShowDecryptAction(store);
    expect(showAction).toBeDefined();
    await showAction.payload.onSubmitHandler('the-right-password');
    await tick(20);

    expect(tssSignInstances).toHaveLength(1);
    driveToComplete(tssSignInstances[0]);

    const result = await resultPromise;
    expect(result.status).toBe('broadcasted');
  });

  it('rejects when the entered decrypt password is invalid', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet], isPrivKeyEncrypted: true});
    const {checkEncryptPassword} = jest.requireMock('../../utils/wallet');
    checkEncryptPassword.mockReturnValue(false);

    const resultPromise = store.dispatch(
      joinTSSSigningSession({
        key,
        wallet,
        txp: makeTxp(),
        callbacks: noopCallbacks(),
        setShowTSSProgressModal: jest.fn(),
      }),
    );
    await tick(20);

    const showAction = findShowDecryptAction(store);
    // The rejection surfaces on resultPromise, not on onSubmitHandler itself.
    await showAction.payload.onSubmitHandler('the-wrong-password');

    await expect(resultPromise).rejects.toBe('invalid password');
    expect(tssSignInstances).toHaveLength(0);
  });

  it('rejects with "password canceled" when the user dismisses the decrypt password prompt', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet], isPrivKeyEncrypted: true});

    const resultPromise = store.dispatch(
      joinTSSSigningSession({
        key,
        wallet,
        txp: makeTxp(),
        callbacks: noopCallbacks(),
        setShowTSSProgressModal: jest.fn(),
      }),
    );
    await tick(20);

    const showAction = findShowDecryptAction(store);
    showAction.payload.onCancelHandler();

    await expect(resultPromise).rejects.toBe('password canceled');
  });

  it('falls back to pollTxpUntilBroadcast when broadcastTx fails, and still reports complete', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet], isPrivKeyEncrypted: false});
    const callbacks = noopCallbacks();

    const {broadcastTx, getTx} = jest.requireMock('../send/send');
    broadcastTx.mockRejectedValue(new Error('broadcast failed'));
    getTx
      .mockResolvedValueOnce({status: 'pending'})
      .mockResolvedValueOnce({status: 'broadcasted', id: 'txp-1'});

    const resultPromise = store.dispatch(
      joinTSSSigningSession({
        key,
        wallet,
        txp: makeTxp(),
        callbacks,
        setShowTSSProgressModal: jest.fn(),
      }),
    );
    await tick(20);
    driveToComplete(tssSignInstances[0]);
    await tick(20);

    const result = await resultPromise;
    expect(result.status).toBe('broadcasted');
    expect(callbacks.onStatusChange).toHaveBeenCalledWith('complete');
  });

  it('calls callbacks.onError and rethrows when startTSSSigning fails', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet({tssKeyId: undefined}); // not a TSS wallet
    const key = makeTssKeyObj({
      wallets: [wallet],
      isPrivKeyEncrypted: false,
    });
    const callbacks = noopCallbacks();

    await expect(
      store.dispatch(
        joinTSSSigningSession({
          key,
          wallet,
          txp: makeTxp(),
          callbacks,
          setShowTSSProgressModal: jest.fn(),
        }),
      ),
    ).rejects.toThrow('Key is not a TSS key');

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({message: 'Key is not a TSS key'}),
    );
  });
});

// ─── pollTxpUntilBroadcast ──────────────────────────────────────────────────

describe('pollTxpUntilBroadcast', () => {
  it('resolves as soon as getTx reports a broadcasted status', async () => {
    const wallet = makeTssWallet();
    const {getTx} = jest.requireMock('../send/send');
    getTx
      .mockResolvedValueOnce({status: 'pending'})
      .mockResolvedValueOnce({status: 'pending'})
      .mockResolvedValueOnce({status: 'broadcasted', id: 'txp-1'});

    const result = await pollTxpUntilBroadcast(wallet, 'txp-1');

    expect(result.status).toBe('broadcasted');
    expect(getTx).toHaveBeenCalledTimes(3);
  });

  it('throws a friendly error once every retry is exhausted without a broadcasted status', async () => {
    const wallet = makeTssWallet();
    const {getTx} = jest.requireMock('../send/send');
    getTx.mockResolvedValue({status: 'pending'});

    await expect(pollTxpUntilBroadcast(wallet, 'txp-1')).rejects.toThrow(
      'It seems there was a problem broadcasting the transaction. Please try creating a new one.',
    );
    // delays array has 7 entries in pollTxpUntilBroadcast.
    expect(getTx).toHaveBeenCalledTimes(7);
  });

  it('treats a getTx rejection as "not yet broadcasted" and keeps polling', async () => {
    const wallet = makeTssWallet();
    const {getTx} = jest.requireMock('../send/send');
    getTx
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce({status: 'broadcasted', id: 'txp-1'});

    const result = await pollTxpUntilBroadcast(wallet, 'txp-1');
    expect(result.status).toBe('broadcasted');
  });
});

// ─── Session persistence resilience (AsyncStorage failure branches) ───────

describe('signing session persistence resilience', () => {
  it('keeps signing normally when AsyncStorage.setItem fails while saving the session', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValueOnce(new Error('storage full'));

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);
    driveToComplete(tssSignInstances[0]);

    const result = await resultPromise;
    expect(result.status).toBe('accepted');
  });

  it('treats a broken AsyncStorage.getItem as "no saved session" and starts fresh', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('storage unavailable'));

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);

    expect(tssSignInstances[0].start).toHaveBeenCalled();
    expect(tssSignInstances[0].restoreSession).not.toHaveBeenCalled();

    driveToComplete(tssSignInstances[0]);
    await resultPromise;
  });

  it('does not block completion when clearing the session fails', async () => {
    const store = configureTestStore();
    const wallet = makeTssWallet();
    const key = makeTssKeyObj({wallets: [wallet]});
    const txp = makeTxp();

    jest
      .spyOn(AsyncStorage, 'removeItem')
      .mockRejectedValueOnce(new Error('storage unavailable'));

    const resultPromise = store.dispatch(
      startTSSSigning({key, wallet, txp, callbacks: noopCallbacks()}),
    );
    await tick(20);
    driveToComplete(tssSignInstances[0]);

    const result = await resultPromise;
    expect(result.status).toBe('accepted');
  });
});

// Tests for the TSS wallet-creation ceremony effects (create-multisig.ts).
// BwcProvider is faked with a scriptable event-emitter TssKeyGen; each test
// uses a unique keyId so the module-level activeCeremonies map never leaks.

import _configureTestStore from '@test/store';
import {WalletActionTypes} from '../../wallet.types';
import {
  cancelTSSCeremony,
  encodeJoinerSessionId,
  decodeJoinerSessionId,
  startCreateTSSKey,
  addCoSignerToTSS,
  startTSSCeremony,
  generateJoinerSessionId,
  clearPendingJoinerSession,
  validateJoinCode,
  joinTSSWithCode,
} from './create-multisig';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Shape actually returned by the jest.mock('@test/store') factory below.
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
        notificationsAccepted: false,
        emailNotifications: {accepted: false},
        brazeEid: 'braze-1',
        defaultLanguage: 'en',
        ...(overrides.APP || {}),
      },
      WALLET: {
        tokenOptionsByAddress: {},
        keys: {},
        ...(overrides.WALLET || {}),
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

jest.mock('../../../app/app.effects', () => ({
  subscribePushNotifications: jest.fn(() => () => ({type: 'MOCK_PUSH_NOTIF'})),
  subscribeEmailNotifications: jest.fn(() => () => ({
    type: 'MOCK_EMAIL_NOTIF',
  })),
}));

jest.mock('../address/address', () => ({
  createWalletAddress: jest.fn(() => () => Promise.resolve('mock-address-1')),
}));

// Avoids create.ts's heavy transitive import chain (BWC at module load).
jest.mock('../create/create', () => ({
  createWalletWithOpts: jest.fn(() => () => Promise.resolve({})),
}));

jest.mock('../../utils/wallet', () => ({
  buildKeyObj: jest.fn(({key, wallets, keyName, backupComplete}: any) => ({
    id: 'mock-key-id',
    methods: key,
    wallets: wallets || [],
    keyName,
    backupComplete: backupComplete ?? false,
    isReadOnly: false,
  })),
  buildTssKeyObj: jest.fn(({tssKey, wallets, keyName}: any) => ({
    id: tssKey.id,
    methods: tssKey,
    wallets,
    totalBalance: 0,
    totalBalanceLastDay: 0,
    isPrivKeyEncrypted: tssKey.isPrivKeyEncrypted?.() ?? false,
    backupComplete: false,
    keyName:
      keyName || `TSS Key (${tssKey.metadata?.m}-of-${tssKey.metadata?.n})`,
    hideKeyBalance: false,
    isReadOnly: !tssKey,
  })),
  buildWalletObj: jest.fn((credentials: any) => ({
    ...credentials,
    _isMockWalletObj: true,
  })),
  mapAbbreviationAndName: jest.fn(() => () => ({
    currencyAbbreviation: 'btc',
    currencyName: 'Bitcoin',
  })),
}));

// ─── Fake BWC primitives ────────────────────────────────────────────────────

// Chainable event-emitter fake for TssKeyGen.
function createFakeKeyGen(overrides: any = {}) {
  const handlers: Record<string, (...args: any[]) => void> = {};
  const fake: any = {
    id: overrides.id ?? 'session-id-1',
    m: overrides.m ?? 2,
    n: overrides.n ?? 3,
    partyId: overrides.partyId ?? 0,
    on: jest.fn((event: string, cb: (...args: any[]) => void) => {
      handlers[event] = cb;
      return fake;
    }),
    emit: (event: string, ...args: any[]) => handlers[event]?.(...args),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    newKey: jest.fn(() => Promise.resolve()),
    joinKey: jest.fn(() => Promise.resolve()),
    restoreSession: jest.fn(() => Promise.resolve()),
    exportSession: jest.fn(() => 'exported-session-string'),
    checkJoinCode: jest.fn(() => ({chain: 'btc', network: 'livenet'})),
    createJoinCode: jest.fn(() => 'join-code-abc'),
    getTssKey: jest.fn(() => createFakeTssKey()),
  };
  return Object.assign(fake, overrides);
}

// Stateful: toObj() only carries tssKeyId if addWalletInfo() attached it —
// the exact signal the retry-exhaustion BUG test asserts on.
function createFakeCredentials(initial: any = {}) {
  const state: any = {
    tssKeyId: undefined,
    publicKeyRing: undefined,
    ...initial,
  };
  return {
    requestPubKey: 'request-pub-key-abc',
    copayerId: 'copayer-1',
    xPubKey: 'xpub-abc',
    addWalletInfo: jest.fn(
      (
        _id: any,
        _name: any,
        _m: any,
        _n: any,
        _copayerName: any,
        opts: any = {},
      ) => {
        state.tssKeyId = opts.tssKeyId;
      },
    ),
    addPublicKeyRing: jest.fn((ring: any) => {
      state.publicKeyRing = ring;
    }),
    addWalletPrivateKey: jest.fn(),
    toObj: jest.fn(() => ({...state})),
  };
}

function createFakePartyKey(overrides: any = {}) {
  const partyKey: any = {
    createCredentials: jest.fn((_pw: any, opts: any) =>
      createFakeCredentials(opts),
    ),
    toObj: jest.fn(() => ({__fakePartyKeyObj: true})),
  };
  return Object.assign(partyKey, overrides);
}

function createFakeTssKey(overrides: any = {}) {
  const tssKey: any = {
    id: 'final-tss-key-id',
    metadata: {id: 'session-id-1', m: 2, n: 3, partyId: 0},
    createCredentials: jest.fn((_pw: any, opts: any) =>
      createFakeCredentials(opts),
    ),
    toObj: jest.fn(() => ({metadata: tssKey.metadata})),
    isPrivKeyEncrypted: jest.fn(() => false),
  };
  return Object.assign(tssKey, overrides);
}

// Matches the default getStatus mock so the retry loop succeeds on attempt 1.
const DEFAULT_BWS_WALLET_ID = 'bws-wallet-final';

function createFakeWalletClient(overrides: any = {}) {
  const client: any = {
    credentials: {publicKeyRing: []},
    getStatus: jest.fn((_opts: any, cb: any) =>
      cb(null, {
        wallet: {
          id: DEFAULT_BWS_WALLET_ID,
          copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
          publicKeyRing: [{xPubKey: 'a'}, {xPubKey: 'b'}, {xPubKey: 'c'}],
        },
        customData: {},
      }),
    ),
  };
  // Mirrors BWC: fromObj replaces .credentials (read by the retry loop).
  client.fromObj = jest.fn((obj: any) => {
    client.credentials = obj;
  });
  return Object.assign(client, overrides);
}

let lastKeyGen: any;
let lastPartyKey: any;
let lastWalletClient: any;
let createKeyGenMock: jest.Mock;

jest.mock('../../../../lib/bwc', () => {
  const mockInstance: any = {
    createKey: jest.fn(),
    createKeyGen: jest.fn(),
    getClient: jest.fn(),
    getBitcore: jest.fn(() => ({
      PrivateKey: class {
        toString() {
          return 'wallet-priv-key-str';
        }
      },
    })),
  };
  return {
    BwcProvider: {
      getInstance: jest.fn(() => mockInstance),
      API: {},
      instance: mockInstance,
    },
    __mockInstance: mockInstance,
  };
});

const {__mockInstance: mockBwcInstance} = jest.requireMock(
  '../../../../lib/bwc',
) as any;

beforeEach(() => {
  jest.clearAllMocks();

  lastPartyKey = createFakePartyKey();
  mockBwcInstance.createKey.mockImplementation(() => lastPartyKey);

  lastKeyGen = createFakeKeyGen();
  createKeyGenMock = mockBwcInstance.createKeyGen.mockImplementation(
    () => lastKeyGen,
  );

  lastWalletClient = createFakeWalletClient();
  mockBwcInstance.getClient.mockImplementation(() => lastWalletClient);
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

// @jest/fake-timers 28 lacks advanceTimersByTimeAsync — interleave manually.
const advanceAndFlush = async (ms: number, steps = 10) => {
  const stepMs = Math.max(1, Math.floor(ms / steps));
  for (let i = 0; i < steps; i++) {
    jest.advanceTimersByTime(stepMs);
    await tick(3);
  }
};

// ─── encodeJoinerSessionId / decodeJoinerSessionId ─────────────────────────

describe('encodeJoinerSessionId / decodeJoinerSessionId', () => {
  it('round-trips a JoinerSessionId through base64', () => {
    const data = {pubKey: 'pub-key-1', name: 'Alice'};
    const encoded = encodeJoinerSessionId(data);
    const decoded = decodeJoinerSessionId(encoded);
    expect(decoded).toEqual(data);
  });

  it('round-trips when name is omitted', () => {
    const data = {pubKey: 'pub-key-2'};
    const decoded = decodeJoinerSessionId(encodeJoinerSessionId(data));
    expect(decoded).toEqual(data);
  });
});

// ─── cancelTSSCeremony ──────────────────────────────────────────────────────

describe('cancelTSSCeremony', () => {
  it('is a no-op when there is no active ceremony for the keyId', () => {
    const store = configureTestStore();
    expect(() =>
      store.dispatch(cancelTSSCeremony('key-never-started')),
    ).not.toThrow();
  });

  it('unsubscribes and removes the active ceremony for the keyId', async () => {
    const store = configureTestStore();
    const keyId = 'key-cancel-1';

    store.setState({
      WALLET: {
        tokenOptionsByAddress: {},
        keys: {
          [keyId]: makeKeyWithSession(keyId, {
            status: 'ready_to_start',
          }),
        },
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    store.dispatch(cancelTSSCeremony(keyId));

    expect(lastKeyGen.unsubscribe).toHaveBeenCalled();
    resultPromise.catch(() => {});
  });
});

// ─── startCreateTSSKey ──────────────────────────────────────────────────────

describe('startCreateTSSKey', () => {
  const baseOpts = {
    coin: 'btc',
    chain: 'btc',
    network: 'livenet',
    m: 2,
    n: 3,
    myName: 'Alice',
    walletName: 'Shared Wallet',
  };

  it('creates a placeholder key with a collecting_copayers tssSession', async () => {
    const store = configureTestStore();
    lastKeyGen.id = 'new-session-id';

    const {key} = await store.dispatch(startCreateTSSKey(baseOpts));

    expect(lastKeyGen.newKey).toHaveBeenCalledWith({
      m: 2,
      n: 3,
      password: undefined,
    });
    expect(key.tssSession).toMatchObject({
      id: 'new-session-id',
      isCreator: true,
      partyId: 0,
      status: 'collecting_copayers',
      m: 2,
      n: 3,
      myName: 'Alice',
      walletName: 'Shared Wallet',
    });
  });

  it('builds n-1 pending copayer placeholders', async () => {
    const store = configureTestStore();
    const {key} = await store.dispatch(startCreateTSSKey(baseOpts));

    expect(key.tssSession!.copayers!).toHaveLength(2);
    expect(
      key.tssSession!.copayers!.every((c: any) => c.status === 'pending'),
    ).toBe(true);
    expect(key.tssSession!.copayers!.map((c: any) => c.partyId)).toEqual([
      1, 2,
    ]);
  });

  it('marks the placeholder wallet as pendingTssSession and gives it a pending- id', async () => {
    const store = configureTestStore();
    const {key} = await store.dispatch(startCreateTSSKey(baseOpts));

    expect(key.wallets[0].pendingTssSession).toBe(true);
    expect(key.wallets[0].id).toBe(`pending-tss-${key.id}-btc`);
  });

  it('maps chain "pol" to "matic" before creating the key gen', async () => {
    const store = configureTestStore();
    await store.dispatch(startCreateTSSKey({...baseOpts, chain: 'pol'}));

    // The patched BWC TssKeyGen requires `coin` (throws without it).
    expect(createKeyGenMock).toHaveBeenCalledWith(
      expect.objectContaining({chain: 'matic', coin: 'btc'}),
    );
  });

  it('dispatches successCreateKey with the built key', async () => {
    const store = configureTestStore();
    await store.dispatch(startCreateTSSKey(baseOpts));

    const actions = store.getActions();
    expect(
      actions.some((a: any) => a.type === WalletActionTypes.SUCCESS_CREATE_KEY),
    ).toBe(true);
  });

  it('propagates and logs errors from newKey()', async () => {
    const store = configureTestStore();
    lastKeyGen.newKey.mockRejectedValueOnce(new Error('network down'));

    await expect(store.dispatch(startCreateTSSKey(baseOpts))).rejects.toThrow(
      'network down',
    );
  });
});

// ─── addCoSignerToTSS ───────────────────────────────────────────────────────

function makeKeyWithSession(keyId: string, overrides: any = {}) {
  return {
    id: keyId,
    wallets: [{id: `pending-tss-${keyId}-btc`, pendingTssSession: true}],
    tssSession: {
      id: 'session-1',
      partyKey: {__fakePartyKeyObj: true},
      sessionExport: 'exported-session',
      coin: 'btc',
      chain: 'btc',
      network: 'livenet',
      m: 2,
      n: 3,
      myName: 'Alice',
      walletName: 'Shared Wallet',
      createdAt: Date.now(),
      isCreator: true,
      partyId: 0,
      status: 'collecting_copayers',
      copayers: [
        {partyId: 1, pubKey: '', name: 'Co-Signer 2', status: 'pending'},
        {partyId: 2, pubKey: '', name: 'Co-Signer 3', status: 'pending'},
      ],
      creatorPubKey: 'creator-pub-key',
      ...overrides,
    },
  };
}

describe('addCoSignerToTSS', () => {
  it('throws when the key has no tssSession', async () => {
    const store = configureTestStore({
      WALLET: {keys: {'key-1': {id: 'key-1'}}},
    });

    await expect(
      store.dispatch(
        addCoSignerToTSS({
          keyId: 'key-1',
          joinerSessionId: encodeJoinerSessionId({pubKey: 'p'}),
          partyId: 1,
        }),
      ),
    ).rejects.toThrow('Key not found or no TSS session');
  });

  it('throws when the caller is not the ceremony creator', async () => {
    const keyId = 'key-not-creator';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {isCreator: false})},
      },
    });

    await expect(
      store.dispatch(
        addCoSignerToTSS({
          keyId,
          joinerSessionId: encodeJoinerSessionId({pubKey: 'p'}),
          partyId: 1,
        }),
      ),
    ).rejects.toThrow('Only creator can add co-signers');
  });

  it('throws when the co-signer pubKey was already invited', async () => {
    const keyId = 'key-dup';
    const store = configureTestStore({
      WALLET: {
        keys: {
          [keyId]: makeKeyWithSession(keyId, {
            copayers: [
              {
                partyId: 1,
                pubKey: 'dup-pub-key',
                name: 'Co-Signer 2',
                status: 'invited',
              },
              {partyId: 2, pubKey: '', name: 'Co-Signer 3', status: 'pending'},
            ],
          }),
        },
      },
    });

    await expect(
      store.dispatch(
        addCoSignerToTSS({
          keyId,
          joinerSessionId: encodeJoinerSessionId({pubKey: 'dup-pub-key'}),
          partyId: 2,
        }),
      ),
    ).rejects.toThrow('This co-signer has already been invited');
  });

  it('creates a join code and marks the copayer as invited', async () => {
    const keyId = 'key-invite-1';
    const store = configureTestStore({
      WALLET: {keys: {[keyId]: makeKeyWithSession(keyId)}},
    });
    lastKeyGen.createJoinCode.mockReturnValue('the-join-code');

    const {joinCode} = await store.dispatch(
      addCoSignerToTSS({
        keyId,
        joinerSessionId: encodeJoinerSessionId({
          pubKey: 'joiner-pub-key',
          name: 'Bob',
        }),
        partyId: 1,
      }),
    );

    expect(joinCode).toBe('the-join-code');
    expect(lastKeyGen.restoreSession).toHaveBeenCalledWith({
      session: 'exported-session',
    });
    expect(lastKeyGen.createJoinCode).toHaveBeenCalledWith({
      partyId: 1,
      partyPubKey: 'joiner-pub-key',
      opts: {encoding: 'base64'},
    });

    const updateAction = store
      .getActions()
      .find((a: any) => a.type === WalletActionTypes.SUCCESS_UPDATE_KEY);
    const updatedCopayers = updateAction.payload.key.tssSession!.copayers!;
    const invited = updatedCopayers.find((c: any) => c.partyId === 1);
    expect(invited.status).toBe('invited');
    expect(invited.pubKey).toBe('joiner-pub-key');
    expect(invited.name).toBe('Bob');
    expect(invited.joinCode).toBe('the-join-code');
  });

  it('falls back to a default co-signer name when the joiner sent none', async () => {
    const keyId = 'key-invite-2';
    const store = configureTestStore({
      WALLET: {keys: {[keyId]: makeKeyWithSession(keyId)}},
    });

    await store.dispatch(
      addCoSignerToTSS({
        keyId,
        joinerSessionId: encodeJoinerSessionId({pubKey: 'joiner-pub-key'}),
        partyId: 1,
      }),
    );

    const updateAction = store
      .getActions()
      .find((a: any) => a.type === WalletActionTypes.SUCCESS_UPDATE_KEY);
    const invited = updateAction.payload.key.tssSession!.copayers!.find(
      (c: any) => c.partyId === 1,
    );
    expect(invited.name).toBe('Co-Signer 1');
  });

  it('moves status to ready_to_start once every copayer is invited', async () => {
    const keyId = 'key-last-invite';
    const store = configureTestStore({
      WALLET: {
        keys: {
          [keyId]: makeKeyWithSession(keyId, {
            copayers: [
              {
                partyId: 1,
                pubKey: 'p1',
                name: 'Co-Signer 2',
                status: 'invited',
              },
              {partyId: 2, pubKey: '', name: 'Co-Signer 3', status: 'pending'},
            ],
          }),
        },
      },
    });

    await store.dispatch(
      addCoSignerToTSS({
        keyId,
        joinerSessionId: encodeJoinerSessionId({pubKey: 'p2'}),
        partyId: 2,
      }),
    );

    const updateAction = store
      .getActions()
      .find((a: any) => a.type === WalletActionTypes.SUCCESS_UPDATE_KEY);
    expect(updateAction.payload.key.tssSession.status).toBe('ready_to_start');
  });

  it('keeps status as collecting_copayers when some copayers are still pending', async () => {
    const keyId = 'key-partial-invite';
    const store = configureTestStore({
      WALLET: {keys: {[keyId]: makeKeyWithSession(keyId)}},
    });

    await store.dispatch(
      addCoSignerToTSS({
        keyId,
        joinerSessionId: encodeJoinerSessionId({pubKey: 'p1'}),
        partyId: 1,
      }),
    );

    const updateAction = store
      .getActions()
      .find((a: any) => a.type === WalletActionTypes.SUCCESS_UPDATE_KEY);
    expect(updateAction.payload.key.tssSession.status).toBe(
      'collecting_copayers',
    );
  });
});

// ─── generateJoinerSessionId / clearPendingJoinerSession / validateJoinCode ─

describe('generateJoinerSessionId', () => {
  it('creates a party key, persists a pending session and returns sessionId+partyKey', async () => {
    const store = configureTestStore();
    lastPartyKey.createCredentials = jest.fn(() => ({
      requestPubKey: 'joiner-pub-key-1',
    }));
    lastPartyKey.toObj = jest.fn(() => ({__fakePartyKeyObj: true}));

    const {sessionId, partyKey} = await store.dispatch(
      generateJoinerSessionId({name: 'Bob'}),
    );

    expect(decodeJoinerSessionId(sessionId)).toEqual({
      pubKey: 'joiner-pub-key-1',
      name: 'Bob',
    });
    expect(partyKey).toEqual({__fakePartyKeyObj: true});

    const setAction = store
      .getActions()
      .find(
        (a: any) => a.type === WalletActionTypes.SET_PENDING_JOINER_SESSION,
      );
    expect(setAction.payload).toMatchObject({
      sessionId,
      partyKey: {__fakePartyKeyObj: true},
      copayerName: 'Bob',
    });
  });

  it('works without an optional name', async () => {
    const store = configureTestStore();
    const {sessionId} = await store.dispatch(generateJoinerSessionId());
    expect(decodeJoinerSessionId(sessionId).name).toBeUndefined();
  });

  it('logs and rethrows when building the party key credentials fails', async () => {
    const store = configureTestStore();
    lastPartyKey.createCredentials = jest.fn(() => {
      throw new Error('failed to derive pub key');
    });

    await expect(
      store.dispatch(generateJoinerSessionId({name: 'Bob'})),
    ).rejects.toThrow('failed to derive pub key');
  });
});

describe('clearPendingJoinerSession', () => {
  it('dispatches removePendingJoinerSession', () => {
    const store = configureTestStore();
    store.dispatch(clearPendingJoinerSession());

    expect(
      store
        .getActions()
        .some(
          (a: any) =>
            a.type === WalletActionTypes.REMOVE_PENDING_JOINER_SESSION,
        ),
    ).toBe(true);
  });
});

describe('validateJoinCode', () => {
  it('delegates to tssKeyGen.checkJoinCode with base64 encoding', () => {
    const store = configureTestStore();
    store.dispatch(validateJoinCode('the-code', {__fakePartyKeyObj: true}));

    expect(lastKeyGen.checkJoinCode).toHaveBeenCalledWith({
      code: 'the-code',
      opts: {encoding: 'base64'},
    });
  });

  it('propagates errors thrown by checkJoinCode', () => {
    const store = configureTestStore();
    lastKeyGen.checkJoinCode.mockImplementation(() => {
      throw new Error('bad code');
    });

    expect(() =>
      store.dispatch(validateJoinCode('bad', {__fakePartyKeyObj: true})),
    ).toThrow('bad code');
  });
});

// ─── startTSSCeremony (leader) ──────────────────────────────────────────────

describe('startTSSCeremony', () => {
  it('throws when the key has no tssSession', async () => {
    const keyId = 'ceremony-no-session';
    const store = configureTestStore({WALLET: {keys: {[keyId]: {id: keyId}}}});

    await expect(store.dispatch(startTSSCeremony(keyId))).rejects.toThrow(
      'Key not found or no TSS session',
    );
  });

  it('throws when not all co-signers have been invited', async () => {
    const keyId = 'ceremony-not-ready';
    const store = configureTestStore({
      WALLET: {
        keys: {
          [keyId]: makeKeyWithSession(keyId, {status: 'collecting_copayers'}),
        },
      },
    });

    await expect(store.dispatch(startTSSCeremony(keyId))).rejects.toThrow(
      'Not all co-signers have been invited',
    );
  });

  it('rejects with CEREMONY_ALREADY_RUNNING when called twice for the same keyId', async () => {
    const keyId = 'ceremony-already-running';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    const first = store.dispatch(startTSSCeremony(keyId));
    const second = store.dispatch(startTSSCeremony(keyId));

    await expect(second).rejects.toThrow('CEREMONY_ALREADY_RUNNING');

    // Let the first ceremony register its handlers, then drive it to completion.
    await tick();
    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');
    await first.catch(() => {});
  });

  it('rejects with CEREMONY_CANCELLED when cancelTSSCeremony runs during restoreSession', async () => {
    const keyId = 'ceremony-cancelled';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    // Cancel before the restoreSession() microtask resumes (navigate-away race).
    store.dispatch(cancelTSSCeremony(keyId));

    await expect(resultPromise).rejects.toThrow('CEREMONY_CANCELLED');
  });

  it('marks the tssSession as ceremony_in_progress as soon as the ceremony registers', async () => {
    const keyId = 'ceremony-in-progress-flag';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    const progressAction = store
      .getActions()
      .find((a: any) => a.type === WalletActionTypes.SUCCESS_UPDATE_KEY);
    expect(progressAction.payload.key.tssSession.status).toBe(
      'ceremony_in_progress',
    );

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');
    await resultPromise;
  });

  it('completes successfully: sets tssKeyId from the wallet event and marks tssSession complete', async () => {
    const keyId = 'ceremony-success';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.emit('roundready', 1);
    lastKeyGen.emit('roundready', 2);
    lastKeyGen.emit('roundsubmitted', 2);
    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      name: 'Shared Wallet',
      m: 2,
      n: 3,
      tssKeyId: 'server-assigned-tss-key-id',
      addressType: 'P2WSH',
      publicKeyRing: [{xPubKey: 'a'}, {xPubKey: 'b'}],
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');

    const finalKey = await resultPromise;

    // The patched BWC TssKeyGen requires `coin` (throws without it).
    expect(createKeyGenMock).toHaveBeenCalledWith(
      expect.objectContaining({coin: 'btc', chain: 'btc', network: 'livenet'}),
    );
    expect(finalKey.wallets[0].tssKeyId).toBe('server-assigned-tss-key-id');
    expect(finalKey.wallets[0].pendingTssSession).toBeUndefined();
    expect(finalKey.tssSession!.status).toBe('complete');
    expect(finalKey.tssSession!.sessionExport).toBeUndefined();
    expect(lastKeyGen.unsubscribe).toHaveBeenCalled();
  });

  it('continues (without throwing) when refreshWalletWithRetry exhausts all retries', async () => {
    jest.useFakeTimers();
    const keyId = 'ceremony-retry-exhausted';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    // Server never reports the full copayer set on any status refresh.
    lastWalletClient.getStatus = jest.fn((_opts: any, cb: any) =>
      cb(null, {
        wallet: {id: DEFAULT_BWS_WALLET_ID, copayers: [{id: 'c1'}]},
      }),
    );

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      tssKeyId: 'server-assigned-tss-key-id',
      copayers: [],
    });
    lastKeyGen.emit('complete');

    for (let i = 0; i < 5; i++) {
      await advanceAndFlush(1000);
    }

    const finalKey = await resultPromise;

    // The leader attaches tssKeyId (addWalletInfo) before the retry loop runs.
    expect(finalKey.wallets[0].tssKeyId).toBe('server-assigned-tss-key-id');
    expect(lastWalletClient.getStatus).toHaveBeenCalledTimes(5);
  });

  it('rejects with CEREMONY_TIMEOUT if the ceremony never completes after round 2 is ready', async () => {
    jest.useFakeTimers();
    const keyId = 'ceremony-timeout';
    const store = configureTestStore({
      WALLET: {
        keys: {
          [keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start', n: 3}),
        },
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.emit('roundready', 1);
    lastKeyGen.emit('roundready', 2); // arms the n * 60_000ms timeout

    await advanceAndFlush(180_000, 30);

    await expect(resultPromise).rejects.toThrow('CEREMONY_TIMEOUT');
    expect(lastKeyGen.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('rejects with CEREMONY_STUCK after 10 consecutive TSS_ROUND_ALREADY_DONE errors', async () => {
    const keyId = 'ceremony-stuck';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    for (let i = 0; i < 10; i++) {
      lastKeyGen.emit('error', new Error('TSS_ROUND_ALREADY_DONE'));
    }

    await expect(resultPromise).rejects.toThrow('CEREMONY_STUCK');
  });

  it('swallows TSS_ROUND_MESSAGE_EXISTS / TSS_ROUND_ALREADY_DONE errors below the stuck threshold', async () => {
    const keyId = 'ceremony-swallow';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.emit('error', new Error('TSS_ROUND_MESSAGE_EXISTS'));
    for (let i = 0; i < 9; i++) {
      lastKeyGen.emit('error', new Error('TSS_ROUND_ALREADY_DONE'));
    }
    // roundsubmitted resets the stuck counter.
    lastKeyGen.emit('roundsubmitted', 1);
    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');

    const finalKey = await resultPromise;
    expect(finalKey.tssSession!.status).toBe('complete');
  });

  it('rejects with CEREMONY_TIMEOUT when BWS reports the session expired', async () => {
    const keyId = 'ceremony-expired';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.emit(
      'error',
      new Error('TSS_SESSION_EXPIRED: TSS session has expired'),
    );

    await expect(resultPromise).rejects.toThrow('CEREMONY_TIMEOUT');
    expect(lastKeyGen.unsubscribe).toHaveBeenCalled();
  });

  it('rejects with CEREMONY_VERSION_MISMATCH when BWS reports a TSS version mismatch', async () => {
    const keyId = 'ceremony-version';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.emit(
      'error',
      new Error('TSS_MISMATCH_VERSION: TSS version does not match'),
    );

    await expect(resultPromise).rejects.toThrow('CEREMONY_VERSION_MISMATCH');
    expect(lastKeyGen.unsubscribe).toHaveBeenCalled();
  });

  it('rejects with the original error on a fatal (non-reconnection) error and cleans up', async () => {
    const keyId = 'ceremony-fatal';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.emit('error', new Error('some fatal network error'));

    await expect(resultPromise).rejects.toThrow('some fatal network error');
    expect(lastKeyGen.unsubscribe).toHaveBeenCalled();

    const secondAttempt = store.dispatch(startTSSCeremony(keyId));
    await tick();
    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');
    await expect(secondAttempt).resolves.toBeDefined();
  });

  it('throws when the wallet event never fires before complete', async () => {
    const keyId = 'ceremony-no-wallet';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.emit('complete');

    await expect(resultPromise).rejects.toThrow('Failed to get TSS wallet');
  });

  it('throws when tssKeyGen.getTssKey() returns falsy after the wallet event fires', async () => {
    const keyId = 'ceremony-no-tsskey';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });
    lastKeyGen.getTssKey.mockReturnValue(null);

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');

    await expect(resultPromise).rejects.toThrow('Failed to get TSS key');
  });

  it('checkpoints tssSession.sessionExport on roundprocessed too', async () => {
    const keyId = 'ceremony-roundprocessed-checkpoint';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.exportSession.mockReturnValue('leader-checkpoint-round-1');
    lastKeyGen.emit('roundprocessed', 1);

    const checkpointAction = store
      .getActions()
      .filter((a: any) => a.type === WalletActionTypes.SUCCESS_UPDATE_KEY)
      .pop();
    expect(checkpointAction.payload.key.tssSession.sessionExport).toBe(
      'leader-checkpoint-round-1',
    );

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');
    await resultPromise;
  });

  it('subscribes to push and email notifications when accepted', async () => {
    const keyId = 'ceremony-notifications';
    const store = configureTestStore({
      APP: {
        notificationsAccepted: true,
        emailNotifications: {accepted: true, email: 'user@example.com'},
        brazeEid: 'braze-42',
        defaultLanguage: 'en',
      },
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });
    const {subscribePushNotifications, subscribeEmailNotifications} =
      jest.requireMock('../../../app/app.effects');

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');
    await resultPromise;

    expect(subscribePushNotifications).toHaveBeenCalledWith(
      expect.anything(),
      'braze-42',
    );
    expect(subscribeEmailNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({email: 'user@example.com'}),
    );
  });

  it('logs a warning and keeps retrying when getStatus reports an error during refreshWalletWithRetry', async () => {
    jest.useFakeTimers();
    const keyId = 'ceremony-getstatus-error';
    const store = configureTestStore({
      WALLET: {
        keys: {[keyId]: makeKeyWithSession(keyId, {status: 'ready_to_start'})},
      },
    });

    let call = 0;
    lastWalletClient.getStatus = jest.fn((_opts: any, cb: any) => {
      call += 1;
      if (call === 1) {
        return cb(new Error('temporary network error'));
      }
      return cb(null, {
        wallet: {
          id: DEFAULT_BWS_WALLET_ID,
          copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
          publicKeyRing: [{xPubKey: 'a'}, {xPubKey: 'b'}, {xPubKey: 'c'}],
        },
      });
    });

    const resultPromise = store.dispatch(startTSSCeremony(keyId));
    await tick();

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');

    // Flush microtasks so the retry backoff timer exists before advancing time.
    await tick(30);
    await advanceAndFlush(1000);
    await advanceAndFlush(1000);

    const finalKey = await resultPromise;
    expect(finalKey.tssSession!.status).toBe('complete');
    expect(lastWalletClient.getStatus).toHaveBeenCalledTimes(2);
  });
});

// ─── joinTSSWithCode (joiner: fresh join + resume) ─────────────────────────

const freshJoinOpts = () => ({
  joinCode: 'the-join-code',
  partyKey: {__fakePartyKeyObj: true},
  myName: 'Bob',
});

describe('joinTSSWithCode — fresh join', () => {
  it('throws when joinCode, partyKey or myName are missing', async () => {
    const store = configureTestStore();

    await expect(
      store.dispatch(joinTSSWithCode({myName: 'Bob'})),
    ).rejects.toThrow(
      'joinCode, partyKey, and myName are required for initial join',
    );
  });

  it('decodes the join code, creates a placeholder key and marks it ceremony_in_progress', async () => {
    const store = configureTestStore();

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    expect(lastKeyGen.joinKey).toHaveBeenCalledWith({
      code: 'the-join-code',
      opts: {encoding: 'base64'},
    });
    // The patched BWC TssKeyGen requires `coin` (throws without it).
    expect(createKeyGenMock).toHaveBeenLastCalledWith(
      expect.objectContaining({coin: 'btc', chain: 'btc', network: 'livenet'}),
    );

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');
    await resultPromise;

    const createAction = store
      .getActions()
      .find((a: any) => a.type === WalletActionTypes.SUCCESS_CREATE_KEY);
    expect(createAction.payload.key.tssSession).toMatchObject({
      isCreator: false,
      status: 'ceremony_in_progress',
    });
  });

  it('rejects with CEREMONY_CANCELLED when cancelled during joinKey()', async () => {
    const store = configureTestStore();

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    // The joinCode is the sentinel registry key until the real keyId exists.
    store.dispatch(cancelTSSCeremony('the-join-code'));

    await expect(resultPromise).rejects.toThrow('CEREMONY_CANCELLED');
  });

  it('completes successfully and sets tssKeyId when the retry loop confirms all copayers', async () => {
    const store = configureTestStore();

    // The joiner's tssKeyId arrives via the status refresh, not the 'wallet' event.
    lastWalletClient.getStatus = jest.fn((_opts: any, cb: any) =>
      cb(null, {
        wallet: {
          id: DEFAULT_BWS_WALLET_ID,
          copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
          publicKeyRing: [{xPubKey: 'a'}, {xPubKey: 'b'}, {xPubKey: 'c'}],
          tssKeyId: 'joiner-server-assigned-tss-key-id',
          addressType: 'P2WSH',
        },
        customData: {},
      }),
    );

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');

    const finalKey = await resultPromise;

    expect(finalKey.wallets[0].tssKeyId).toBe(
      'joiner-server-assigned-tss-key-id',
    );
    expect(finalKey.wallets[0].pendingTssSession).toBeUndefined();
    expect(finalKey.tssSession!.status).toBe('complete');
  });

  it('BUG: leaves tssKeyId undefined when refreshWalletWithRetry exhausts all retries — even though the wallet is no longer flagged pendingTssSession', async () => {
    jest.useFakeTimers();
    const store = configureTestStore();

    // Server never confirms the full copayer set, so the joiner's
    // addWalletInfo() (retry-loop success branch) never runs.
    lastWalletClient.getStatus = jest.fn((_opts: any, cb: any) =>
      cb(null, {
        wallet: {id: DEFAULT_BWS_WALLET_ID, copayers: [{id: 'c1'}]},
        customData: {},
      }),
    );

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [],
    });
    lastKeyGen.emit('complete');

    for (let i = 0; i < 5; i++) {
      await advanceAndFlush(1000);
    }

    const finalKey = await resultPromise;

    expect(lastWalletClient.getStatus).toHaveBeenCalledTimes(5);
    // The ceremony "completes" and drops the pending flag, yet tssKeyId is gone.
    expect(finalKey.wallets[0].pendingTssSession).toBeUndefined();
    expect(finalKey.tssSession!.status).toBe('complete');
    expect(finalKey.wallets[0].tssKeyId).toBeUndefined();
  });

  it('rejects with CEREMONY_STUCK after 20 consecutive TSS_ROUND_ALREADY_DONE errors', async () => {
    const store = configureTestStore();

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    for (let i = 0; i < 20; i++) {
      lastKeyGen.emit('error', new Error('TSS_ROUND_ALREADY_DONE'));
    }

    await expect(resultPromise).rejects.toThrow('CEREMONY_STUCK');
  });

  it('swallows a "Copayer ID already registered" reconnection error without rejecting', async () => {
    const store = configureTestStore();

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit('error', new Error('Copayer ID already registered'));
    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');

    const finalKey = await resultPromise;
    expect(finalKey.tssSession!.status).toBe('complete');
  });

  it('rejects with CEREMONY_TIMEOUT when BWS reports the session expired', async () => {
    const store = configureTestStore();

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit(
      'error',
      new Error('TSS_SESSION_EXPIRED: TSS session has expired'),
    );

    await expect(resultPromise).rejects.toThrow('CEREMONY_TIMEOUT');
    expect(lastKeyGen.unsubscribe).toHaveBeenCalled();
  });

  it('rejects with CEREMONY_VERSION_MISMATCH when BWS reports a TSS version mismatch', async () => {
    const store = configureTestStore();

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit(
      'error',
      new Error('TSS_MISMATCH_VERSION: TSS version does not match'),
    );

    await expect(resultPromise).rejects.toThrow('CEREMONY_VERSION_MISMATCH');
    expect(lastKeyGen.unsubscribe).toHaveBeenCalled();
  });

  it('maps an expired-session rejection from the awaited joinKey() call', async () => {
    const store = configureTestStore();
    lastKeyGen.joinKey.mockRejectedValueOnce(
      new Error('TSS_SESSION_EXPIRED: TSS session has expired'),
    );

    await expect(
      store.dispatch(joinTSSWithCode(freshJoinOpts())),
    ).rejects.toThrow('CEREMONY_TIMEOUT');
  });

  it('rejects with the original error on a fatal error and cleans up the registry', async () => {
    const store = configureTestStore();

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit('error', new Error('some fatal join error'));

    await expect(resultPromise).rejects.toThrow('some fatal join error');

    const secondAttempt = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();
    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');
    await expect(secondAttempt).resolves.toBeDefined();
  });

  it('throws when the wallet event never fires before complete', async () => {
    const store = configureTestStore();

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit('complete');

    await expect(resultPromise).rejects.toThrow('Failed to get TSS wallet');
  });

  it('throws when tssKeyGen.getTssKey() returns falsy after the wallet event fires', async () => {
    const store = configureTestStore();
    lastKeyGen.getTssKey.mockReturnValue(null);

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');

    await expect(resultPromise).rejects.toThrow('Failed to get TSS key');
  });

  it('adds the wallet private key when the server status includes customData.walletPrivKey', async () => {
    const store = configureTestStore();
    const fixedTssKey = createFakeTssKey();
    lastKeyGen.getTssKey.mockReturnValue(fixedTssKey);

    lastWalletClient.getStatus = jest.fn((_opts: any, cb: any) =>
      cb(null, {
        wallet: {
          id: DEFAULT_BWS_WALLET_ID,
          copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
          publicKeyRing: [{xPubKey: 'a'}, {xPubKey: 'b'}, {xPubKey: 'c'}],
        },
        customData: {walletPrivKey: 'the-wallet-priv-key'},
      }),
    );

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');
    await resultPromise;

    const credentials = fixedTssKey.createCredentials.mock.results[0].value;
    expect(credentials.addWalletPrivateKey).toHaveBeenCalledWith(
      'the-wallet-priv-key',
    );
  });

  it('subscribes to push and email notifications when accepted', async () => {
    const store = configureTestStore({
      APP: {
        notificationsAccepted: true,
        emailNotifications: {accepted: true, email: 'joiner@example.com'},
        brazeEid: 'braze-joiner',
        defaultLanguage: 'en',
      },
    });
    const {subscribePushNotifications, subscribeEmailNotifications} =
      jest.requireMock('../../../app/app.effects');

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');
    await resultPromise;

    expect(subscribePushNotifications).toHaveBeenCalledWith(
      expect.anything(),
      'braze-joiner',
    );
    expect(subscribeEmailNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({email: 'joiner@example.com'}),
    );
  });

  it('rejects with CEREMONY_TIMEOUT if the ceremony never completes after round 2 is ready', async () => {
    jest.useFakeTimers();
    const store = configureTestStore();

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit('roundready', 1);
    lastKeyGen.emit('roundready', 2); // arms the n * 60_000ms timeout

    await tick(30);
    await advanceAndFlush(180_000, 30);

    await expect(resultPromise).rejects.toThrow('CEREMONY_TIMEOUT');
  });

  it('logs a warning and keeps retrying when getStatus reports an error during refreshWalletWithRetry', async () => {
    jest.useFakeTimers();
    const store = configureTestStore();

    let call = 0;
    lastWalletClient.getStatus = jest.fn((_opts: any, cb: any) => {
      call += 1;
      if (call === 1) {
        return cb(new Error('temporary network error'));
      }
      return cb(null, {
        wallet: {
          id: DEFAULT_BWS_WALLET_ID,
          copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
          publicKeyRing: [{xPubKey: 'a'}, {xPubKey: 'b'}, {xPubKey: 'c'}],
        },
        customData: {},
      });
    });

    const resultPromise = store.dispatch(joinTSSWithCode(freshJoinOpts()));
    await tick();

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');

    await tick(30);
    await advanceAndFlush(1000);
    await advanceAndFlush(1000);

    const finalKey = await resultPromise;
    expect(finalKey.tssSession!.status).toBe('complete');
    expect(lastWalletClient.getStatus).toHaveBeenCalledTimes(2);
  });
});

describe('joinTSSWithCode — resume', () => {
  it('throws when the key has no tssSession', async () => {
    const keyId = 'resume-no-session';
    const store = configureTestStore({WALLET: {keys: {[keyId]: {id: keyId}}}});

    await expect(store.dispatch(joinTSSWithCode({keyId}))).rejects.toThrow(
      'Key not found or no TSS session',
    );
  });

  it('throws when the tssSession status is not ceremony_in_progress', async () => {
    const keyId = 'resume-wrong-status';
    const store = configureTestStore({
      WALLET: {
        keys: {
          [keyId]: makeKeyWithSession(keyId, {
            isCreator: false,
            status: 'collecting_copayers',
          }),
        },
      },
    });

    await expect(store.dispatch(joinTSSWithCode({keyId}))).rejects.toThrow(
      'TSS session is not in ceremony_in_progress state',
    );
  });

  it('rejects with CEREMONY_ALREADY_RUNNING when resumed twice for the same keyId', async () => {
    const keyId = 'resume-already-running';
    const store = configureTestStore({
      WALLET: {
        keys: {
          [keyId]: makeKeyWithSession(keyId, {
            isCreator: false,
            status: 'ceremony_in_progress',
          }),
        },
      },
    });

    const first = store.dispatch(joinTSSWithCode({keyId}));
    const second = store.dispatch(joinTSSWithCode({keyId}));

    await expect(second).rejects.toThrow('CEREMONY_ALREADY_RUNNING');

    await tick();
    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');
    await first.catch(() => {});
  });

  it('rejects with CEREMONY_CANCELLED when cancelled during restoreSession', async () => {
    const keyId = 'resume-cancelled';
    const store = configureTestStore({
      WALLET: {
        keys: {
          [keyId]: makeKeyWithSession(keyId, {
            isCreator: false,
            status: 'ceremony_in_progress',
          }),
        },
      },
    });

    const resultPromise = store.dispatch(joinTSSWithCode({keyId}));
    store.dispatch(cancelTSSCeremony(keyId));

    await expect(resultPromise).rejects.toThrow('CEREMONY_CANCELLED');
  });

  it('restores the session from tssSession.sessionExport and completes successfully', async () => {
    const keyId = 'resume-success';
    const store = configureTestStore({
      WALLET: {
        keys: {
          [keyId]: makeKeyWithSession(keyId, {
            isCreator: false,
            status: 'ceremony_in_progress',
            sessionExport: 'the-saved-session-export',
          }),
        },
      },
    });

    lastWalletClient.getStatus = jest.fn((_opts: any, cb: any) =>
      cb(null, {
        wallet: {
          id: DEFAULT_BWS_WALLET_ID,
          copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
          publicKeyRing: [{xPubKey: 'a'}, {xPubKey: 'b'}, {xPubKey: 'c'}],
          tssKeyId: 'resumed-tss-key-id',
        },
        customData: {},
      }),
    );

    const resultPromise = store.dispatch(joinTSSWithCode({keyId}));
    await tick();

    // The patched BWC TssKeyGen requires `coin` (throws without it).
    expect(createKeyGenMock).toHaveBeenCalledWith(
      expect.objectContaining({coin: 'btc', chain: 'btc', network: 'livenet'}),
    );
    expect(lastKeyGen.restoreSession).toHaveBeenCalledWith({
      session: 'the-saved-session-export',
    });

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');

    const finalKey = await resultPromise;
    expect(finalKey.wallets[0].tssKeyId).toBe('resumed-tss-key-id');
    expect(finalKey.tssSession!.status).toBe('complete');
  });

  it('checkpoints tssSession.sessionExport on roundprocessed/roundsubmitted so a later resume can continue', async () => {
    const keyId = 'resume-checkpoint';
    const store = configureTestStore({
      WALLET: {
        keys: {
          [keyId]: makeKeyWithSession(keyId, {
            isCreator: false,
            status: 'ceremony_in_progress',
          }),
        },
      },
    });

    const resultPromise = store.dispatch(joinTSSWithCode({keyId}));
    await tick();

    lastKeyGen.exportSession.mockReturnValue('checkpoint-after-round-1');
    lastKeyGen.emit('roundprocessed', 1);

    const afterProcessed = store
      .getActions()
      .filter((a: any) => a.type === WalletActionTypes.SUCCESS_UPDATE_KEY)
      .pop();
    expect(afterProcessed.payload.key.tssSession.sessionExport).toBe(
      'checkpoint-after-round-1',
    );

    lastKeyGen.exportSession.mockReturnValue('checkpoint-after-submit-1');
    lastKeyGen.emit('roundsubmitted', 1);

    const afterSubmitted = store
      .getActions()
      .filter((a: any) => a.type === WalletActionTypes.SUCCESS_UPDATE_KEY)
      .pop();
    expect(afterSubmitted.payload.key.tssSession.sessionExport).toBe(
      'checkpoint-after-submit-1',
    );

    lastKeyGen.emit('wallet', {
      id: DEFAULT_BWS_WALLET_ID,
      m: 2,
      n: 3,
      copayers: [{id: 'c1'}, {id: 'c2'}, {id: 'c3'}],
    });
    lastKeyGen.emit('complete');
    await resultPromise;
  });
});

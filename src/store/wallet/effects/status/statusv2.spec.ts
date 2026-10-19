/**
 * Tests for src/store/wallet/effects/status/statusv2.ts
 *
 * Strategy mirrors status.spec.ts: mock at the BWC bulkClient.getStatusAll
 * boundary and run the real thunks through a test store, so the actual
 * updateKeyStatus resolve/reject paths are exercised.
 */

import configureTestStore from '@test/store';
import {Network} from '../../../../constants';

jest.mock('../../../../constants/config', () => ({
  BASE_BWS_URL: 'https://example.invalid',
  BLOCKCHAIN_EXPLORERS: Object.fromEntries(
    ['eth', 'matic', 'arb', 'base', 'op', 'sol'].map(chain => [
      chain,
      {livenet: '', testnet: ''},
    ]),
  ),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@test/store', () => ({
  __esModule: true,
  default: jest.fn((overrides: any = {}) => {
    const state = {
      ...overrides,
      APP: {
        defaultAltCurrency: {isoCode: 'USD'},
        ...(overrides.APP || {}),
      },
      RATE: {
        lastDayRates: {},
        rates: {},
        ...(overrides.RATE || {}),
      },
      WALLET: {
        balanceCacheKey: {},
        keys: {},
        useUnconfirmedFunds: false,
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
    };
  }),
}));

jest.mock('react-native-worklets', () => ({
  createWorkletRuntime: jest.fn(() => ({
    runAsync: jest.fn(),
    runGuarded: jest.fn(),
    runSync: jest.fn(),
  })),
}));

// BwcProvider — isolate network calls and prevent native module crashes
jest.mock('../../../../lib/bwc', () => {
  const mockBulkClient = {
    getStatusAll: jest.fn((_creds: any, _opts: any, cb: any) => cb(null, [])),
  };
  const mockClient = {
    bulkClient: mockBulkClient,
    getStatusAll: mockBulkClient.getStatusAll,
  };
  const mockInstance = {
    getClient: jest.fn(() => mockClient),
    getTssSign: jest.fn(() => class MockTssSign {}),
    getTssKey: jest.fn(() => class MockTssKey {}),
    createTssKey: jest.fn(),
    createKeyGen: jest.fn(),
    getErrors: jest.fn(() => ({})),
    getUtils: jest.fn(() => ({})),
    getBitcore: jest.fn(() => ({})),
    getCore: jest.fn(() => ({})),
    getConstants: jest.fn(() => ({})),
    getLogger: jest.fn(() => ({})),
    getPayProV2: jest.fn(() => ({trustedKeys: {}})),
    getEncryption: jest.fn(() => ({})),
    createKey: jest.fn(),
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

jest.mock('../amount/amount', () => ({
  FormatAmount: jest.fn(
    (currency: string, _chain: string, _addr: any, sats: number) => () =>
      `${sats} ${currency}`,
  ),
  FormatAmountStr: jest.fn(
    (currency: string, _chain: string, _addr: any, sats: number) => () =>
      `${sats} ${currency}`,
  ),
}));

jest.mock('../../utils/wallet', () => ({
  isCacheKeyStale: jest.fn(() => true), // stale by default → updates proceed
  toFiat: (sats: number) => () => sats / 1e8,
}));

jest.mock('../../../../utils/helper-methods', () => ({
  convertToFiat: jest.fn((fiatAmount: number) => fiatAmount ?? 0),
  checkEncryptedKeysForEddsaMigration: jest.fn(() => () => Promise.resolve()),
  isL2NoSideChainNetwork: jest.fn((chain: string) =>
    ['arb', 'base', 'op'].includes((chain || '').toLowerCase()),
  ),
}));

jest.mock('../transactions/transactions', () => ({
  ProcessPendingTxps: jest.fn(() => () => []),
  RemoveTxProposal: jest.fn(() => Promise.resolve()),
}));

jest.mock('../create/create', () => ({
  detectAndCreateTokensForEachEvmWallet: jest.fn(() => () => Promise.resolve()),
}));

jest.mock('../address/address', () => ({
  createWalletAddress: jest.fn(() => () => Promise.resolve('mock-address')),
}));

jest.mock('../rates/rates', () => ({
  startGetRates: jest.fn(() => () => Promise.resolve({})),
}));

// Only clearWalletBalances uses the store barrel; stub it so importing
// statusv2 does not pull in the whole store.
jest.mock('../..', () => ({WalletActions: {}}));

jest.mock('../../../../managers/LogManager', () => ({
  logManager: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import {BwcProvider} from '../../../../lib/bwc';
import {logManager} from '../../../../managers/LogManager';

const makeCachedBalance = (sat = 1_000_000) => ({
  sat,
  satAvailable: sat,
  satLocked: 0,
  satConfirmedLocked: 0,
  satConfirmed: sat,
  satConfirmedAvailable: sat,
  satSpendable: sat,
  satPending: 0,
  crypto: `${sat} btc`,
  cryptoLocked: '0 btc',
  cryptoConfirmedLocked: '0 btc',
  cryptoSpendable: `${sat} btc`,
  cryptoPending: '0 btc',
  fiat: sat / 1e8,
  fiatLastDay: sat / 1e8,
  fiatLocked: 0,
  fiatConfirmedLocked: 0,
  fiatSpendable: sat / 1e8,
  fiatPending: 0,
});

const makeWallet = (overrides: Partial<any> = {}): any => ({
  id: 'wallet-1',
  keyId: 'key-1',
  currencyAbbreviation: 'btc',
  chain: 'btc',
  network: Network.mainnet,
  balance: makeCachedBalance(),
  pendingTxps: [],
  singleAddress: false,
  receiveAddress: 'mock-receive-address',
  hideWallet: false,
  hideWalletByAccount: false,
  credentials: {
    copayerId: 'copayer-1',
    token: null,
    multisigEthInfo: null,
    isComplete: () => true,
  },
  tokens: undefined,
  tokenAddress: undefined,
  getStatus: jest.fn(),
  getBalance: jest.fn(),
  getTokenContractInfo: jest.fn(),
  tssKeyId: undefined,
  pendingTssSession: false,
  ...overrides,
});

const makeKey = (wallets: any[] = [], overrides: Partial<any> = {}): any => ({
  id: 'key-1',
  wallets,
  properties: undefined,
  methods: undefined,
  totalBalance: 0,
  totalBalanceLastDay: 0,
  hideKeyBalance: false,
  isReadOnly: false,
  ...overrides,
});

const makeStatus = (overrides: Partial<any> = {}): any => ({
  balance: {
    totalAmount: 2_000_000,
    totalConfirmedAmount: 2_000_000,
    lockedAmount: 0,
    lockedConfirmedAmount: 0,
    availableAmount: 2_000_000,
    availableConfirmedAmount: 2_000_000,
  },
  pendingTxps: [],
  wallet: {singleAddress: false},
  ...overrides,
});

const makeBulkStatus = (
  walletId = 'wallet-1',
  overrides: Partial<any> = {},
): any => ({
  walletId,
  success: true,
  status: makeStatus(),
  ...overrides,
});

/** A key whose single wallet has no eligible credentials (pending TSS session). */
const makePendingTssKey = (id: string) =>
  makeKey(
    [
      makeWallet({
        id: `${id}-wallet`,
        keyId: id,
        pendingTssSession: true,
        credentials: {
          copayerId: `${id}-copayer`,
          token: null,
          multisigEthInfo: null,
          isComplete: () => true,
        },
      }),
    ],
    {id},
  );

const mockGetStatusAll = (impl: (creds: any[], cb: any) => void) => {
  const getStatusAll = jest.fn((creds: any[], _opts: any, cb: any) =>
    impl(creds, cb),
  );
  (BwcProvider.getInstance as jest.Mock).mockReturnValue({
    getClient: jest.fn(() => ({bulkClient: {getStatusAll}})),
  });
  return getStatusAll;
};

const makeStore = (keys: any[]) =>
  configureTestStore({
    WALLET: {
      balanceCacheKey: {},
      useUnconfirmedFunds: false,
      keys: Object.fromEntries(keys.map(key => [key.id, key])),
    },
    APP: {defaultAltCurrency: {isoCode: 'USD'}},
    RATE: {rates: {}, lastDayRates: {}},
  });

const balanceActions = (store: any) =>
  store
    .getActions()
    .filter(
      (action: any) =>
        action.type === 'WALLET/SUCCESS_UPDATE_WALLET_BALANCES_AND_STATUS',
    );

// ─── Import after mocks ───────────────────────────────────────────────────────

import {getAndDispatchUpdatedWalletBalances} from './statusv2';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getAndDispatchUpdatedWalletBalances – per-key failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes the keys that succeeded and still rejects when one key fails', async () => {
    mockGetStatusAll((creds, cb) =>
      creds[0].copayerId === 'copayer-2'
        ? cb(new Error('network down'), null)
        : cb(null, [makeBulkStatus('wallet-1')]),
    );

    const okKey = makeKey([makeWallet()]);
    const failingKey = makeKey(
      [
        makeWallet({
          id: 'wallet-2',
          keyId: 'key-2',
          credentials: {
            copayerId: 'copayer-2',
            token: null,
            multisigEthInfo: null,
            isComplete: () => true,
          },
        }),
      ],
      {id: 'key-2'},
    );
    const store = makeStore([okKey, failingKey]);

    await expect(
      store.dispatch(getAndDispatchUpdatedWalletBalances({force: true})),
    ).rejects.toThrow('network down');

    const published = balanceActions(store);
    expect(published).toHaveLength(1);
    expect(published[0].payload.keyBalances.map((b: any) => b.keyId)).toEqual([
      'key-1',
    ]);
    expect(
      published[0].payload.walletBalances.map((b: any) => b.walletId),
    ).toEqual(['wallet-1']);
    expect(logManager.warn).toHaveBeenCalledWith(
      expect.stringContaining('key-2'),
    );
  });

  it('still rejects when the only other key has no eligible credentials', async () => {
    mockGetStatusAll((_creds, cb) => cb(new Error('offline'), null));

    const pendingKey = makePendingTssKey('key-pending');
    const failingKey = makeKey([makeWallet({keyId: 'key-2'})], {id: 'key-2'});
    const store = makeStore([pendingKey, failingKey]);

    await expect(
      store.dispatch(getAndDispatchUpdatedWalletBalances({force: true})),
    ).rejects.toThrow('offline');
  });

  it('keeps read-only balances when the regular key fails', async () => {
    mockGetStatusAll((_creds, cb) => cb(new Error('network down'), null));

    const regularKey = makeKey([makeWallet()]);
    const readOnlyWallet = makeWallet({
      id: 'wallet-ro',
      keyId: 'key-ro',
      credentials: {
        copayerId: 'copayer-ro',
        token: null,
        multisigEthInfo: null,
        isComplete: () => true,
      },
    });
    readOnlyWallet.getStatus = jest.fn((_opts: any, cb: any) =>
      cb(null, makeStatus()),
    );
    const readOnlyKey = makeKey([readOnlyWallet], {
      id: 'key-ro',
      isReadOnly: true,
    });
    const store = makeStore([regularKey, readOnlyKey]);

    await expect(
      store.dispatch(getAndDispatchUpdatedWalletBalances({force: true})),
    ).rejects.toThrow('network down');

    const published = balanceActions(store);
    expect(published).toHaveLength(1);
    expect(published[0].payload.keyBalances).toHaveLength(0);
    expect(
      published[0].payload.walletBalances.map((b: any) => b.walletId),
    ).toEqual(['wallet-ro']);
  });

  it('rejects with the first error when every key fails', async () => {
    mockGetStatusAll((_creds, cb) => cb(new Error('offline'), null));

    const store = makeStore([
      makeKey([makeWallet()]),
      makeKey([makeWallet({id: 'wallet-2', keyId: 'key-2'})], {id: 'key-2'}),
    ]);

    await expect(
      store.dispatch(getAndDispatchUpdatedWalletBalances({force: true})),
    ).rejects.toThrow('offline');
  });

  it('resolves and publishes every key when none fail', async () => {
    mockGetStatusAll((creds, cb) =>
      cb(null, [makeBulkStatus(`wallet-${creds[0].copayerId}`)]),
    );

    const keyOne = makeKey([makeWallet({id: 'wallet-copayer-1'})]);
    const keyTwo = makeKey(
      [
        makeWallet({
          id: 'wallet-copayer-2',
          keyId: 'key-2',
          credentials: {
            copayerId: 'copayer-2',
            token: null,
            multisigEthInfo: null,
            isComplete: () => true,
          },
        }),
      ],
      {id: 'key-2'},
    );
    const store = makeStore([keyOne, keyTwo]);

    await expect(
      store.dispatch(getAndDispatchUpdatedWalletBalances({force: true})),
    ).resolves.toBeUndefined();

    const published = balanceActions(store);
    expect(published).toHaveLength(1);
    expect(published[0].payload.keyBalances.map((b: any) => b.keyId)).toEqual([
      'key-1',
      'key-2',
    ]);
    expect(logManager.warn).not.toHaveBeenCalled();
  });
});

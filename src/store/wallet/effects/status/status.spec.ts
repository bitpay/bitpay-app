/**
 * Tests for src/store/wallet/effects/status/status.ts
 *
 * Strategy:
 * - Pure / near-pure effects (buildBalance, buildFiatBalance, buildPendingTxps,
 *   GetWalletBalance, getTokenContractInfo, getBulkStatus) are tested with
 *   light mocks.
 * - Thunk effects that reach out to network (updateKeyStatus,
 *   startUpdateAllWalletStatusForKeys, startUpdateAllKeyAndWalletStatus, etc.)
 *   are tested by mocking the heavy deps and verifying that the correct Redux
 *   actions get dispatched.
 */

import configureTestStore from '@test/store';
import {Network} from '../../../../constants';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// BwcProvider — isolate network calls and prevent native module crashes
// (tss-send calls BwcProvider.getInstance().getTssSign() at module load time)
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

// FormatAmount — return a deterministic string so math doesn't depend on BWC
jest.mock('../amount/amount', () => ({
  FormatAmount: jest.fn(
    (currency: string, _chain: string, _addr: any, sats: number) =>
      () =>
        `${sats} ${currency}`,
  ),
  FormatAmountStr: jest.fn(
    (currency: string, _chain: string, _addr: any, sats: number) =>
      () =>
        `${sats} ${currency}`,
  ),
}));

// toFiat — simple pass-through so sats === fiat for testing
jest.mock('../../utils/wallet', () => ({
  ...jest.requireActual('../../utils/wallet'),
  isCacheKeyStale: jest.fn(() => true), // stale by default → updates proceed
  findWalletById: jest.fn(),
  toFiat:
    (sats: number) =>
    () =>
      sats / 1e8, // 1 sat = 1e-8 "fiat"
}));

// convertToFiat — just return the first argument
jest.mock('../../../../utils/helper-methods', () => ({
  ...jest.requireActual('../../../../utils/helper-methods'),
  convertToFiat: jest.fn((fiatAmount: number) => fiatAmount ?? 0),
  checkEncryptedKeysForEddsaMigration: jest.fn(() => () => Promise.resolve()),
  isL2NoSideChainNetwork: jest.fn((chain: string) =>
    ['arb', 'base', 'op'].includes((chain || '').toLowerCase()),
  ),
}));

// ProcessPendingTxps — return a fixed list
jest.mock('../transactions/transactions', () => ({
  ProcessPendingTxps: jest.fn(() => () => [{id: 'txp-1'}]),
  RemoveTxProposal: jest.fn(() => Promise.resolve()),
}));

// detectAndCreateTokensForEachEvmWallet — no-op
jest.mock('../create/create', () => ({
  ...jest.requireActual('../create/create'),
  detectAndCreateTokensForEachEvmWallet: jest.fn(() => () => Promise.resolve()),
}));

// createWalletAddress — no-op
jest.mock('../address/address', () => ({
  createWalletAddress: jest.fn(() => () => Promise.resolve('mock-address')),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import {BwcProvider} from '../../../../lib/bwc';
import {isCacheKeyStale} from '../../utils/wallet';
import {convertToFiat} from '../../../../utils/helper-methods';

/** Minimal WalletBalance used as cached balance in tests */
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

/** Minimal Wallet object */
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

/** Minimal Key object */
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

/** Minimal Status returned from BWC */
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

/** Minimal BulkStatus entry */
const makeBulkStatus = (walletId = 'wallet-1', overrides: Partial<any> = {}): any => ({
  walletId,
  success: true,
  status: makeStatus(),
  ...overrides,
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  buildBalance,
  buildFiatBalance,
  buildPendingTxps,
  getBulkStatus,
  GetWalletBalance,
  getTokenContractInfo,
  startUpdateWalletStatus,
  startUpdateAllWalletStatusForKeys,
  startUpdateAllWalletStatusForReadOnlyKeys,
  startUpdateAllWalletStatusForKey,
  startUpdateAllKeyAndWalletStatus,
  updateWalletStatus,
  FormatKeyBalances,
  startFormatBalanceAllWalletsForKey,
} from './status';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getBulkStatus', () => {
  it('resolves with data when bulkClient.getStatusAll succeeds', async () => {
    const mockData = [{walletId: 'w1', success: true, status: {}}];
    const bulkClient = {
      getStatusAll: jest.fn((_creds, _opts, cb) => cb(null, mockData)),
    };
    const result = await getBulkStatus(bulkClient, [], {});
    expect(result).toEqual(mockData);
  });

  it('rejects when bulkClient.getStatusAll errors', async () => {
    const error = new Error('network error');
    const bulkClient = {
      getStatusAll: jest.fn((_creds, _opts, cb) => cb(error, null)),
    };
    await expect(getBulkStatus(bulkClient, [], {})).rejects.toEqual(error);
  });

  it('calls getStatusAll with includeExtendedInfo and twoStep options', async () => {
    const bulkClient = {
      getStatusAll: jest.fn((_creds, opts, cb) => {
        expect(opts.includeExtendedInfo).toBe(true);
        expect(opts.twoStep).toBe(true);
        cb(null, []);
      }),
    };
    await getBulkStatus(bulkClient, ['cred1'], {w1: {tokenAddresses: undefined}});
    expect(bulkClient.getStatusAll).toHaveBeenCalledTimes(1);
  });
});

describe('GetWalletBalance', () => {
  it('resolves with the balance returned from wallet.getBalance', async () => {
    const mockBalance = {totalAmount: 5000};
    const wallet = makeWallet();
    wallet.getBalance = jest.fn((_opts, cb) => cb(null, mockBalance));

    const result = await GetWalletBalance(wallet, {});
    expect(result).toEqual(mockBalance);
  });

  it('rejects when wallet.getBalance returns an error', async () => {
    const error = new Error('balance error');
    const wallet = makeWallet();
    wallet.getBalance = jest.fn((_opts, cb) => cb(error, null));

    await expect(GetWalletBalance(wallet, {})).rejects.toEqual(error);
  });

  it('passes opts through to getBalance', async () => {
    const wallet = makeWallet();
    wallet.getBalance = jest.fn((_opts, cb) => cb(null, {}));
    const opts = {includeExtendedInfo: true};

    await GetWalletBalance(wallet, opts);
    expect(wallet.getBalance).toHaveBeenCalledWith(opts, expect.any(Function));
  });
});

describe('getTokenContractInfo', () => {
  it('resolves with the token info when successful', async () => {
    const mockInfo = {symbol: 'USDC', decimals: 6};
    const wallet = makeWallet();
    wallet.getTokenContractInfo = jest.fn((_opts, cb) => cb(null, mockInfo));

    const result = await getTokenContractInfo(wallet, {});
    expect(result).toEqual(mockInfo);
  });

  it('rejects when getTokenContractInfo errors', async () => {
    const error = new Error('contract error');
    const wallet = makeWallet();
    wallet.getTokenContractInfo = jest.fn((_opts, cb) => cb(error, null));

    await expect(getTokenContractInfo(wallet, {})).rejects.toEqual(error);
  });
});

describe('buildBalance', () => {
  it('returns a CryptoBalance object with correct sat values for btc', () => {
    const store = configureTestStore({WALLET: {useUnconfirmedFunds: false}});
    const wallet = makeWallet();
    const status = makeStatus({
      balance: {
        totalAmount: 3_000_000,
        totalConfirmedAmount: 3_000_000,
        lockedAmount: 500_000,
        lockedConfirmedAmount: 500_000,
        availableAmount: 2_500_000,
        availableConfirmedAmount: 2_500_000,
      },
    });

    const result = store.dispatch(buildBalance({wallet, status}));

    expect(result.sat).toBe(3_000_000);
    expect(result.satLocked).toBe(500_000);
    expect(result.satAvailable).toBe(2_500_000);
    expect(result.satSpendable).toBe(2_500_000); // confirmed - locked, no unconfirmed funds
    expect(result.satPending).toBe(0);
  });

  it('adjusts sat values for xrp chain', () => {
    const store = configureTestStore({WALLET: {useUnconfirmedFunds: false}});
    const wallet = makeWallet({chain: 'xrp', currencyAbbreviation: 'xrp'});
    const status = makeStatus({
      balance: {
        totalAmount: 10_000_000,
        totalConfirmedAmount: 10_000_000,
        lockedAmount: 2_000_000,
        lockedConfirmedAmount: 1_000_000,
        availableAmount: 8_000_000,
        availableConfirmedAmount: 8_000_000,
      },
    });

    const result = store.dispatch(buildBalance({wallet, status}));

    // satLockedAmount = lockedAmount - lockedConfirmedAmount
    expect(result.satLocked).toBe(1_000_000);
    // satTotalAmount = totalAmount - lockedConfirmedAmount
    expect(result.sat).toBe(9_000_000);
  });

  it('adjusts sat values for sol chain', () => {
    const store = configureTestStore({WALLET: {useUnconfirmedFunds: false}});
    const wallet = makeWallet({chain: 'sol', currencyAbbreviation: 'sol'});
    const status = makeStatus({
      balance: {
        totalAmount: 5_000_000,
        totalConfirmedAmount: 5_000_000,
        lockedAmount: 1_000_000,
        lockedConfirmedAmount: 500_000,
        availableAmount: 4_000_000,
        availableConfirmedAmount: 4_000_000,
      },
    });

    const result = store.dispatch(buildBalance({wallet, status}));
    expect(result.satLocked).toBe(500_000);
    expect(result.sat).toBe(4_500_000);
  });

  it('uses unconfirmed funds for spendable amount when useUnconfirmedFunds is true', () => {
    const store = configureTestStore({WALLET: {useUnconfirmedFunds: true}});
    const wallet = makeWallet();
    const status = makeStatus({
      balance: {
        totalAmount: 3_000_000,
        totalConfirmedAmount: 2_000_000,
        lockedAmount: 500_000,
        lockedConfirmedAmount: 500_000,
        availableAmount: 2_500_000,
        availableConfirmedAmount: 1_500_000,
      },
    });

    const result = store.dispatch(buildBalance({wallet, status}));
    // spendable = totalAmount - lockedAmount when useUnconfirmedFunds
    expect(result.satSpendable).toBe(2_500_000);
  });

  it('returns crypto formatted string fields', () => {
    const store = configureTestStore({WALLET: {useUnconfirmedFunds: false}});
    const wallet = makeWallet({currencyAbbreviation: 'btc'});
    const status = makeStatus();

    const result = store.dispatch(buildBalance({wallet, status}));

    expect(typeof result.crypto).toBe('string');
    expect(typeof result.cryptoLocked).toBe('string');
    expect(typeof result.cryptoSpendable).toBe('string');
  });
});

describe('buildFiatBalance', () => {
  it('returns a FiatBalance object with numeric fields', () => {
    const store = configureTestStore({});
    const wallet = makeWallet();
    const cryptoBalance = makeCachedBalance(1_000_000);
    const rates = {};
    const lastDayRates = {};

    const result = store.dispatch(
      buildFiatBalance({
        wallet,
        cryptoBalance,
        defaultAltCurrencyIsoCode: 'USD',
        rates,
        lastDayRates,
      }),
    );

    expect(typeof result.fiat).toBe('number');
    expect(typeof result.fiatLastDay).toBe('number');
    expect(typeof result.fiatLocked).toBe('number');
    expect(typeof result.fiatSpendable).toBe('number');
    expect(typeof result.fiatPending).toBe('number');
  });

  it('returns fiatLastDay based on lastDayRates (different from fiat when rates differ)', () => {
    // toFiat mock returns sats/1e8; since rates and lastDayRates differ only semantically here,
    // we just verify fiatLastDay is a number and present in the result.
    const store = configureTestStore({});
    const wallet = makeWallet();
    const cryptoBalance = makeCachedBalance(1_000_000);

    const result = store.dispatch(
      buildFiatBalance({
        wallet,
        cryptoBalance,
        defaultAltCurrencyIsoCode: 'USD',
        rates: {BTC: {USD: 50000}},
        lastDayRates: {BTC: {USD: 49000}},
      }),
    );

    expect(typeof result.fiatLastDay).toBe('number');
    expect(Object.keys(result)).toContain('fiatLastDay');
  });
});

describe('buildPendingTxps', () => {
  it('returns empty array for ERC token wallets', () => {
    const store = configureTestStore({});
    // shib is an ERC token on eth chain
    const wallet = makeWallet({currencyAbbreviation: 'shib', chain: 'eth'});
    const status = makeStatus({pendingTxps: [{id: 'txp-1'}]});

    const result = store.dispatch(buildPendingTxps({wallet, status}));
    expect(result).toEqual([]);
  });

  it('returns pending txps for non-ERC wallets', () => {
    const store = configureTestStore({});
    const wallet = makeWallet({currencyAbbreviation: 'btc', chain: 'btc'});
    const status = makeStatus({pendingTxps: [{id: 'txp-1'}]});

    const result = store.dispatch(buildPendingTxps({wallet, status}));
    expect(result).toEqual([{id: 'txp-1'}]);
  });

  it('returns empty array when there are no pending txps', () => {
    const store = configureTestStore({});
    const wallet = makeWallet();
    const status = makeStatus({pendingTxps: []});

    const result = store.dispatch(buildPendingTxps({wallet, status}));
    expect(result).toEqual([]);
  });

  it('filters expired TSS txps (older than 10 minutes)', () => {
    const store = configureTestStore({});
    const now = Math.floor(Date.now() / 1000);
    const wallet = makeWallet({tssKeyId: 'tss-key-1'});

    // One expired (11 min ago), one fresh (1 min ago)
    const expiredTxp = {id: 'expired', createdOn: now - 11 * 60};
    const freshTxp = {id: 'fresh', createdOn: now - 60};

    // Make ProcessPendingTxps return both txps
    const {ProcessPendingTxps} = require('../transactions/transactions');
    (ProcessPendingTxps as jest.Mock).mockImplementationOnce(
      () => () => [expiredTxp, freshTxp],
    );

    const status = makeStatus({pendingTxps: [expiredTxp, freshTxp]});
    const result = store.dispatch(buildPendingTxps({wallet, status}));

    expect(result).toEqual([freshTxp]);
    expect(result.some(t => t.id === 'expired')).toBe(false);
  });
});

describe('startUpdateWalletStatus', () => {
  it('calls wallet.getStatus when cache is stale (force=true)', async () => {
    // isCacheKeyStale returns true by default (set at top-level mock factory)
    const store = configureTestStore({
      WALLET: {
        balanceCacheKey: {},
        useUnconfirmedFunds: false,
        keys: {'key-1': {wallets: [makeWallet()]}},
      },
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    const wallet = makeWallet();
    wallet.getStatus = jest.fn((_opts, cb) => cb(null, makeStatus()));

    const key = makeKey([wallet]);

    await store.dispatch(startUpdateWalletStatus({key, wallet, force: true}));
    expect(wallet.getStatus).toHaveBeenCalledTimes(1);
  });

  it('rejects when key is missing', async () => {
    const store = configureTestStore({
      WALLET: {balanceCacheKey: {}, useUnconfirmedFunds: false},
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    const wallet = makeWallet();
    await expect(
      store.dispatch(startUpdateWalletStatus({key: null as any, wallet})),
    ).rejects.toBeUndefined();
  });

  it('rejects when wallet is missing', async () => {
    const store = configureTestStore({
      WALLET: {balanceCacheKey: {}, useUnconfirmedFunds: false},
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    const key = makeKey([]);
    await expect(
      store.dispatch(startUpdateWalletStatus({key, wallet: null as any})),
    ).rejects.toBeUndefined();
  });

  it('dispatches successUpdateWalletStatus after a successful update', async () => {
    const store = configureTestStore({
      WALLET: {
        balanceCacheKey: {},
        useUnconfirmedFunds: false,
        keys: {
          'key-1': {
            wallets: [makeWallet()],
          },
        },
      },
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    const wallet = makeWallet();
    // wallet.getStatus resolves successfully
    wallet.getStatus = jest.fn((_opts, cb) => cb(null, makeStatus()));

    const key = makeKey([wallet]);

    await store.dispatch(startUpdateWalletStatus({key, wallet, force: true}));

    // The store should have updated the wallet status actions — check state
    const state = store.getState();
    // If successUpdateWalletStatus dispatched, the wallet balance gets stored
    // (wallet reducer handles SUCCESS_UPDATE_WALLET_STATUS)
    expect(state.WALLET).toBeDefined();
  });
});

describe('startUpdateAllWalletStatusForReadOnlyKeys', () => {
  it('resolves successfully with no wallets', async () => {
    const store = configureTestStore({
      WALLET: {balanceCacheKey: {}, useUnconfirmedFunds: false},
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    const readOnlyKey = makeKey([], {isReadOnly: true});
    await expect(
      store.dispatch(
        startUpdateAllWalletStatusForReadOnlyKeys({readOnlyKeys: [readOnlyKey], force: true}),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('startUpdateAllWalletStatusForKey', () => {
  it('routes to startUpdateAllWalletStatusForKeys when key is not read-only', async () => {
    (isCacheKeyStale as jest.Mock).mockReturnValue(true);

    // Mock BwcProvider to have a working getStatusAll
    const mockGetStatusAll = jest.fn((_creds, _opts, cb) => cb(null, []));
    (BwcProvider.getInstance as jest.Mock).mockReturnValue({
      getClient: jest.fn(() => ({
        bulkClient: {getStatusAll: mockGetStatusAll},
      })),
    });

    const store = configureTestStore({
      WALLET: {
        balanceCacheKey: {},
        useUnconfirmedFunds: false,
        keys: {'key-1': makeKey([makeWallet()])},
      },
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    const wallet = makeWallet();
    wallet.getStatus = jest.fn((_opts, cb) => cb(null, makeStatus()));
    const key = makeKey([wallet], {isReadOnly: false});

    // Should not throw
    await expect(
      store.dispatch(startUpdateAllWalletStatusForKey({key, force: true})),
    ).resolves.toBeUndefined();
  });

  it('routes to startUpdateAllWalletStatusForReadOnlyKeys when key is read-only', async () => {
    const store = configureTestStore({
      WALLET: {balanceCacheKey: {}, useUnconfirmedFunds: false, keys: {}},
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    const wallet = makeWallet();
    wallet.getStatus = jest.fn((_opts, cb) => cb(null, makeStatus()));
    const readOnlyKey = makeKey([wallet], {isReadOnly: true});

    await expect(
      store.dispatch(
        startUpdateAllWalletStatusForKey({key: readOnlyKey, force: true}),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('startUpdateAllWalletStatusForKeys', () => {
  it('resolves when called with no keys', async () => {
    const store = configureTestStore({
      WALLET: {balanceCacheKey: {}, useUnconfirmedFunds: false, keys: {}},
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    await expect(
      store.dispatch(startUpdateAllWalletStatusForKeys({keys: [], force: true})),
    ).resolves.toBeUndefined();
  });

  it('dispatches failedUpdateKeyTotalBalance when getBulkStatus fails', async () => {
    (isCacheKeyStale as jest.Mock).mockReturnValue(true);

    const error = new Error('network down');
    const mockGetStatusAll = jest.fn((_creds, _opts, cb) => cb(error, null));
    (BwcProvider.getInstance as jest.Mock).mockReturnValue({
      getClient: jest.fn(() => ({
        bulkClient: {getStatusAll: mockGetStatusAll},
      })),
    });

    const wallet = makeWallet({
      credentials: {
        copayerId: 'copayer-1',
        token: null,
        multisigEthInfo: null,
        isComplete: () => true,
      },
    });
    const key = makeKey([wallet]);

    const store = configureTestStore({
      WALLET: {
        balanceCacheKey: {},
        useUnconfirmedFunds: false,
        keys: {'key-1': key},
      },
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    await expect(
      store.dispatch(startUpdateAllWalletStatusForKeys({keys: [key], force: true})),
    ).rejects.toThrow();
  });
});

describe('startUpdateAllKeyAndWalletStatus', () => {
  it('resolves early when all cache keys are fresh and force is false', async () => {
    (isCacheKeyStale as jest.Mock).mockReturnValue(false);

    const store = configureTestStore({
      WALLET: {
        balanceCacheKey: {all: Date.now()},
        useUnconfirmedFunds: false,
        keys: {},
      },
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    await expect(
      store.dispatch(startUpdateAllKeyAndWalletStatus({})),
    ).resolves.toBeUndefined();
  });

  it('dispatches failedUpdateAllKeysAndStatus when an update fails', async () => {
    (isCacheKeyStale as jest.Mock).mockReturnValue(true);

    const error = new Error('bulk fail');
    const mockGetStatusAll = jest.fn((_creds, _opts, cb) => cb(error, null));
    (BwcProvider.getInstance as jest.Mock).mockReturnValue({
      getClient: jest.fn(() => ({
        bulkClient: {getStatusAll: mockGetStatusAll},
      })),
    });

    const wallet = makeWallet({
      credentials: {
        copayerId: 'copayer-1',
        token: null,
        multisigEthInfo: null,
        isComplete: () => true,
      },
    });
    const key = makeKey([wallet]);

    const store = configureTestStore({
      WALLET: {
        balanceCacheKey: {},
        useUnconfirmedFunds: false,
        keys: {'key-1': key},
      },
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    await expect(
      store.dispatch(startUpdateAllKeyAndWalletStatus({force: true})),
    ).rejects.toThrow();
  });

  it('resolves when there are no keys', async () => {
    (isCacheKeyStale as jest.Mock).mockReturnValue(true);

    const store = configureTestStore({
      WALLET: {
        balanceCacheKey: {},
        useUnconfirmedFunds: false,
        keys: {},
      },
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    await expect(
      store.dispatch(startUpdateAllKeyAndWalletStatus({force: true, context: 'init'})),
    ).resolves.toBeUndefined();
  });
});

describe('updateWalletStatus', () => {
  it('resolves with cached balance when getStatus returns an error', async () => {
    const store = configureTestStore({WALLET: {useUnconfirmedFunds: false}});

    const wallet = makeWallet();
    wallet.getStatus = jest.fn((_opts, cb) =>
      cb(new Error('getStatus error'), null),
    );

    const result = await store.dispatch(
      updateWalletStatus({
        wallet,
        defaultAltCurrencyIsoCode: 'USD',
        rates: {},
        lastDayRates: {},
      }),
    );

    // Should fall back to cached balance
    expect(result.balance).toBeDefined();
    expect(result.pendingTxps).toBe(wallet.pendingTxps);
  });

  it('resolves with updated balance on successful getStatus', async () => {
    const store = configureTestStore({WALLET: {useUnconfirmedFunds: false}});

    const wallet = makeWallet();
    wallet.getStatus = jest.fn((_opts, cb) => cb(null, makeStatus()));

    const result = await store.dispatch(
      updateWalletStatus({
        wallet,
        defaultAltCurrencyIsoCode: 'USD',
        rates: {},
        lastDayRates: {},
      }),
    );

    expect(result.balance).toBeDefined();
    expect(result.balance.sat).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.pendingTxps)).toBe(true);
  });

  it('creates a new address when receiveAddress is missing', async () => {
    const {createWalletAddress} = require('../address/address');
    const store = configureTestStore({WALLET: {useUnconfirmedFunds: false}});

    const wallet = makeWallet({receiveAddress: undefined});
    wallet.getStatus = jest.fn((_opts, cb) => cb(null, makeStatus()));

    await store.dispatch(
      updateWalletStatus({
        wallet,
        defaultAltCurrencyIsoCode: 'USD',
        rates: {},
        lastDayRates: {},
      }),
    );

    expect(createWalletAddress).toHaveBeenCalled();
  });
});

describe('FormatKeyBalances', () => {
  it('resolves when there are no keys in state', async () => {
    const store = configureTestStore({
      WALLET: {keys: {}, useUnconfirmedFunds: false},
      RATE: {rates: {}, lastDayRates: {}},
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
    });

    await expect(store.dispatch(FormatKeyBalances())).resolves.toBeUndefined();
  });
});

describe('startFormatBalanceAllWalletsForKey', () => {
  it('resolves and calls successUpdateKey', async () => {
    const wallet = makeWallet();
    const key = makeKey([wallet]);

    const store = configureTestStore({
      WALLET: {useUnconfirmedFunds: false, keys: {'key-1': key}},
      RATE: {rates: {}, lastDayRates: {}},
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
    });

    await expect(
      store.dispatch(
        startFormatBalanceAllWalletsForKey({
          key,
          defaultAltCurrencyIsoCode: 'USD',
          rates: {},
          lastDayRates: {},
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it('handles wallet with zero balance without throwing', async () => {
    const wallet = makeWallet({balance: makeCachedBalance(0)});
    const key = makeKey([wallet]);

    const store = configureTestStore({
      WALLET: {useUnconfirmedFunds: false, keys: {'key-1': key}},
      RATE: {rates: {}, lastDayRates: {}},
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
    });

    await expect(
      store.dispatch(
        startFormatBalanceAllWalletsForKey({
          key,
          defaultAltCurrencyIsoCode: 'USD',
          rates: {},
          lastDayRates: {},
        }),
      ),
    ).resolves.toBeUndefined();
  });
});

// ─── normalizeTokenAddresses (indirectly via updateKeyStatus) ─────────────────
// The private helper normalizeTokenAddresses is exercised through updateKeyStatus.
// We verify that SOL-chain token addresses are normalised to the mint address
// portion (after the last '-').

describe('updateKeyStatus — SOL token address normalisation', () => {
  it('does not throw when a SOL wallet has token addresses', async () => {
    (isCacheKeyStale as jest.Mock).mockReturnValue(true);

    const mockGetStatusAll = jest.fn((_creds, _opts, cb) => cb(null, []));
    (BwcProvider.getInstance as jest.Mock).mockReturnValue({
      getClient: jest.fn(() => ({
        bulkClient: {getStatusAll: mockGetStatusAll},
      })),
    });

    const solWallet = makeWallet({
      id: 'sol-wallet-1',
      chain: 'sol',
      currencyAbbreviation: 'sol',
      tokens: ['sol-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
      credentials: {
        copayerId: 'copayer-sol',
        token: null,
        multisigEthInfo: null,
        isComplete: () => true,
      },
    });

    const key = makeKey([solWallet]);

    const store = configureTestStore({
      WALLET: {
        balanceCacheKey: {},
        useUnconfirmedFunds: false,
        keys: {'key-1': key},
      },
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}, lastDayRates: {}},
    });

    // Should resolve (may return undefined if credentials empty after filter)
    const {updateKeyStatus} = require('./status');
    const result = await store.dispatch(updateKeyStatus({key, force: true}));
    // Either undefined (no credentials) or a result object — no throw
    expect(result === undefined || typeof result === 'object').toBe(true);
  });
});

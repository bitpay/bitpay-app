/**
 * Tests for create.ts
 *
 * Strategy:
 * - BwcProvider and hardware dependencies are mocked heavily.
 * - We focus on exported functions and the branching logic accessible through
 *   them: startCreateKey, startCreateKeyWithOpts, createWalletWithOpts,
 *   detectAndCreateTokensForEachEvmWallet, addWallet.
 * - getDecryptPassword is already covered by getDecryptPassword.spec.js.
 */

import configureTestStore from '@test/store';
import {
  startCreateKey,
  startCreateKeyWithOpts,
  createWalletWithOpts,
  detectAndCreateTokensForEachEvmWallet,
  addWallet,
} from './create';
import {Network} from '../../../../constants';

// ---------------------------------------------------------------------------
// Mock heavy native dependencies
// ---------------------------------------------------------------------------

jest.mock('../../../../managers/LogManager', () => ({
  logManager: {info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn()},
}));

jest.mock('../../../../managers/TokenManager', () => ({
  tokenManager: {getTokenOptions: jest.fn(() => ({tokenOptionsByAddress: {}}))},
}));

jest.mock('../../../../utils/helper-methods', () => ({
  sleep: jest.fn(() => Promise.resolve()),
  addTokenChainSuffix: jest.fn((addr: string, chain: string) => `${addr}_e.${chain}`),
  checkEncryptedKeysForEddsaMigration: jest.fn(() => () => Promise.resolve()),
  isL2NoSideChainNetwork: jest.fn(() => false),
  getAccount: jest.fn(() => 0),
  getErrorString: jest.fn((e: any) => String(e)),
  isL2Chain: jest.fn(() => false),
  sleep: jest.fn(() => Promise.resolve()),
  getRateByCurrencyName: jest.fn(() => undefined),
  formatFiatAmount: jest.fn(() => '0.00'),
}));

jest.mock('../../../app/app.effects', () => ({
  subscribeEmailNotifications: jest.fn(() => ({type: 'MOCK_EMAIL_NOTIF'})),
  subscribePushNotifications: jest.fn(() => ({type: 'MOCK_PUSH_NOTIF'})),
}));

jest.mock('../../../app/app.actions', () => ({
  ...jest.requireActual('../../../app/app.actions'),
  showDecryptPasswordModal: jest.fn(() => ({type: 'MOCK_SHOW_DECRYPT'})),
  dismissDecryptPasswordModal: jest.fn(() => ({type: 'MOCK_DISMISS_DECRYPT'})),
}));

jest.mock('../../../analytics/analytics.effects', () => ({
  Analytics: {track: jest.fn(() => ({type: 'MOCK_ANALYTICS'}))},
}));

// Mock wallet utils (do NOT use requireActual — it pulls in Wallet.tsx → huge chain)
jest.mock('../../utils/wallet', () => ({
  buildKeyObj: jest.fn(({key, wallets, backupComplete}) => ({
    id: 'mock-key-id',
    methods: key,
    properties: {},
    wallets: wallets || [],
    isPrivKeyEncrypted: false,
    backupComplete: backupComplete || false,
  })),
  buildWalletObj: jest.fn((credentials, _tokenOpts) => ({
    ...credentials,
    _isMockWalletObj: true,
  })),
  checkEncryptPassword: jest.fn(() => true),
  checkEncryptedKeys: jest.fn(() => true),
  mapAbbreviationAndName: jest.fn(() => _dispatch => ({
    currencyAbbreviation: 'btc',
    currencyName: 'Bitcoin',
  })),
  isCacheKeyStale: jest.fn(() => false),
}));

// Mock createWalletAddress
jest.mock('../address/address', () => ({
  createWalletAddress: jest.fn(() => () => Promise.resolve('mock-receive-address')),
}));

// Mock status effects
jest.mock('../status/status', () => ({
  startUpdateAllKeyAndWalletStatus: jest.fn(() => () => Promise.resolve()),
  startUpdateWalletStatus: jest.fn(() => () => Promise.resolve()),
  getTokenContractInfo: jest.fn(() => Promise.resolve({symbol: 'MOCK', name: 'Mock Token', decimals: 18})),
}));

// Mock currency utils
jest.mock('../../utils/currency', () => ({
  IsERCToken: jest.fn(() => false),
  IsSegwitCoin: jest.fn((coin: string) => coin === 'btc'),
  IsSVMChain: jest.fn(() => false),
  IsVMChain: jest.fn((chain: string) => ['eth', 'matic', 'sol'].includes(chain)),
  GetPrecision: jest.fn(() => ({unitDecimals: 8})),
}));

// Mock moralis effects
jest.mock('../../../moralis/moralis.effects', () => ({
  getERC20TokenBalanceByWallet: jest.fn(() => () => Promise.resolve([])),
  getSVMTokenBalanceByWallet: jest.fn(() => () => Promise.resolve([])),
}));

jest.mock('../currencies/currencies', () => ({
  addCustomTokenOption: jest.fn(() => ({type: 'MOCK_CUSTOM_TOKEN'})),
}));

// ---------------------------------------------------------------------------
// BwcProvider mock — the centrepiece
// ---------------------------------------------------------------------------

const mockBwcClient = {
  fromString: jest.fn(),
  fromObj: jest.fn(),
  createWallet: jest.fn((name: any, me: any, m: any, n: any, opts: any, cb: any) => cb(null)),
  credentials: {
    coin: 'btc',
    chain: 'btc',
    token: undefined,
    walletId: 'mock-wallet-id',
    rootPath: undefined,
    getTokenCredentials: jest.fn((tokenOpts: any, chain: string) => ({
      walletId: 'mock-token-wallet-id',
      token: {address: '0xTokenAddress'},
    })),
  },
};

const mockKeyMethods = {
  createCredentials: jest.fn(() => 'mock-credentials-string'),
  addKeyByAlgorithm: jest.fn(),
  toObj: jest.fn(() => ({})),
};

jest.mock('../../../../lib/bwc', () => ({
  BwcProvider: {
    getInstance: jest.fn(() => ({
      getClient: jest.fn(() => mockBwcClient),
      createKey: jest.fn(() => mockKeyMethods),
      getErrors: jest.fn(() => ({})),
    })),
    API: {},
  },
}));

// Also mock buy-crypto effects to prevent the deep import chain
jest.mock('../../../../store/buy-crypto/buy-crypto.effects', () => ({
  calculateUsdToAltFiat: jest.fn(() => () => 0),
}));

// Mock transactions module to avoid BWC.getErrors at module level
jest.mock('../transactions/transactions', () => ({
  GetTransactionHistory: jest.fn(() => () => Promise.resolve([])),
  BWS_TX_HISTORY_LIMIT: 1001,
  TX_HISTORY_LIMIT: 25,
}));

// ---------------------------------------------------------------------------
// Base state
// ---------------------------------------------------------------------------

const baseState = {
  APP: {
    network: Network.mainnet,
    notificationsAccepted: false,
    emailNotifications: {accepted: false, email: null},
    brazeEid: null,
    defaultLanguage: 'en',
    altCurrencyList: [{isoCode: 'USD', name: 'US Dollar'}],
  },
  WALLET: {
    keys: {},
    customTokenOptionsByAddress: {},
  },
  RATE: {
    rates: {},
    lastDayRates: {},
    fiatRateSeriesCache: {},
    ratesCacheKey: {},
  },
};

// ---------------------------------------------------------------------------
// Helper to build a minimal mock wallet
// ---------------------------------------------------------------------------
const makeMockWallet = (overrides: Record<string, any> = {}): any => ({
  id: 'mock-wallet-1',
  chain: 'eth',
  currencyAbbreviation: 'eth',
  network: Network.mainnet,
  receiveAddress: '0xMockAddress',
  tokens: [],
  credentials: {
    coin: 'eth',
    chain: 'eth',
    token: undefined,
    walletId: 'mock-wallet-1',
    rootPath: undefined,
    getTokenCredentials: jest.fn((tokenOpts: any) => ({
      walletId: `mock-wallet-1-0xtoken`,
      token: {address: '0xToken'},
    })),
  },
  balance: {sat: 0, crypto: '0', totalBalance: 0},
  preferences: {
    tokenAddresses: [],
    maticTokenAddresses: [],
    opTokenAddresses: [],
    arbTokenAddresses: [],
    baseTokenAddresses: [],
    solTokenAddresses: [],
  },
  savePreferences: jest.fn((_prefs: any, cb: any) => cb(null)),
  isHardwareWallet: false,
  hardwareData: undefined,
  ...overrides,
});

// ---------------------------------------------------------------------------
// startCreateKey
// ---------------------------------------------------------------------------
describe('startCreateKey', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves with a key object on success', async () => {
    const store = configureTestStore(baseState);

    const result = await store.dispatch(
      startCreateKey(
        [{chain: 'btc', currencyAbbreviation: 'btc', isToken: false}],
        'onboarding',
      ),
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('mock-key-id');
  });

  it('does not dispatch Analytics.track when context is "onboarding"', async () => {
    const {Analytics} = require('../../../analytics/analytics.effects');
    const store = configureTestStore(baseState);

    await store.dispatch(
      startCreateKey(
        [{chain: 'btc', currencyAbbreviation: 'btc', isToken: false}],
        'onboarding',
      ),
    );

    expect(Analytics.track).not.toHaveBeenCalled();
  });

  it('dispatches Analytics.track when context is not "onboarding"', async () => {
    const {Analytics} = require('../../../analytics/analytics.effects');
    const store = configureTestStore(baseState);

    await store.dispatch(
      startCreateKey(
        [{chain: 'btc', currencyAbbreviation: 'btc', isToken: false}],
        // no context or other context
      ),
    );

    expect(Analytics.track).toHaveBeenCalledWith('Created Key');
  });

  it('resolves even when individual wallet creation fails (error is caught internally)', async () => {
    // createMultipleWallets catches wallet creation errors and continues (returns null for that wallet)
    mockBwcClient.createWallet.mockImplementationOnce(
      (_n: any, _me: any, _m: any, _nn: any, _opts: any, cb: any) =>
        cb(Object.assign(new Error('wallet fail'), {name: 'bwc.ErrorOTHER'})),
    );

    const store = configureTestStore(baseState);

    // Errors in individual wallet creation are swallowed → result still resolves
    const result = await store.dispatch(
      startCreateKey([{chain: 'btc', currencyAbbreviation: 'btc', isToken: false}]),
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('mock-key-id');
    // wallets array will be empty because creation failed
    expect(result.wallets.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// startCreateKeyWithOpts
// ---------------------------------------------------------------------------
describe('startCreateKeyWithOpts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves with a key object when seed import succeeds', async () => {
    const store = configureTestStore(baseState);

    const result = await store.dispatch(
      startCreateKeyWithOpts({
        seedType: 'mnemonic',
        mnemonic: 'test test test test test test test test test test test test',
      }),
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('mock-key-id');
    expect(result.backupComplete).toBe(true);
  });

  it('resolves with backupComplete=true even when individual wallet creation fails', async () => {
    // createMultipleWallets catches wallet creation errors and continues
    mockBwcClient.createWallet.mockImplementationOnce(
      (_n: any, _me: any, _m: any, _nn: any, _opts: any, cb: any) =>
        cb(Object.assign(new Error('wallet error'), {name: 'bwc.ErrorOTHER'})),
    );

    const store = configureTestStore(baseState);

    const result = await store.dispatch(
      startCreateKeyWithOpts({seedType: 'mnemonic', mnemonic: 'bad words'}),
    );

    expect(result).toBeDefined();
    expect(result.backupComplete).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createWalletWithOpts
// ---------------------------------------------------------------------------
describe('createWalletWithOpts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves with a bwcClient on success', async () => {
    // bwcClient.createWallet calls cb(null) → resolves
    const store = configureTestStore(baseState);

    const result = await store.dispatch(
      createWalletWithOpts({
        key: mockKeyMethods as any,
        opts: {
          coin: 'btc',
          chain: 'btc',
          networkName: 'livenet',
          account: 0,
          n: 1,
          m: 1,
          name: 'My Wallet',
        },
      }),
    );

    expect(result).toBeDefined();
    expect(mockBwcClient.createWallet).toHaveBeenCalled();
  });

  it('rejects on generic error from createWallet', async () => {
    const genericError = Object.assign(new Error('generic wallet error'), {name: 'bwc.ErrorOTHER'});
    mockBwcClient.createWallet.mockImplementationOnce(
      (_n: any, _me: any, _m: any, _nn: any, _opts: any, cb: any) => cb(genericError),
    );

    const store = configureTestStore(baseState);

    await expect(
      store.dispatch(
        createWalletWithOpts({
          key: mockKeyMethods as any,
          opts: {coin: 'btc', chain: 'btc'},
        }),
      ),
    ).rejects.toThrow('generic wallet error');
  });

  it('increments account and retries on COPAYER_REGISTERED error', async () => {
    const copayerError = {name: 'bwc.ErrorCOPAYER_REGISTERED', message: 'registered'};
    let callCount = 0;
    mockBwcClient.createWallet.mockImplementation(
      (_n: any, _me: any, _m: any, _nn: any, _opts: any, cb: any) => {
        callCount++;
        if (callCount === 1) {
          cb(copayerError);
        } else {
          cb(null);
        }
      },
    );

    const store = configureTestStore(baseState);

    const result = await store.dispatch(
      createWalletWithOpts({
        key: mockKeyMethods as any,
        opts: {coin: 'btc', chain: 'btc', account: 0},
      }),
    );

    expect(result).toBeDefined();
    expect(callCount).toBeGreaterThanOrEqual(2);

    // Restore default implementation
    mockBwcClient.createWallet.mockImplementation(
      (_n: any, _me: any, _m: any, _nn: any, _opts: any, cb: any) => cb(null),
    );
  });

  it('rejects when COPAYER_REGISTERED and account >= 20', async () => {
    const copayerError = {name: 'bwc.ErrorCOPAYER_REGISTERED', message: 'registered'};
    mockBwcClient.createWallet.mockImplementation(
      (_n: any, _me: any, _m: any, _nn: any, _opts: any, cb: any) => cb(copayerError),
    );

    const store = configureTestStore(baseState);

    await expect(
      store.dispatch(
        createWalletWithOpts({
          key: mockKeyMethods as any,
          opts: {coin: 'btc', chain: 'btc', account: 20},
        }),
      ),
    ).rejects.toThrow('20 Wallet limit');

    // Restore default implementation
    mockBwcClient.createWallet.mockImplementation(
      (_n: any, _me: any, _m: any, _nn: any, _opts: any, cb: any) => cb(null),
    );
  });

  it('rejects when fromString throws (try/catch path)', async () => {
    mockBwcClient.fromString.mockImplementationOnce(() => {
      throw new Error('fromString failed');
    });

    const store = configureTestStore(baseState);

    await expect(
      store.dispatch(
        createWalletWithOpts({
          key: mockKeyMethods as any,
          opts: {coin: 'btc', chain: 'btc'},
        }),
      ),
    ).rejects.toThrow('fromString failed');
  });
});

// ---------------------------------------------------------------------------
// detectAndCreateTokensForEachEvmWallet
// ---------------------------------------------------------------------------
describe('detectAndCreateTokensForEachEvmWallet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns early (no error) when key has no VM wallets', async () => {
    const {IsVMChain} = require('../../utils/currency');
    IsVMChain.mockReturnValue(false);

    const key: any = {
      id: 'key-1',
      wallets: [makeMockWallet({chain: 'btc', currencyAbbreviation: 'btc'})],
    };

    const store = configureTestStore(baseState);
    await expect(
      store.dispatch(detectAndCreateTokensForEachEvmWallet({key})),
    ).resolves.toBeUndefined();
  });

  it('processes EVM wallets with no token balances (empty moralis response)', async () => {
    const {IsVMChain, IsERCToken} = require('../../utils/currency');
    IsVMChain.mockReturnValue(true);
    IsERCToken.mockReturnValue(false);

    const {getERC20TokenBalanceByWallet} = require('../../../moralis/moralis.effects');
    getERC20TokenBalanceByWallet.mockReturnValue(() => Promise.resolve([]));

    const wallet = makeMockWallet({chain: 'eth', currencyAbbreviation: 'eth'});
    const key: any = {id: 'key-1', wallets: [wallet]};

    const store = configureTestStore(baseState);
    await expect(
      store.dispatch(detectAndCreateTokensForEachEvmWallet({key})),
    ).resolves.toBeUndefined();
  });

  it('skips wallets that are ERC tokens themselves', async () => {
    const {IsVMChain, IsERCToken} = require('../../utils/currency');
    IsVMChain.mockReturnValue(true);
    IsERCToken.mockReturnValue(true); // wallet IS an ERC token → skip

    const wallet = makeMockWallet({chain: 'eth', currencyAbbreviation: 'usdc'});
    const key: any = {id: 'key-1', wallets: [wallet]};

    const store = configureTestStore(baseState);
    await expect(
      store.dispatch(detectAndCreateTokensForEachEvmWallet({key})),
    ).resolves.toBeUndefined();

    // No moralis calls since all wallets are ERC tokens
    const {getERC20TokenBalanceByWallet} = require('../../../moralis/moralis.effects');
    expect(getERC20TokenBalanceByWallet).not.toHaveBeenCalled();
  });

  it('skips wallets without a receiveAddress', async () => {
    const {IsVMChain, IsERCToken} = require('../../utils/currency');
    IsVMChain.mockReturnValue(true);
    IsERCToken.mockReturnValue(false);

    const wallet = makeMockWallet({chain: 'eth', receiveAddress: undefined});
    const key: any = {id: 'key-1', wallets: [wallet]};

    const store = configureTestStore(baseState);
    await expect(
      store.dispatch(detectAndCreateTokensForEachEvmWallet({key})),
    ).resolves.toBeUndefined();

    const {getERC20TokenBalanceByWallet} = require('../../../moralis/moralis.effects');
    expect(getERC20TokenBalanceByWallet).not.toHaveBeenCalled();
  });

  it('filters by chain when chain param is provided', async () => {
    const {IsVMChain, IsERCToken} = require('../../utils/currency');
    IsVMChain.mockReturnValue(true);
    IsERCToken.mockReturnValue(false);

    const {getERC20TokenBalanceByWallet} = require('../../../moralis/moralis.effects');
    getERC20TokenBalanceByWallet.mockReturnValue(() => Promise.resolve([]));

    const wallet = makeMockWallet({chain: 'matic', currencyAbbreviation: 'matic'});
    const key: any = {id: 'key-1', wallets: [wallet]};

    const store = configureTestStore(baseState);
    // Pass chain='eth' → matic wallet should be filtered out
    await store.dispatch(detectAndCreateTokensForEachEvmWallet({key, chain: 'eth'}));

    expect(getERC20TokenBalanceByWallet).not.toHaveBeenCalled();
  });

  it('skips already-present token when tokenAddress param matches existing token', async () => {
    const {IsVMChain, IsERCToken} = require('../../utils/currency');
    IsVMChain.mockReturnValue(true);
    IsERCToken.mockReturnValue(false);

    const existingTokenId = 'wallet-1-0xexistingtoken';
    const wallet = makeMockWallet({
      id: 'wallet-1',
      chain: 'eth',
      tokens: [existingTokenId],
    });
    const key: any = {id: 'key-1', wallets: [wallet]};

    const store = configureTestStore(baseState);
    // tokenAddress matches existing → wallet filtered out → no moralis call
    await store.dispatch(
      detectAndCreateTokensForEachEvmWallet({key, tokenAddress: '0xexistingtoken'}),
    );

    const {getERC20TokenBalanceByWallet} = require('../../../moralis/moralis.effects');
    expect(getERC20TokenBalanceByWallet).not.toHaveBeenCalled();
  });

  it('handles errors gracefully without throwing', async () => {
    const {IsVMChain, IsERCToken} = require('../../utils/currency');
    IsVMChain.mockReturnValue(true);
    IsERCToken.mockReturnValue(false);

    const {getERC20TokenBalanceByWallet} = require('../../../moralis/moralis.effects');
    getERC20TokenBalanceByWallet.mockReturnValue(() =>
      Promise.reject(new Error('moralis down')),
    );

    const wallet = makeMockWallet({chain: 'eth', currencyAbbreviation: 'eth'});
    const key: any = {id: 'key-1', wallets: [wallet]};

    const store = configureTestStore(baseState);
    // Should not throw
    await expect(
      store.dispatch(detectAndCreateTokensForEachEvmWallet({key})),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// addWallet – token wallet path (isToken=true)
// ---------------------------------------------------------------------------
describe('addWallet – token path', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects when key is encrypted and no password is provided for non-token', async () => {
    const encryptedKey: any = {
      id: 'key-enc',
      isPrivKeyEncrypted: true,
      wallets: [],
      methods: mockKeyMethods,
      properties: {xPrivKeyEDDSA: 'some-key'},
    };

    const store = configureTestStore(baseState);
    await expect(
      store.dispatch(
        addWallet({
          key: encryptedKey,
          currency: {chain: 'btc', currencyAbbreviation: 'btc', isToken: false},
          options: {},
        }),
      ),
    ).rejects.toThrow('A password is required');
  });

  it('accepts password for encrypted non-token key when password is provided', async () => {
    // When password is provided, the encrypted key check passes
    const encryptedKey: any = {
      id: 'key-enc',
      isPrivKeyEncrypted: true,
      wallets: [],
      methods: {
        ...mockKeyMethods,
        addKeyByAlgorithm: jest.fn(),
        toObj: jest.fn(() => ({})),
      },
      properties: {xPrivKeyEDDSA: 'some-eddsa-key'},
    };

    const store = configureTestStore(baseState);

    // Providing a password should pass the check (no "password required" error)
    // The wallet creation will proceed - either resolving or rejecting for other reasons
    let errorMessage = '';
    try {
      await store.dispatch(
        addWallet({
          key: encryptedKey,
          currency: {chain: 'btc', currencyAbbreviation: 'btc', isToken: false},
          options: {password: 'mypassword'},
        }),
      );
    } catch (e: any) {
      errorMessage = e?.message || String(e);
    }

    // Should NOT be the "password required" error
    expect(errorMessage).not.toContain('A password is required');
  });

  it('resolves for non-encrypted key without password', async () => {
    // Non-encrypted key doesn't need a password
    const normalKey: any = {
      id: 'key-1',
      isPrivKeyEncrypted: false,
      wallets: [],
      methods: {
        ...mockKeyMethods,
        addKeyByAlgorithm: jest.fn(),
        toObj: jest.fn(() => ({})),
      },
      properties: {xPrivKeyEDDSA: 'some-eddsa-key'},
    };

    const store = configureTestStore(baseState);

    const result = await store.dispatch(
      addWallet({
        key: normalKey,
        currency: {chain: 'btc', currencyAbbreviation: 'btc', isToken: false},
        options: {},
      }),
    );

    expect(result).toBeDefined();
  });
});

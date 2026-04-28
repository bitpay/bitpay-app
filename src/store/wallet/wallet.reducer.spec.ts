/**
 * Tests for wallet.reducer.ts
 *
 * Each action handled by walletReducer is exercised as a pure function:
 *   walletReducer(state, action) → newState
 *
 * No Redux store or middleware is needed — reducers are pure functions.
 */

import {walletReducer, initialState, WalletState} from './wallet.reducer';
import {WalletActionTypes} from './wallet.types';
import {FeeLevels} from './effects/fee/fee';
import {Key, Wallet, CryptoBalance} from './wallet.models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeBalance = (
  overrides: Partial<CryptoBalance> = {},
): CryptoBalance => ({
  crypto: '0',
  cryptoLocked: '0',
  cryptoConfirmedLocked: '0',
  cryptoSpendable: '0',
  cryptoPending: '0',
  sat: 0,
  satAvailable: 0,
  satLocked: 0,
  satConfirmedLocked: 0,
  satConfirmed: 0,
  satConfirmedAvailable: 0,
  satSpendable: 0,
  satPending: 0,
  ...overrides,
});

/** Build a minimal Wallet stub — only the fields the reducer actually reads */
const makeWallet = (overrides: Partial<Wallet> = {}): Wallet =>
  ({
    id: 'wallet-1',
    keyId: 'key-1',
    chain: 'btc',
    chainName: 'Bitcoin',
    currencyName: 'Bitcoin',
    currencyAbbreviation: 'BTC',
    m: 1,
    n: 1,
    balance: makeBalance() as any,
    copayers: [],
    pendingTxps: [],
    img: '',
    network: 'livenet',
    hideWallet: false,
    hideWalletByAccount: false,
    receiveAddress: undefined,
    isScanning: false,
    transactionHistory: undefined,
    ...overrides,
  } as unknown as Wallet);

/** Build a minimal Key stub */
const makeKey = (overrides: Partial<Key> = {}): Key => ({
  id: 'key-1',
  wallets: [],
  properties: undefined,
  methods: undefined,
  backupComplete: false,
  totalBalance: 0,
  totalBalanceLastDay: 0,
  isPrivKeyEncrypted: false,
  hideKeyBalance: false,
  isReadOnly: false,
  ...overrides,
});

/** Return a fresh initialState clone so mutations don't bleed between tests */
const freshState = (): WalletState => ({
  ...initialState,
  portfolioBalance: {...initialState.portfolioBalance},
  keys: {},
  balanceCacheKey: {},
  feeLevel: {...initialState.feeLevel},
});

/** State pre-seeded with one key containing one wallet */
const stateWithKey = (
  keyOverrides: Partial<Key> = {},
  walletOverrides: Partial<Wallet> = {},
): WalletState => {
  const wallet = makeWallet(walletOverrides);
  const key = makeKey({wallets: [wallet], ...keyOverrides});
  return {
    ...freshState(),
    keys: {'key-1': key},
  };
};

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

describe('walletReducer — default state', () => {
  it('returns initialState when called with undefined state and unknown action', () => {
    const state = walletReducer(undefined, {type: '@@INIT'} as any);
    expect(state.keys).toEqual({});
    expect(state.walletTermsAccepted).toBe(false);
    expect(state.useUnconfirmedFunds).toBe(false);
    expect(state.customizeNonce).toBe(false);
    expect(state.queuedTransactions).toBe(false);
    expect(state.enableReplaceByFee).toBe(false);
    expect(state.customTokensMigrationComplete).toBe(false);
    expect(state.polygonMigrationComplete).toBe(false);
    expect(state.accountEvmCreationMigrationComplete).toBe(false);
    expect(state.accountSvmCreationMigrationComplete).toBe(false);
    expect(state.svmAddressFixComplete).toBe(false);
    expect(state.pendingJoinerSession).toBeNull();
    expect(state.tssEnabled).toBe(false);
  });

  it('has the correct initial feeLevel defaults', () => {
    const state = walletReducer(undefined, {type: '@@INIT'} as any);
    expect(state.feeLevel.btc).toBe(FeeLevels.NORMAL);
    expect(state.feeLevel.eth).toBe(FeeLevels.PRIORITY);
    expect(state.feeLevel.matic).toBe(FeeLevels.NORMAL);
    expect(state.feeLevel.sol).toBe(FeeLevels.NORMAL);
  });

  it('has zeroed portfolio balance by default', () => {
    const state = walletReducer(undefined, {type: '@@INIT'} as any);
    expect(state.portfolioBalance).toEqual({
      current: 0,
      lastDay: 0,
      previous: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_CREATE_KEY
// ---------------------------------------------------------------------------

describe('SUCCESS_CREATE_KEY', () => {
  it('adds a new key to the keys map', () => {
    const key = makeKey({id: 'key-abc'});
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SUCCESS_CREATE_KEY,
      payload: {key},
    });
    expect(state.keys['key-abc']).toEqual(key);
  });

  it('preserves existing keys when adding a new one', () => {
    const existing = makeKey({id: 'key-existing'});
    const base: WalletState = {
      ...freshState(),
      keys: {'key-existing': existing},
    };
    const newKey = makeKey({id: 'key-new'});
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_CREATE_KEY,
      payload: {key: newKey},
    });
    expect(Object.keys(state.keys)).toHaveLength(2);
    expect(state.keys['key-existing']).toEqual(existing);
    expect(state.keys['key-new']).toEqual(newKey);
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_UPDATE_KEY / SUCCESS_ADD_WALLET / SUCCESS_IMPORT
// ---------------------------------------------------------------------------

describe('SUCCESS_UPDATE_KEY / SUCCESS_ADD_WALLET / SUCCESS_IMPORT', () => {
  const actionTypes = [
    WalletActionTypes.SUCCESS_UPDATE_KEY,
    WalletActionTypes.SUCCESS_ADD_WALLET,
    WalletActionTypes.SUCCESS_IMPORT,
  ] as const;

  actionTypes.forEach(type => {
    it(`[${type}] upserts key into the keys map`, () => {
      const key = makeKey({id: 'key-1', keyName: 'Updated'});
      const state = walletReducer(freshState(), {type, payload: {key}} as any);
      expect(state.keys['key-1'].keyName).toBe('Updated');
    });
  });
});

// ---------------------------------------------------------------------------
// SET_BACKUP_COMPLETE
// ---------------------------------------------------------------------------

describe('SET_BACKUP_COMPLETE', () => {
  it('marks backupComplete=true on the targeted key', () => {
    const base = stateWithKey({backupComplete: false});
    const state = walletReducer(base, {
      type: WalletActionTypes.SET_BACKUP_COMPLETE,
      payload: 'key-1',
    });
    expect(state.keys['key-1'].backupComplete).toBe(true);
  });

  it('returns unchanged state when keyId does not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.SET_BACKUP_COMPLETE,
      payload: 'nonexistent-key',
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// DELETE_KEY
// ---------------------------------------------------------------------------

describe('DELETE_KEY', () => {
  it('removes the key from the keys map', () => {
    const base = stateWithKey({id: 'key-1', totalBalance: 100});
    const state = walletReducer(base, {
      type: WalletActionTypes.DELETE_KEY,
      payload: {keyId: 'key-1'},
    });
    expect(state.keys['key-1']).toBeUndefined();
  });

  it('subtracts the deleted key totalBalance from the portfolio balance', () => {
    const key = makeKey({id: 'key-1', totalBalance: 500});
    const base: WalletState = {
      ...freshState(),
      keys: {'key-1': key},
      portfolioBalance: {current: 1000, lastDay: 800, previous: 0},
    };
    const state = walletReducer(base, {
      type: WalletActionTypes.DELETE_KEY,
      payload: {keyId: 'key-1'},
    });
    expect(state.portfolioBalance.current).toBe(500);
    expect(state.portfolioBalance.lastDay).toBe(300);
    expect(state.portfolioBalance.previous).toBe(0);
  });

  it('returns unchanged state when keyId does not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.DELETE_KEY,
      payload: {keyId: 'ghost'},
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// SET_WALLET_TERMS_ACCEPTED
// ---------------------------------------------------------------------------

describe('SET_WALLET_TERMS_ACCEPTED', () => {
  it('sets walletTermsAccepted to true', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SET_WALLET_TERMS_ACCEPTED,
    });
    expect(state.walletTermsAccepted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_PORTFOLIO_BALANCE
// ---------------------------------------------------------------------------

describe('UPDATE_PORTFOLIO_BALANCE', () => {
  it('sums totalBalance across all keys for current', () => {
    const key1 = makeKey({
      id: 'k1',
      totalBalance: 200,
      totalBalanceLastDay: 150,
    });
    const key2 = makeKey({
      id: 'k2',
      totalBalance: 300,
      totalBalanceLastDay: 250,
    });
    const base: WalletState = {...freshState(), keys: {k1: key1, k2: key2}};
    const state = walletReducer(base, {
      type: WalletActionTypes.UPDATE_PORTFOLIO_BALANCE,
    });
    expect(state.portfolioBalance.current).toBe(500);
    expect(state.portfolioBalance.lastDay).toBe(400);
    expect(state.portfolioBalance.previous).toBe(0);
  });

  it('computes 0 when there are no keys', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.UPDATE_PORTFOLIO_BALANCE,
    });
    expect(state.portfolioBalance.current).toBe(0);
    expect(state.portfolioBalance.lastDay).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_UPDATE_KEYS_TOTAL_BALANCE
// ---------------------------------------------------------------------------

describe('SUCCESS_UPDATE_KEYS_TOTAL_BALANCE', () => {
  it('updates totalBalance and totalBalanceLastDay on existing keys', () => {
    const base = stateWithKey();
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_UPDATE_KEYS_TOTAL_BALANCE,
      payload: [
        {keyId: 'key-1', totalBalance: 9999, totalBalanceLastDay: 8888},
      ],
    });
    expect(state.keys['key-1'].totalBalance).toBe(9999);
    expect(state.keys['key-1'].totalBalanceLastDay).toBe(8888);
  });

  it('sets a balanceCacheKey entry for the updated key', () => {
    const base = stateWithKey();
    const before = Date.now();
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_UPDATE_KEYS_TOTAL_BALANCE,
      payload: [{keyId: 'key-1', totalBalance: 1, totalBalanceLastDay: 1}],
    });
    expect(state.balanceCacheKey['key-1']).toBeGreaterThanOrEqual(before);
  });

  it('ignores entries for keys that do not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_UPDATE_KEYS_TOTAL_BALANCE,
      payload: [{keyId: 'ghost', totalBalance: 100, totalBalanceLastDay: 100}],
    });
    expect(state.keys.ghost).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_UPDATE_ALL_KEYS_AND_STATUS
// ---------------------------------------------------------------------------

describe('SUCCESS_UPDATE_ALL_KEYS_AND_STATUS', () => {
  it('stamps balanceCacheKey.all with a timestamp', () => {
    const before = Date.now();
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SUCCESS_UPDATE_ALL_KEYS_AND_STATUS,
    });
    expect(state.balanceCacheKey.all).toBeGreaterThanOrEqual(before);
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_UPDATE_WALLET_STATUS
// ---------------------------------------------------------------------------

describe('SUCCESS_UPDATE_WALLET_STATUS', () => {
  it('updates balance, pendingTxps, singleAddress on the matching wallet', () => {
    const base = stateWithKey({}, {id: 'wallet-1'});
    const newBalance = makeBalance({sat: 12345});
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_UPDATE_WALLET_STATUS,
      payload: {
        keyId: 'key-1',
        walletId: 'wallet-1',
        status: {balance: newBalance, pendingTxps: [], singleAddress: true},
      },
    });
    expect((state.keys['key-1'].wallets[0] as any).balance).toEqual(newBalance);
    expect((state.keys['key-1'].wallets[0] as any).singleAddress).toBe(true);
  });

  it('sets a balanceCacheKey entry for the wallet', () => {
    const base = stateWithKey();
    const before = Date.now();
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_UPDATE_WALLET_STATUS,
      payload: {
        keyId: 'key-1',
        walletId: 'wallet-1',
        status: {balance: makeBalance(), pendingTxps: [], singleAddress: false},
      },
    });
    expect(state.balanceCacheKey['wallet-1']).toBeGreaterThanOrEqual(before);
  });

  it('returns unchanged state when key does not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_UPDATE_WALLET_STATUS,
      payload: {
        keyId: 'missing',
        walletId: 'wallet-1',
        status: {balance: makeBalance(), pendingTxps: [], singleAddress: false},
      },
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_GET_CUSTOM_TOKEN_OPTIONS
// ---------------------------------------------------------------------------

describe('SUCCESS_GET_CUSTOM_TOKEN_OPTIONS', () => {
  it('merges new custom token options into existing ones', () => {
    const base: WalletState = {
      ...freshState(),
      customTokenOptionsByAddress: {'0xold': {symbol: 'OLD'} as any},
    };
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_GET_CUSTOM_TOKEN_OPTIONS,
      payload: {
        customTokenOptionsByAddress: {'0xnew': {symbol: 'NEW'} as any},
        customTokenDataByAddress: {'0xnew': {coin: 'eth'} as any},
      },
    });
    expect(state.customTokenOptionsByAddress['0xold']).toBeDefined();
    expect(state.customTokenOptionsByAddress['0xnew']).toBeDefined();
    expect(state.customTokenDataByAddress['0xnew']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_GET_RECEIVE_ADDRESS
// ---------------------------------------------------------------------------

describe('SUCCESS_GET_RECEIVE_ADDRESS', () => {
  it('sets the receiveAddress on the matching wallet', () => {
    const base = stateWithKey({}, {id: 'wallet-1'});
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_GET_RECEIVE_ADDRESS,
      payload: {
        keyId: 'key-1',
        walletId: 'wallet-1',
        receiveAddress: '1BpEi6DfDAUFd153wiGrvkiZWhavi',
      },
    });
    expect((state.keys['key-1'].wallets[0] as any).receiveAddress).toBe(
      '1BpEi6DfDAUFd153wiGrvkiZWhavi',
    );
  });

  it('returns unchanged state when key does not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_GET_RECEIVE_ADDRESS,
      payload: {keyId: 'nope', walletId: 'wallet-1', receiveAddress: 'addr'},
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_KEY_NAME
// ---------------------------------------------------------------------------

describe('UPDATE_KEY_NAME', () => {
  it('updates the keyName on the specified key', () => {
    const base = stateWithKey();
    const state = walletReducer(base, {
      type: WalletActionTypes.UPDATE_KEY_NAME,
      payload: {keyId: 'key-1', name: 'My BTC Key'},
    });
    expect(state.keys['key-1'].keyName).toBe('My BTC Key');
  });

  it('returns unchanged state when key does not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.UPDATE_KEY_NAME,
      payload: {keyId: 'ghost', name: 'Ghost'},
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_WALLET_NAME
// ---------------------------------------------------------------------------

describe('UPDATE_WALLET_NAME', () => {
  it('updates walletName on the matching wallet', () => {
    const base = stateWithKey({}, {id: 'wallet-1'});
    const state = walletReducer(base, {
      type: WalletActionTypes.UPDATE_WALLET_NAME,
      payload: {keyId: 'key-1', walletId: 'wallet-1', name: 'Savings'},
    });
    expect((state.keys['key-1'].wallets[0] as any).walletName).toBe('Savings');
  });

  it('returns unchanged state when key does not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.UPDATE_WALLET_NAME,
      payload: {keyId: 'ghost', walletId: 'wallet-1', name: 'Name'},
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_ACCOUNT_NAME
// ---------------------------------------------------------------------------

describe('UPDATE_ACCOUNT_NAME', () => {
  it('sets evmAccountsInfo name for the given address', () => {
    const base = stateWithKey();
    const state = walletReducer(base, {
      type: WalletActionTypes.UPDATE_ACCOUNT_NAME,
      payload: {keyId: 'key-1', accountAddress: '0xabc', name: 'Trading'},
    });
    expect(state.keys['key-1'].evmAccountsInfo?.['0xabc']?.name).toBe(
      'Trading',
    );
  });

  it('returns unchanged state when key does not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.UPDATE_ACCOUNT_NAME,
      payload: {keyId: 'ghost', accountAddress: '0x1', name: 'N'},
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// SET_WALLET_SCANNING
// ---------------------------------------------------------------------------

describe('SET_WALLET_SCANNING', () => {
  it('sets isScanning=true on the target wallet', () => {
    const base = stateWithKey({}, {id: 'wallet-1', isScanning: false});
    const state = walletReducer(base, {
      type: WalletActionTypes.SET_WALLET_SCANNING,
      payload: {keyId: 'key-1', walletId: 'wallet-1', isScanning: true},
    });
    expect((state.keys['key-1'].wallets[0] as any).isScanning).toBe(true);
  });

  it('returns unchanged state when key does not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.SET_WALLET_SCANNING,
      payload: {keyId: 'nope', walletId: 'wallet-1', isScanning: true},
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_WALLET_TX_HISTORY
// ---------------------------------------------------------------------------

describe('UPDATE_WALLET_TX_HISTORY', () => {
  it('sets transactionHistory on the matching wallet', () => {
    const base = stateWithKey({}, {id: 'wallet-1'});
    const history = {
      transactions: [{id: 'tx1'}],
      loadMore: false,
      hasConfirmingTxs: false,
    };
    const state = walletReducer(base, {
      type: WalletActionTypes.UPDATE_WALLET_TX_HISTORY,
      payload: {
        keyId: 'key-1',
        walletId: 'wallet-1',
        transactionHistory: history,
      },
    });
    expect((state.keys['key-1'].wallets[0] as any).transactionHistory).toEqual(
      history,
    );
  });

  it('returns unchanged state when key does not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.UPDATE_WALLET_TX_HISTORY,
      payload: {
        keyId: 'ghost',
        walletId: 'wallet-1',
        transactionHistory: {
          transactions: [],
          loadMore: false,
          hasConfirmingTxs: false,
        },
      },
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_ACCOUNT_TX_HISTORY
// ---------------------------------------------------------------------------

describe('UPDATE_ACCOUNT_TX_HISTORY', () => {
  it('applies transactionHistory to matching wallets by id', () => {
    const base = stateWithKey({}, {id: 'wallet-1'});
    const history = {
      transactions: [{id: 'tx2'}],
      loadMore: true,
      hasConfirmingTxs: true,
    };
    const state = walletReducer(base, {
      type: WalletActionTypes.UPDATE_ACCOUNT_TX_HISTORY,
      payload: {
        keyId: 'key-1',
        accountTransactionsHistory: {'wallet-1': history},
      },
    });
    expect((state.keys['key-1'].wallets[0] as any).transactionHistory).toEqual(
      history,
    );
  });
});

// ---------------------------------------------------------------------------
// SET_USE_UNCONFIRMED_FUNDS
// ---------------------------------------------------------------------------

describe('SET_USE_UNCONFIRMED_FUNDS', () => {
  it('sets useUnconfirmedFunds to true', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SET_USE_UNCONFIRMED_FUNDS,
      payload: true,
    });
    expect(state.useUnconfirmedFunds).toBe(true);
  });

  it('sets useUnconfirmedFunds back to false', () => {
    const base: WalletState = {...freshState(), useUnconfirmedFunds: true};
    const state = walletReducer(base, {
      type: WalletActionTypes.SET_USE_UNCONFIRMED_FUNDS,
      payload: false,
    });
    expect(state.useUnconfirmedFunds).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SET_CUSTOMIZE_NONCE
// ---------------------------------------------------------------------------

describe('SET_CUSTOMIZE_NONCE', () => {
  it('toggles customizeNonce', () => {
    const s1 = walletReducer(freshState(), {
      type: WalletActionTypes.SET_CUSTOMIZE_NONCE,
      payload: true,
    });
    expect(s1.customizeNonce).toBe(true);
    const s2 = walletReducer(s1, {
      type: WalletActionTypes.SET_CUSTOMIZE_NONCE,
      payload: false,
    });
    expect(s2.customizeNonce).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SET_QUEUED_TRANSACTIONS
// ---------------------------------------------------------------------------

describe('SET_QUEUED_TRANSACTIONS', () => {
  it('sets queuedTransactions to true', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SET_QUEUED_TRANSACTIONS,
      payload: true,
    });
    expect(state.queuedTransactions).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SET_ENABLE_REPLACE_BY_FEE
// ---------------------------------------------------------------------------

describe('SET_ENABLE_REPLACE_BY_FEE', () => {
  it('sets enableReplaceByFee to true', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SET_ENABLE_REPLACE_BY_FEE,
      payload: true,
    });
    expect(state.enableReplaceByFee).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SYNC_WALLETS
// ---------------------------------------------------------------------------

describe('SYNC_WALLETS', () => {
  it('concatenates new wallets to the existing wallet list', () => {
    const base = stateWithKey({}, {id: 'wallet-1'});
    const newWallet = makeWallet({id: 'wallet-2'});
    const state = walletReducer(base, {
      type: WalletActionTypes.SYNC_WALLETS,
      payload: {keyId: 'key-1', wallets: [newWallet]},
    });
    expect(state.keys['key-1'].wallets).toHaveLength(2);
    expect(state.keys['key-1'].wallets[1].id).toBe('wallet-2');
  });

  it('returns unchanged state when key does not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.SYNC_WALLETS,
      payload: {keyId: 'ghost', wallets: [makeWallet()]},
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// TOGGLE_HIDE_WALLET
// ---------------------------------------------------------------------------

describe('TOGGLE_HIDE_WALLET', () => {
  it('toggles hideWallet from false to true', () => {
    const base = stateWithKey({}, {id: 'wallet-1', hideWallet: false});
    const wallet = base.keys['key-1'].wallets[0];
    const state = walletReducer(base, {
      type: WalletActionTypes.TOGGLE_HIDE_WALLET,
      payload: {wallet},
    });
    expect((state.keys['key-1'].wallets[0] as any).hideWallet).toBe(true);
  });

  it('toggles hideWallet from true to false', () => {
    const base = stateWithKey({}, {id: 'wallet-1', hideWallet: true});
    const wallet = base.keys['key-1'].wallets[0];
    const state = walletReducer(base, {
      type: WalletActionTypes.TOGGLE_HIDE_WALLET,
      payload: {wallet},
    });
    expect((state.keys['key-1'].wallets[0] as any).hideWallet).toBe(false);
  });

  it('returns unchanged state when key does not exist', () => {
    const base = freshState();
    const wallet = makeWallet({keyId: 'ghost'});
    const state = walletReducer(base, {
      type: WalletActionTypes.TOGGLE_HIDE_WALLET,
      payload: {wallet},
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// TOGGLE_HIDE_ACCOUNT
// ---------------------------------------------------------------------------

describe('TOGGLE_HIDE_ACCOUNT', () => {
  it('sets hideAccount=true for a new account address', () => {
    const base = stateWithKey({}, {receiveAddress: '0xabc'});
    const state = walletReducer(base, {
      type: WalletActionTypes.TOGGLE_HIDE_ACCOUNT,
      payload: {
        keyId: 'key-1',
        accountAddress: '0xabc',
        accountToggleSelected: true,
      },
    });
    expect(state.keys['key-1'].evmAccountsInfo?.['0xabc']?.hideAccount).toBe(
      true,
    );
  });

  it('also sets hideWalletByAccount on wallets with matching receiveAddress', () => {
    const base = stateWithKey(
      {},
      {id: 'wallet-1', receiveAddress: '0xabc', hideWalletByAccount: false},
    );
    const state = walletReducer(base, {
      type: WalletActionTypes.TOGGLE_HIDE_ACCOUNT,
      payload: {keyId: 'key-1', accountAddress: '0xabc'},
    });
    expect((state.keys['key-1'].wallets[0] as any).hideWalletByAccount).toBe(
      true,
    );
  });

  it('returns unchanged state when key does not exist', () => {
    const base = freshState();
    const state = walletReducer(base, {
      type: WalletActionTypes.TOGGLE_HIDE_ACCOUNT,
      payload: {keyId: 'ghost', accountAddress: '0x1'},
    });
    expect(state).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_CACHE_FEE_LEVEL
// ---------------------------------------------------------------------------

describe('UPDATE_CACHE_FEE_LEVEL', () => {
  it('updates the fee level for the given currency', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.UPDATE_CACHE_FEE_LEVEL,
      payload: {currency: 'btc', feeLevel: FeeLevels.URGENT},
    });
    expect(state.feeLevel.btc).toBe(FeeLevels.URGENT);
  });

  it('does not affect fee levels for other currencies', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.UPDATE_CACHE_FEE_LEVEL,
      payload: {currency: 'btc', feeLevel: FeeLevels.ECONOMY},
    });
    expect(state.feeLevel.eth).toBe(FeeLevels.PRIORITY);
  });
});

// ---------------------------------------------------------------------------
// Migration flags
// ---------------------------------------------------------------------------

describe('migration flags', () => {
  it('SET_CUSTOM_TOKENS_MIGRATION_COMPLETE sets flag to true', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SET_CUSTOM_TOKENS_MIGRATION_COMPLETE,
    });
    expect(state.customTokensMigrationComplete).toBe(true);
  });

  it('SET_POLYGON_MIGRATION_COMPLETE sets flag to true', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SET_POLYGON_MIGRATION_COMPLETE,
    });
    expect(state.polygonMigrationComplete).toBe(true);
  });

  it('SET_ACCOUNT_EVM_CREATION_MIGRATION_COMPLETE sets flag to true', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SET_ACCOUNT_EVM_CREATION_MIGRATION_COMPLETE,
    });
    expect(state.accountEvmCreationMigrationComplete).toBe(true);
  });

  it('SET_ACCOUNT_SVM_CREATION_MIGRATION_COMPLETE sets flag to true', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SET_ACCOUNT_SVM_CREATION_MIGRATION_COMPLETE,
    });
    expect(state.accountSvmCreationMigrationComplete).toBe(true);
  });

  it('SET_SVM_ADDRESS_CREATION_FIX_COMPLETE sets svmAddressFixComplete to true', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SET_SVM_ADDRESS_CREATION_FIX_COMPLETE,
    });
    expect(state.svmAddressFixComplete).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_UPDATE_WALLET_BALANCES_AND_STATUS
// ---------------------------------------------------------------------------

describe('SUCCESS_UPDATE_WALLET_BALANCES_AND_STATUS', () => {
  it('updates key totalBalance and totalBalanceLastDay', () => {
    const base = stateWithKey({totalBalance: 0, totalBalanceLastDay: 0});
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_UPDATE_WALLET_BALANCES_AND_STATUS,
      payload: {
        keyBalances: [
          {keyId: 'key-1', totalBalance: 777, totalBalanceLastDay: 666},
        ],
        walletBalances: [],
      },
    });
    expect(state.keys['key-1'].totalBalance).toBe(777);
    expect(state.keys['key-1'].totalBalanceLastDay).toBe(666);
  });

  it('updates wallet balance and status', () => {
    const base = stateWithKey({}, {id: 'wallet-1'});
    const newBalance = makeBalance({sat: 9999});
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_UPDATE_WALLET_BALANCES_AND_STATUS,
      payload: {
        keyBalances: [],
        walletBalances: [
          {
            keyId: 'key-1',
            walletId: 'wallet-1',
            status: {balance: newBalance, pendingTxps: [], singleAddress: true},
          },
        ],
      },
    });
    expect((state.keys['key-1'].wallets[0] as any).balance).toEqual(newBalance);
    expect((state.keys['key-1'].wallets[0] as any).singleAddress).toBe(true);
  });

  it('recalculates portfolio balance based on updated key totals', () => {
    const key1 = makeKey({
      id: 'k1',
      totalBalance: 100,
      totalBalanceLastDay: 80,
    });
    const key2 = makeKey({
      id: 'k2',
      totalBalance: 200,
      totalBalanceLastDay: 160,
    });
    const base: WalletState = {
      ...freshState(),
      keys: {k1: key1, k2: key2},
      portfolioBalance: {current: 100, lastDay: 80, previous: 0},
    };
    const state = walletReducer(base, {
      type: WalletActionTypes.SUCCESS_UPDATE_WALLET_BALANCES_AND_STATUS,
      payload: {
        keyBalances: [
          {keyId: 'k1', totalBalance: 150, totalBalanceLastDay: 120},
          {keyId: 'k2', totalBalance: 250, totalBalanceLastDay: 200},
        ],
        walletBalances: [],
      },
    });
    expect(state.portfolioBalance.current).toBe(400);
    expect(state.portfolioBalance.lastDay).toBe(320);
    // previous should be the prior current
    expect(state.portfolioBalance.previous).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// SET_PENDING_JOINER_SESSION / REMOVE_PENDING_JOINER_SESSION
// ---------------------------------------------------------------------------

describe('SET_PENDING_JOINER_SESSION', () => {
  it('stores the session in pendingJoinerSession', () => {
    const session = {walletId: 'w1', secret: 'abc'} as any;
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SET_PENDING_JOINER_SESSION,
      payload: session,
    });
    expect(state.pendingJoinerSession).toEqual(session);
  });
});

describe('REMOVE_PENDING_JOINER_SESSION', () => {
  it('resets pendingJoinerSession to null', () => {
    const base: WalletState = {
      ...freshState(),
      pendingJoinerSession: {walletId: 'w1', secret: 'abc'} as any,
    };
    const state = walletReducer(base, {
      type: WalletActionTypes.REMOVE_PENDING_JOINER_SESSION,
    } as any);
    expect(state.pendingJoinerSession).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SET_TSS_ENABLED
// ---------------------------------------------------------------------------

describe('SET_TSS_ENABLED', () => {
  it('sets tssEnabled to true', () => {
    const state = walletReducer(freshState(), {
      type: WalletActionTypes.SET_TSS_ENABLED,
      payload: true,
    });
    expect(state.tssEnabled).toBe(true);
  });

  it('sets tssEnabled back to false', () => {
    const base: WalletState = {...freshState(), tssEnabled: true};
    const state = walletReducer(base, {
      type: WalletActionTypes.SET_TSS_ENABLED,
      payload: false,
    });
    expect(state.tssEnabled).toBe(false);
  });
});

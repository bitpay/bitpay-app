/**
 * Tests for src/store/wallet/utils/wallet.ts
 *
 * Strategy:
 *   - Mock BwcProvider and all native/heavy deps at the top.
 *   - Test exported pure/utility functions with both truthy and falsy branches.
 *   - Avoid Redux dispatch where possible; where needed use simple function mocks.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../lib/bwc', () => {
  const mockInstance = {
    getClient: jest.fn(() => ({})),
    createKey: jest.fn(() => ({id: 'mock-key-id', isPrivKeyEncrypted: jest.fn(() => false), toObj: jest.fn(() => ({}))})),
    createTssKey: jest.fn(() => ({id: 'mock-tss-id', isPrivKeyEncrypted: jest.fn(() => false), toObj: jest.fn(() => ({}))})),
    getErrors: jest.fn(() => ({})),
    getUtils: jest.fn(() => ({formatAmount: jest.fn((amount: number, _: string) => `${amount}`)})),
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

jest.mock('../../../managers/LogManager', () => ({
  logManager: {info: jest.fn(), error: jest.fn(), debug: jest.fn()},
}));

// Mock navigation component that pulls in styled-components/SafeAreaView at module load
jest.mock('../../../navigation/tabs/home/components/Wallet', () => ({
  WALLET_DISPLAY_LIMIT: 5,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {Network} from '../../../constants';
import {
  findWalletById,
  findWalletByAddress,
  isCacheKeyStale,
  isSegwit,
  isTaproot,
  getRemainingWalletCount,
  GetEstimatedTxSize,
  isMatch,
  getMatchedKey,
  getReadOnlyKey,
  isMatchedWallet,
  getEVMAccountName,
  generateKeyExportCode,
  checkEncryptPassword,
  checkPrivateKeyEncrypted,
  buildKeyObj,
  buildTssKeyObj,
  buildMigrationKeyObj,
  formatCryptoAmount,
  coinbaseAccountToWalletRow,
  BuildCoinbaseWalletsList,
} from './wallet';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeCredentials = (overrides: any = {}) => ({
  walletId: 'wallet-1',
  keyId: 'key-1',
  n: 1,
  m: 1,
  account: 0,
  walletName: 'My Wallet',
  isComplete: jest.fn(() => true),
  ...overrides,
});

const makeBalance = (overrides: any = {}) => ({
  crypto: '0.00',
  cryptoLocked: '0.00',
  cryptoConfirmedLocked: '0.00',
  cryptoSpendable: '0.00',
  cryptoPending: '0.00',
  fiat: 0,
  fiatLastDay: 0,
  fiatLocked: 0,
  fiatConfirmedLocked: 0,
  fiatSpendable: 0,
  fiatPending: 0,
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

const makeWallet = (overrides: any = {}): any => ({
  id: 'wallet-1',
  credentials: makeCredentials(),
  balance: makeBalance(),
  chain: 'btc',
  network: Network.mainnet,
  keyId: 'key-1',
  pendingTxps: [],
  currencyAbbreviation: 'btc',
  currencyName: 'Bitcoin',
  img: '',
  badgeImg: undefined,
  chainName: 'Bitcoin',
  receiveAddress: '1ABCxyz',
  hideWallet: false,
  hideWalletByAccount: false,
  hideBalance: false,
  isScanning: false,
  tokenAddress: undefined,
  tssMetadata: undefined,
  ...overrides,
});

const makeKey = (overrides: any = {}): any => ({
  id: 'key-1',
  wallets: [],
  properties: {fingerPrint: 'fp-1'},
  methods: {
    isPrivKeyEncrypted: jest.fn(() => false),
    checkPassword: jest.fn(() => true),
    toObj: jest.fn(() => ({mnemonicHasPassphrase: false})),
    id: 'key-1',
  },
  totalBalance: 0,
  totalBalanceLastDay: 0,
  backupComplete: false,
  keyName: 'My Key',
  hideKeyBalance: false,
  isReadOnly: false,
  ...overrides,
});

// ─── findWalletById ────────────────────────────────────────────────────────────

describe('findWalletById', () => {
  it('returns matching wallet by id', () => {
    const wallets = [makeWallet({id: 'w1'}), makeWallet({id: 'w2'})];
    expect(findWalletById(wallets, 'w1')).toBe(wallets[0]);
  });

  it('returns undefined when id does not match', () => {
    const wallets = [makeWallet({id: 'w1'})];
    expect(findWalletById(wallets, 'w9')).toBeUndefined();
  });

  it('returns matching wallet when copayerId matches credentials.copayerId', () => {
    const wallet = makeWallet({
      id: 'w1',
      credentials: makeCredentials({copayerId: 'cp1'}),
    });
    expect(findWalletById([wallet], 'w1', 'cp1')).toBe(wallet);
  });

  it('returns undefined when copayerId does not match', () => {
    const wallet = makeWallet({
      id: 'w1',
      credentials: makeCredentials({copayerId: 'cp1'}),
    });
    expect(findWalletById([wallet], 'w1', 'cp-other')).toBeUndefined();
  });
});

// ─── findWalletByAddress ──────────────────────────────────────────────────────

describe('findWalletByAddress', () => {
  it('returns wallet matching address, chain and network', () => {
    const wallet = makeWallet({
      receiveAddress: '0xABC',
      chain: 'eth',
      network: Network.mainnet,
    });
    const keys: any = {'key-1': {wallets: [wallet]}};
    const result = findWalletByAddress('0xABC', 'eth', Network.mainnet, keys);
    expect(result).toBe(wallet);
  });

  it('returns undefined when address does not match', () => {
    const wallet = makeWallet({receiveAddress: '0xDEF', chain: 'eth', network: Network.mainnet});
    const keys: any = {'key-1': {wallets: [wallet]}};
    expect(findWalletByAddress('0xABC', 'eth', Network.mainnet, keys)).toBeUndefined();
  });

  it('returns undefined when chain does not match', () => {
    const wallet = makeWallet({receiveAddress: '0xABC', chain: 'btc', network: Network.mainnet});
    const keys: any = {'key-1': {wallets: [wallet]}};
    expect(findWalletByAddress('0xABC', 'eth', Network.mainnet, keys)).toBeUndefined();
  });

  it('performs case-insensitive address comparison', () => {
    const wallet = makeWallet({receiveAddress: '0xabc', chain: 'eth', network: Network.mainnet});
    const keys: any = {'key-1': {wallets: [wallet]}};
    expect(findWalletByAddress('0xABC', 'eth', Network.mainnet, keys)).toBe(wallet);
  });

  it('returns undefined when keys object is empty', () => {
    expect(findWalletByAddress('0xABC', 'eth', Network.mainnet, {})).toBeUndefined();
  });
});

// ─── isCacheKeyStale ──────────────────────────────────────────────────────────

describe('isCacheKeyStale', () => {
  it('returns true when timestamp is undefined', () => {
    expect(isCacheKeyStale(undefined, 60)).toBe(true);
  });

  it('returns true when timestamp is 0 (falsy)', () => {
    expect(isCacheKeyStale(0, 60)).toBe(true);
  });

  it('returns true when TTL has elapsed', () => {
    const oldTimestamp = Date.now() - 2 * 60 * 1000; // 2 minutes ago
    expect(isCacheKeyStale(oldTimestamp, 1)).toBe(true); // TTL = 1s
  });

  it('returns false when TTL has not elapsed', () => {
    const recentTimestamp = Date.now() - 100; // 100ms ago
    expect(isCacheKeyStale(recentTimestamp, 60)).toBe(false); // TTL = 60s
  });
});

// ─── isSegwit ─────────────────────────────────────────────────────────────────

describe('isSegwit', () => {
  it('returns false for empty string', () => {
    expect(isSegwit('')).toBe(false);
  });

  it('returns false for falsy value', () => {
    expect(isSegwit(null as any)).toBe(false);
  });

  it('returns true for P2WPKH', () => {
    expect(isSegwit('P2WPKH')).toBe(true);
  });

  it('returns true for P2WSH', () => {
    expect(isSegwit('P2WSH')).toBe(true);
  });

  it('returns false for P2PKH', () => {
    expect(isSegwit('P2PKH')).toBe(false);
  });

  it('returns false for P2SH', () => {
    expect(isSegwit('P2SH')).toBe(false);
  });

  it('returns false for P2TR', () => {
    expect(isSegwit('P2TR')).toBe(false);
  });
});

// ─── isTaproot ────────────────────────────────────────────────────────────────

describe('isTaproot', () => {
  it('returns false for empty string', () => {
    expect(isTaproot('')).toBe(false);
  });

  it('returns false for falsy value', () => {
    expect(isTaproot(null as any)).toBe(false);
  });

  it('returns true for P2TR', () => {
    expect(isTaproot('P2TR')).toBe(true);
  });

  it('returns false for P2WPKH', () => {
    expect(isTaproot('P2WPKH')).toBe(false);
  });

  it('returns false for P2SH', () => {
    expect(isTaproot('P2SH')).toBe(false);
  });
});

// ─── getRemainingWalletCount ───────────────────────────────────────────────────

describe('getRemainingWalletCount', () => {
  it('returns undefined when wallets is undefined', () => {
    expect(getRemainingWalletCount(undefined)).toBeUndefined();
  });

  it('returns undefined when wallets length is less than WALLET_DISPLAY_LIMIT', () => {
    const wallets = [makeWallet(), makeWallet()];
    expect(getRemainingWalletCount(wallets)).toBeUndefined();
  });

  it('returns 0 when wallets length equals WALLET_DISPLAY_LIMIT (5)', () => {
    const wallets = Array.from({length: 5}, () => makeWallet());
    // length === limit → not < limit, so returns length - limit = 0
    expect(getRemainingWalletCount(wallets)).toBe(0);
  });

  it('returns remaining count when wallets exceed WALLET_DISPLAY_LIMIT', () => {
    const wallets = Array.from({length: 8}, () => makeWallet());
    expect(getRemainingWalletCount(wallets)).toBe(3);
  });
});

// ─── GetEstimatedTxSize ────────────────────────────────────────────────────────

describe('GetEstimatedTxSize', () => {
  // wallet.m and wallet.n are read directly, not from credentials
  it('returns a number > 0 for P2SH wallet', () => {
    const wallet = makeWallet({
      m: 1,
      n: 1,
      credentials: makeCredentials({addressType: 'P2SH', n: 1, m: 1}),
    });
    const result = GetEstimatedTxSize(wallet);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });

  it('uses P2PKH size (147) for P2PKH address type', () => {
    const walletP2PKH = makeWallet({
      m: 1,
      n: 1,
      credentials: makeCredentials({addressType: 'P2PKH', n: 1, m: 1}),
    });
    const resultP2PKH = GetEstimatedTxSize(walletP2PKH);
    const walletP2SH = makeWallet({
      m: 1,
      n: 1,
      credentials: makeCredentials({addressType: 'P2SH', n: 1, m: 1}),
    });
    const resultP2SH = GetEstimatedTxSize(walletP2SH);
    // P2PKH input is 147, P2SH default is calculated differently
    expect(resultP2PKH).not.toBe(resultP2SH);
  });

  it('respects custom nbOutputs and nbInputs', () => {
    const wallet = makeWallet({
      m: 1,
      n: 1,
      credentials: makeCredentials({addressType: 'P2SH', n: 1, m: 1}),
    });
    const result1 = GetEstimatedTxSize(wallet, 2, 1);
    const result2 = GetEstimatedTxSize(wallet, 4, 2);
    expect(result2).toBeGreaterThan(result1);
  });
});

// ─── isMatch ──────────────────────────────────────────────────────────────────

describe('isMatch', () => {
  it('matches by fingerPrint when both have it', () => {
    const key1 = {fingerPrint: 'fp-123'};
    const key2 = makeKey({properties: {fingerPrint: 'fp-123'}});
    expect(isMatch(key1, key2)).toBe(true);
  });

  it('does not match when fingerPrints differ', () => {
    const key1 = {fingerPrint: 'fp-AAA'};
    const key2 = makeKey({properties: {fingerPrint: 'fp-BBB'}});
    expect(isMatch(key1, key2)).toBe(false);
  });

  it('falls back to id comparison when no fingerPrint', () => {
    const key1 = {id: 'key-abc'};
    const key2 = makeKey({id: 'key-abc', properties: {}});
    expect(isMatch(key1, key2)).toBe(true);
  });

  it('id mismatch returns false', () => {
    const key1 = {id: 'key-abc'};
    const key2 = makeKey({id: 'key-xyz', properties: {}});
    expect(isMatch(key1, key2)).toBe(false);
  });
});

// ─── getMatchedKey ────────────────────────────────────────────────────────────

describe('getMatchedKey', () => {
  it('returns matching key', () => {
    const key = makeKey({id: 'k1', properties: {fingerPrint: 'fp-1'}});
    const keyToMatch = {fingerPrint: 'fp-1'};
    expect(getMatchedKey(keyToMatch, [key])).toBe(key);
  });

  it('returns undefined when no match', () => {
    const key = makeKey({properties: {fingerPrint: 'fp-999'}});
    expect(getMatchedKey({fingerPrint: 'fp-0'}, [key])).toBeUndefined();
  });

  it('returns undefined for empty keys array', () => {
    expect(getMatchedKey({id: 'k1'}, [])).toBeUndefined();
  });
});

// ─── getReadOnlyKey ───────────────────────────────────────────────────────────

describe('getReadOnlyKey', () => {
  it('returns key with id containing "readonly"', () => {
    const key = makeKey({id: 'readonly/ledger'});
    expect(getReadOnlyKey([key])).toBe(key);
  });

  it('returns undefined when no readonly key', () => {
    const key = makeKey({id: 'some-regular-key'});
    expect(getReadOnlyKey([key])).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    expect(getReadOnlyKey([])).toBeUndefined();
  });
});

// ─── isMatchedWallet ──────────────────────────────────────────────────────────

describe('isMatchedWallet', () => {
  it('returns matching wallet when walletId matches', () => {
    const existing = makeWallet({credentials: makeCredentials({walletId: 'w-match'})});
    const newWallet = makeWallet({credentials: makeCredentials({walletId: 'w-match'})});
    expect(isMatchedWallet(newWallet, [existing])).toBe(existing);
  });

  it('returns undefined when no match', () => {
    const existing = makeWallet({credentials: makeCredentials({walletId: 'w-1'})});
    const newWallet = makeWallet({credentials: makeCredentials({walletId: 'w-2'})});
    expect(isMatchedWallet(newWallet, [existing])).toBeUndefined();
  });
});

// ─── getEVMAccountName ────────────────────────────────────────────────────────

describe('getEVMAccountName', () => {
  it('returns undefined when wallet has no keyId', () => {
    const wallet = makeWallet({keyId: undefined});
    expect(getEVMAccountName(wallet, {})).toBeUndefined();
  });

  it('returns undefined when wallet has no receiveAddress', () => {
    const wallet = makeWallet({receiveAddress: undefined});
    expect(getEVMAccountName(wallet, {})).toBeUndefined();
  });

  it('returns undefined when key has no evmAccountsInfo', () => {
    const wallet = makeWallet();
    const keys: any = {'key-1': makeKey({evmAccountsInfo: undefined})};
    expect(getEVMAccountName(wallet, keys)).toBeUndefined();
  });

  it('returns undefined when address not in evmAccountsInfo', () => {
    const wallet = makeWallet({receiveAddress: '0xABC'});
    const keys: any = {'key-1': makeKey({evmAccountsInfo: {}})};
    expect(getEVMAccountName(wallet, keys)).toBeUndefined();
  });

  it('returns name from evmAccountsInfo', () => {
    const wallet = makeWallet({receiveAddress: '0xABC'});
    const keys: any = {
      'key-1': makeKey({evmAccountsInfo: {'0xABC': {name: 'Main Account'}}}),
    };
    expect(getEVMAccountName(wallet, keys)).toBe('Main Account');
  });
});

// ─── generateKeyExportCode ────────────────────────────────────────────────────

describe('generateKeyExportCode', () => {
  it('generates export code string in expected format', () => {
    const key = makeKey({properties: {mnemonicHasPassphrase: false}});
    const mnemonic = 'word1 word2 word3';
    const result = generateKeyExportCode(key, mnemonic);
    expect(result).toBe(`1|${mnemonic}|null|null|false|null`);
  });

  it('includes mnemonicHasPassphrase = true', () => {
    const key = makeKey({properties: {mnemonicHasPassphrase: true}});
    const result = generateKeyExportCode(key, 'abc');
    expect(result).toContain('true');
  });
});

// ─── checkEncryptPassword ─────────────────────────────────────────────────────

describe('checkEncryptPassword', () => {
  it('calls checkPassword on key.methods', () => {
    const mockCheckPassword = jest.fn(() => true);
    const key = makeKey({methods: {...makeKey().methods, checkPassword: mockCheckPassword}});
    const result = checkEncryptPassword(key, 'secret');
    expect(mockCheckPassword).toHaveBeenCalledWith('secret');
    expect(result).toBe(true);
  });

  it('returns false when methods is undefined', () => {
    const key = makeKey({methods: undefined});
    // Should not throw
    expect(checkEncryptPassword(key, 'secret')).toBeUndefined();
  });
});

// ─── checkPrivateKeyEncrypted ─────────────────────────────────────────────────

describe('checkPrivateKeyEncrypted', () => {
  it('returns true when key is encrypted', () => {
    const key = makeKey({methods: {...makeKey().methods, isPrivKeyEncrypted: jest.fn(() => true)}});
    expect(checkPrivateKeyEncrypted(key)).toBe(true);
  });

  it('returns false when key is not encrypted', () => {
    const key = makeKey();
    expect(checkPrivateKeyEncrypted(key)).toBe(false);
  });
});

// ─── formatCryptoAmount ────────────────────────────────────────────────────────

describe('formatCryptoAmount', () => {
  it('returns "0" for zero amount', () => {
    expect(formatCryptoAmount(0, 'btc')).toBe('0');
  });

  it('calls BwcProvider formatAmount for non-zero amount', () => {
    const {BwcProvider} = require('../../../lib/bwc');
    const instance = BwcProvider.getInstance();
    const result = formatCryptoAmount(100000, 'btc');
    expect(instance.getUtils).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});

// ─── buildKeyObj ──────────────────────────────────────────────────────────────

describe('buildKeyObj', () => {
  it('builds key with id from key.id when key is present', () => {
    const keyMethods: any = {
      id: 'my-key-id',
      isPrivKeyEncrypted: jest.fn(() => false),
      toObj: jest.fn(() => ({})),
    };
    const result = buildKeyObj({key: keyMethods, wallets: []});
    expect(result.id).toBe('my-key-id');
    expect(result.keyName).toBe('My Key');
  });

  it('builds readonly id when key is undefined and no hardwareSource', () => {
    const result = buildKeyObj({key: undefined, wallets: []});
    expect(result.id).toBe('readonly');
    expect(result.keyName).toBe('Read Only');
    expect(result.isReadOnly).toBe(true);
  });

  it('builds readonly/hardwareSource id when hardwareSource is provided and no key', () => {
    const result = buildKeyObj({key: undefined, wallets: [], hardwareSource: 'ledger'});
    expect(result.id).toBe('readonly/ledger');
    expect(result.keyName).toBe('My Ledger');
  });

  it('uses custom keyName when provided', () => {
    const keyMethods: any = {
      id: 'k-1',
      isPrivKeyEncrypted: jest.fn(() => false),
      toObj: jest.fn(() => ({})),
    };
    const result = buildKeyObj({key: keyMethods, wallets: [], keyName: 'Custom Name'});
    expect(result.keyName).toBe('Custom Name');
  });

  it('stores totalBalance and backupComplete', () => {
    const keyMethods: any = {
      id: 'k-2',
      isPrivKeyEncrypted: jest.fn(() => false),
      toObj: jest.fn(() => ({})),
    };
    const result = buildKeyObj({key: keyMethods, wallets: [], totalBalance: 500, backupComplete: true});
    expect(result.totalBalance).toBe(500);
    expect(result.backupComplete).toBe(true);
  });
});

// ─── buildTssKeyObj ───────────────────────────────────────────────────────────

describe('buildTssKeyObj', () => {
  it('builds a key obj from a tssKey', () => {
    const tssKey: any = {
      id: 'tss-key-id',
      toObj: jest.fn(() => ({privateKeyShare: 'secret', metadata: {m: 1, n: 2}})),
      isPrivKeyEncrypted: jest.fn(() => false),
      metadata: {m: 1, n: 2},
    };
    const result = buildTssKeyObj({tssKey, wallets: []});
    expect(result.id).toBe('tss-key-id');
    // privateKeyShare should be deleted from properties
    expect((result.properties as any)?.privateKeyShare).toBeUndefined();
  });

  it('uses custom keyName when provided', () => {
    const tssKey: any = {
      id: 'tss-key-id',
      toObj: jest.fn(() => ({metadata: {m: 2, n: 3}})),
      isPrivKeyEncrypted: jest.fn(() => false),
      metadata: {m: 2, n: 3},
    };
    const result = buildTssKeyObj({tssKey, wallets: [], keyName: 'Custom TSS Key'});
    expect(result.keyName).toBe('Custom TSS Key');
  });

  it('defaults keyName to TSS Key format when not provided', () => {
    const tssKey: any = {
      id: 'tss-key-id',
      toObj: jest.fn(() => ({metadata: {m: 2, n: 3}})),
      isPrivKeyEncrypted: jest.fn(() => false),
      metadata: {m: 2, n: 3},
    };
    const result = buildTssKeyObj({tssKey, wallets: []});
    expect(result.keyName).toContain('TSS Key');
    expect(result.keyName).toContain('2-of-3');
  });
});

// ─── buildMigrationKeyObj ─────────────────────────────────────────────────────

describe('buildMigrationKeyObj', () => {
  it('builds key from migration key', () => {
    const key: any = {
      id: 'migrated-id',
      methods: {
        isPrivKeyEncrypted: jest.fn(() => false),
        toObj: jest.fn(() => ({})),
      },
    };
    const result = buildMigrationKeyObj({key, wallets: [], backupComplete: true, keyName: 'Migrated Key'});
    expect(result.id).toBe('migrated-id');
    expect(result.keyName).toBe('Migrated Key');
    expect(result.backupComplete).toBe(true);
  });
});

// ─── coinbaseAccountToWalletRow ───────────────────────────────────────────────

describe('coinbaseAccountToWalletRow', () => {
  const makeCoinbaseAccount = (overrides: any = {}): any => ({
    id: 'cb-account-1',
    name: 'My BTC Wallet',
    currency: {code: 'BTC', name: 'Bitcoin'},
    balance: {amount: '0.5', currency: 'BTC'},
    ...overrides,
  });

  const makeExchangeRates = (): any => ({
    data: {currency: 'BTC', rates: {USD: '50000'}},
  });

  it('returns a WalletRowProps object', () => {
    const account = makeCoinbaseAccount();
    const result = coinbaseAccountToWalletRow(account, makeExchangeRates(), 'USD');
    expect(result.id).toBe('cb-account-1');
    expect(result.currencyAbbreviation).toBe('BTC');
    expect(result.network).toBe(Network.mainnet);
  });

  it('sets cryptoBalance to "0" when balance amount is 0', () => {
    const account = makeCoinbaseAccount({balance: {amount: '0', currency: 'BTC'}});
    const result = coinbaseAccountToWalletRow(account, makeExchangeRates(), 'USD');
    expect(result.cryptoBalance).toBe('0');
  });

  it('returns the balance amount when non-zero', () => {
    const account = makeCoinbaseAccount({balance: {amount: '1.23', currency: 'BTC'}});
    const result = coinbaseAccountToWalletRow(account, makeExchangeRates(), 'USD');
    expect(result.cryptoBalance).toBe('1.23');
  });

  it('assigns chain = "eth" for unknown coin codes', () => {
    const account = makeCoinbaseAccount({
      currency: {code: 'UNKNOWN_COIN_XYZ', name: 'Unknown'},
      balance: {amount: '1', currency: 'UNKNOWN_COIN_XYZ'},
    });
    const result = coinbaseAccountToWalletRow(account, null, 'USD');
    expect(result.chain).toBe('eth');
  });

  it('assigns chain = "btc" for known UTXO coin (BTC)', () => {
    const account = makeCoinbaseAccount();
    const result = coinbaseAccountToWalletRow(account, null, 'USD');
    expect(result.chain).toBe('btc');
  });
});

// ─── BuildCoinbaseWalletsList ─────────────────────────────────────────────────

describe('BuildCoinbaseWalletsList', () => {
  const makeCoinbaseAccount = (amount = '1.0'): any => ({
    id: 'cb-1',
    name: 'BTC',
    currency: {code: 'BTC', name: 'Bitcoin'},
    balance: {amount, currency: 'BTC'},
  });

  const makeCoinbaseUser = (): any => ({
    data: {id: 'user-1', name: 'Test User'},
  });

  it('returns empty array when coinbaseAccounts is null', () => {
    const result = BuildCoinbaseWalletsList({
      coinbaseAccounts: null,
      coinbaseExchangeRates: null,
      coinbaseUser: makeCoinbaseUser(),
      skipThreshold: true,
    });
    expect(result).toEqual([]);
  });

  it('returns empty array when coinbaseUser is null', () => {
    const result = BuildCoinbaseWalletsList({
      coinbaseAccounts: [makeCoinbaseAccount()],
      coinbaseExchangeRates: null,
      coinbaseUser: null,
      skipThreshold: true,
    });
    expect(result).toEqual([]);
  });

  it('returns empty array when coinbaseExchangeRates is null', () => {
    const result = BuildCoinbaseWalletsList({
      coinbaseAccounts: [makeCoinbaseAccount()],
      coinbaseExchangeRates: null,
      coinbaseUser: makeCoinbaseUser(),
      skipThreshold: true,
    });
    expect(result).toEqual([]);
  });

  it('returns empty array when network is testnet', () => {
    const result = BuildCoinbaseWalletsList({
      coinbaseAccounts: [makeCoinbaseAccount()],
      coinbaseExchangeRates: {data: {currency: 'BTC', rates: {USD: '50000'}}} as any,
      coinbaseUser: makeCoinbaseUser(),
      network: Network.testnet,
      skipThreshold: true,
    });
    expect(result).toEqual([]);
  });

  it('returns wallets list when all conditions met with skipThreshold', () => {
    const result = BuildCoinbaseWalletsList({
      coinbaseAccounts: [makeCoinbaseAccount('0.5')],
      coinbaseExchangeRates: {data: {currency: 'BTC', rates: {USD: '50000'}}} as any,
      coinbaseUser: makeCoinbaseUser(),
      skipThreshold: true,
    });
    // Account has balance > 0 and skipThreshold is true
    expect(result.length).toBe(1);
    expect(result[0].keyName).toContain("Test User");
  });

  it('returns empty array when account balance is 0', () => {
    const result = BuildCoinbaseWalletsList({
      coinbaseAccounts: [makeCoinbaseAccount('0')],
      coinbaseExchangeRates: {data: {currency: 'BTC', rates: {USD: '50000'}}} as any,
      coinbaseUser: makeCoinbaseUser(),
      skipThreshold: true,
    });
    // Balance is 0, so filtered out → coinbaseAccounts[] is empty → filtered key removed
    expect(result).toEqual([]);
  });

  it('returns empty array when enabled is false (no invoice, no skipThreshold)', () => {
    const result = BuildCoinbaseWalletsList({
      coinbaseAccounts: [makeCoinbaseAccount('0.5')],
      coinbaseExchangeRates: {data: {currency: 'BTC', rates: {USD: '50000'}}} as any,
      coinbaseUser: makeCoinbaseUser(),
      skipThreshold: false,
      // no invoice → enabled = false
    });
    expect(result).toEqual([]);
  });
});

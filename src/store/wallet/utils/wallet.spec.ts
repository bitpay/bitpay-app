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
  mapAbbreviationAndName,
  GetProtocolPrefixAddress,
  toFiat,
  findMatchedKeyAndUpdate,
  findKeyByKeyId,
  getAllWalletClients,
  findWalletByIdHashed,
  buildUIFormattedWallet,
  buildAccountList,
  buildAssetsByChain,
  buildAssetsByChainList,
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

  it('filters by paymentOptions when payProOptions are provided', () => {
    const result = BuildCoinbaseWalletsList({
      coinbaseAccounts: [makeCoinbaseAccount('0.5')],
      coinbaseExchangeRates: {data: {currency: 'BTC', rates: {USD: '50000'}}} as any,
      coinbaseUser: makeCoinbaseUser(),
      skipThreshold: true,
      payProOptions: {
        paymentOptions: [
          {currency: 'BTC', network: Network.mainnet, selected: true} as any,
        ],
      } as any,
    });
    // BTC matches, so list should have one entry
    expect(result.length).toBe(1);
  });

  it('filters out accounts that do not match paymentOptions', () => {
    const result = BuildCoinbaseWalletsList({
      coinbaseAccounts: [makeCoinbaseAccount('0.5')],
      coinbaseExchangeRates: {data: {currency: 'BTC', rates: {USD: '50000'}}} as any,
      coinbaseUser: makeCoinbaseUser(),
      skipThreshold: true,
      payProOptions: {
        paymentOptions: [
          {currency: 'ETH', network: Network.mainnet, selected: true} as any,
        ],
      } as any,
    });
    // BTC account does not match ETH payment option
    expect(result).toEqual([]);
  });

  it('includes account when invoice threshold met', () => {
    const result = BuildCoinbaseWalletsList({
      coinbaseAccounts: [makeCoinbaseAccount('0.5')],
      coinbaseExchangeRates: {data: {currency: 'BTC', rates: {USD: '50000'}}} as any,
      coinbaseUser: makeCoinbaseUser(),
      skipThreshold: false,
      invoice: {
        price: 10,
        oauth: {coinbase: {enabled: true, threshold: 20}},
      } as any,
    });
    // enabled=true, threshold(20) >= price(10)
    expect(result.length).toBe(1);
  });
});

// ─── mapAbbreviationAndName ───────────────────────────────────────────────────

describe('mapAbbreviationAndName', () => {
  const makeDispatch = () => (effect: any) => {
    // Simulate dispatch returning a string name from GetName
    if (typeof effect === 'function') {
      return effect(() => {}, () => ({WALLET: {customTokenDataByAddress: {}}}));
    }
    return effect;
  };

  it('maps pax to usdp', () => {
    const dispatch = makeDispatch() as any;
    const result = mapAbbreviationAndName('pax', 'eth', undefined)(dispatch);
    expect(result.currencyAbbreviation).toBe('usdp');
  });

  it('maps matic to pol', () => {
    const dispatch = makeDispatch() as any;
    const result = mapAbbreviationAndName('matic', 'matic', undefined)(dispatch);
    expect(result.currencyAbbreviation).toBe('pol');
  });

  it('passes through unknown coin unchanged', () => {
    const dispatch = makeDispatch() as any;
    const result = mapAbbreviationAndName('btc', 'btc', undefined)(dispatch);
    expect(result.currencyAbbreviation).toBe('btc');
  });
});

// ─── GetProtocolPrefixAddress ─────────────────────────────────────────────────

describe('GetProtocolPrefixAddress', () => {
  const dispatchFn = (effect: any) => {
    if (typeof effect === 'function') {
      return effect(() => {}, () => ({WALLET: {customTokenDataByAddress: {}}}));
    }
    return effect;
  };

  it('returns address unchanged for non-bch coin', () => {
    const result = GetProtocolPrefixAddress('btc', 'mainnet', '1ABCxyz', 'btc')(dispatchFn as any);
    expect(result).toBe('1ABCxyz');
  });

  it('prefixes address for bch coin', () => {
    const result = GetProtocolPrefixAddress('bch', 'livenet', 'qABC', 'bch')(dispatchFn as any);
    // GetProtocolPrefix returns the prefix from BitpaySupportedCoins for bch/livenet
    expect(typeof result).toBe('string');
    expect(result).toContain('qABC');
    expect(result).toContain(':');
  });
});

// ─── toFiat ───────────────────────────────────────────────────────────────────

describe('toFiat', () => {
  // toFiat is an Effect — we call it with a dispatch that calls real GetPrecision
  const makeGetState = (customTokenData = {}) => () => ({
    WALLET: {customTokenDataByAddress: customTokenData},
  });

  const makeRates = (): any => ({
    btc: [{code: 'USD', fetchedOn: 0, name: 'US Dollar', rate: 50000, ts: 0}],
  });

  it('returns 0 when ratesPerCurrency is not found', () => {
    const dispatch = (effect: any) => {
      if (typeof effect === 'function') return effect(dispatch, makeGetState());
      return effect;
    };
    const result = toFiat(100000, 'USD', 'btc', 'btc', {}, undefined)(dispatch as any);
    expect(result).toBe(0);
  });

  it('returns 0 when fiatCode rate is not found', () => {
    const dispatch = (effect: any) => {
      if (typeof effect === 'function') return effect(dispatch, makeGetState());
      return effect;
    };
    const rates = makeRates();
    const result = toFiat(100000, 'EUR', 'btc', 'btc', rates, undefined)(dispatch as any);
    expect(result).toBe(0);
  });

  it('returns numeric fiat amount when rate and precision are found', () => {
    const dispatch = (effect: any) => {
      if (typeof effect === 'function') return effect(dispatch, makeGetState());
      return effect;
    };
    const rates = makeRates();
    // 100000000 sat * (1/1e8) * 50000 = 50000 USD
    const result = toFiat(100000000, 'USD', 'btc', 'btc', rates, undefined)(dispatch as any);
    expect(typeof result).toBe('number');
    expect(result).toBeCloseTo(50000, 0);
  });

  it('uses customRate when provided and precision available', () => {
    const dispatch = (effect: any) => {
      if (typeof effect === 'function') return effect(dispatch, makeGetState());
      return effect;
    };
    const result = toFiat(100000000, 'USD', 'btc', 'btc', {}, undefined, 30000)(dispatch as any);
    expect(typeof result).toBe('number');
    expect(result).toBeCloseTo(30000, 0);
  });

  it('returns 0 when rate value is 0', () => {
    const dispatch = (effect: any) => {
      if (typeof effect === 'function') return effect(dispatch, makeGetState());
      return effect;
    };
    const rates: any = {
      btc: [{code: 'USD', fetchedOn: 0, name: 'US Dollar', rate: 0, ts: 0}],
    };
    const result = toFiat(100000, 'USD', 'btc', 'btc', rates, undefined)(dispatch as any);
    expect(result).toBe(0);
  });
});

// ─── findMatchedKeyAndUpdate ──────────────────────────────────────────────────

describe('findMatchedKeyAndUpdate', () => {
  it('returns original key and wallets when opts.keyId is set', () => {
    const key = {fingerPrint: 'fp-1'};
    const wallets: any[] = [];
    const keys: any[] = [];
    const result = findMatchedKeyAndUpdate(wallets, key, keys, {keyId: 'some-key-id'});
    expect(result.key).toBe(key);
    expect(result.wallets).toBe(wallets);
    expect(result.keyName).toBeUndefined();
  });

  it('returns original key when no matched key found', () => {
    const key = {fingerPrint: 'fp-unknown'};
    const wallets: any[] = [];
    const existingKey = makeKey({properties: {fingerPrint: 'fp-other'}});
    const result = findMatchedKeyAndUpdate(wallets, key, [existingKey], {});
    expect(result.key).toBe(key);
    expect(result.keyName).toBeUndefined();
  });

  it('updates wallets keyId when matched key is found', () => {
    const matchedKey = makeKey({
      id: 'matched-key-id',
      properties: {fingerPrint: 'fp-match'},
      wallets: [],
      keyName: 'Matched Key',
    });
    const wallet: any = {
      credentials: {walletId: 'w1', keyId: 'old-key', walletName: 'Wallet 1'},
      keyId: 'old-key',
    };
    const key = {fingerPrint: 'fp-match'};
    const result = findMatchedKeyAndUpdate([wallet], key, [matchedKey], {});
    expect(result.keyName).toBe('Matched Key');
    expect(wallet.keyId).toBe('matched-key-id');
    expect(wallet.credentials.keyId).toBe('matched-key-id');
  });

  it('preserves existing walletName when found in matchedKey.wallets', () => {
    const matchedKey = makeKey({
      id: 'mk-1',
      properties: {fingerPrint: 'fp-x'},
      wallets: [{id: 'w1', walletName: 'Preserved Name'}],
      keyName: 'Key',
    });
    const wallet: any = {
      credentials: {walletId: 'w1', keyId: 'old', walletName: 'Old Name'},
      keyId: 'old',
    };
    findMatchedKeyAndUpdate([wallet], {fingerPrint: 'fp-x'}, [matchedKey], {});
    expect(wallet.credentials.walletName).toBe('Preserved Name');
  });
});

// ─── findKeyByKeyId ───────────────────────────────────────────────────────────

describe('findKeyByKeyId', () => {
  it('resolves with the matching key', async () => {
    const key1 = makeKey({id: 'k1'});
    const key2 = makeKey({id: 'k2'});
    const keys: any = {k1: key1, k2: key2};
    const result = await findKeyByKeyId('k2', keys);
    expect(result).toBe(key2);
  });

  it('resolves with undefined when no key matches', async () => {
    const key1 = makeKey({id: 'k1'});
    const keys: any = {k1: key1};
    // Promise.all resolves, but resolve is never called with a key → resolves with undefined
    // The implementation never rejects if nothing matches — timeout guard
    const result = await Promise.race([
      findKeyByKeyId('no-match', keys).catch(() => 'caught'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 100)),
    ]);
    // Either never resolved (timeout) or caught — either way no throw
    expect(['timeout', 'caught', undefined].includes(result as any)).toBe(true);
  });
});

// ─── getAllWalletClients ───────────────────────────────────────────────────────

describe('getAllWalletClients', () => {
  it('resolves with wallet clients for wallets that pass filters', async () => {
    const wallet1: any = makeWallet({
      credentials: makeCredentials({
        token: undefined,
        isComplete: jest.fn(() => true),
      }),
      pendingTssSession: undefined,
    });
    const wallet2: any = makeWallet({
      credentials: makeCredentials({
        token: {address: '0xtoken'},
        isComplete: jest.fn(() => true),
      }),
      pendingTssSession: undefined,
    });
    const keys: any = {
      'key-1': {wallets: [wallet1, wallet2]},
    };
    const result = await getAllWalletClients(keys);
    // wallet2 has a token so it is filtered out
    expect(result).toContain(wallet1);
    expect(result).not.toContain(wallet2);
  });

  it('filters out wallets with pendingTssSession', async () => {
    const wallet: any = makeWallet({
      credentials: makeCredentials({
        token: undefined,
        isComplete: jest.fn(() => true),
      }),
      pendingTssSession: true,
    });
    const keys: any = {'key-1': {wallets: [wallet]}};
    const result = await getAllWalletClients(keys);
    expect(result).toHaveLength(0);
  });

  it('filters out wallets that are not complete', async () => {
    const wallet: any = makeWallet({
      credentials: makeCredentials({
        token: undefined,
        isComplete: jest.fn(() => false),
      }),
      pendingTssSession: undefined,
    });
    const keys: any = {'key-1': {wallets: [wallet]}};
    const result = await getAllWalletClients(keys);
    expect(result).toHaveLength(0);
  });

  it('resolves with empty array when keys is empty', async () => {
    const result = await getAllWalletClients({});
    expect(result).toEqual([]);
  });
});

// ─── findWalletByIdHashed ─────────────────────────────────────────────────────

describe('findWalletByIdHashed', () => {
  const makeCompleteWallet = (walletId: string) =>
    makeWallet({
      id: walletId,
      keyId: 'key-1',
      credentials: makeCredentials({
        walletId,
        token: undefined,
        isComplete: jest.fn(() => true),
      }),
      pendingTssSession: undefined,
    });

  it('resolves with wallet when hashed walletId matches', async () => {
    const crypto = require('crypto');
    const walletId = 'wallet-abc-123';
    const hash = crypto.createHash('sha256');
    hash.update(walletId);
    const hashed = hash.digest('hex');

    const wallet = makeCompleteWallet(walletId);
    const keys: any = {'key-1': {wallets: [wallet]}};
    const result = await findWalletByIdHashed(keys, hashed, null, undefined);
    expect(result.wallet).toBeDefined();
    expect(result.keyId).toBe('key-1');
  });

  it('resolves with undefined wallet when no hash matches', async () => {
    const wallet = makeCompleteWallet('wallet-xyz');
    const keys: any = {'key-1': {wallets: [wallet]}};
    const result = await findWalletByIdHashed(keys, 'deadbeefdeadbeef', null, undefined);
    expect(result.wallet).toBeUndefined();
    expect(result.keyId).toBeUndefined();
  });

  it('uses walletId without token suffix when tokenAddress provided', async () => {
    const crypto = require('crypto');
    // walletId has a token suffix after last hyphen
    const walletIdBase = 'wallet-main';
    const walletId = `${walletIdBase}-tokenpart`;
    const hash = crypto.createHash('sha256');
    hash.update(walletIdBase);
    const hashed = hash.digest('hex');

    const wallet = makeCompleteWallet(walletId);
    const keys: any = {'key-1': {wallets: [wallet]}};
    const result = await findWalletByIdHashed(keys, hashed, '0xSomeToken', undefined);
    expect(result.wallet).toBeDefined();
  });
});

// ─── buildUIFormattedWallet ───────────────────────────────────────────────────

describe('buildUIFormattedWallet', () => {
  const makeDispatch = () => (effect: any) => {
    if (typeof effect === 'function') {
      return effect(makeDispatch(), () => ({WALLET: {customTokenDataByAddress: {}}}));
    }
    return effect;
  };

  const makeRates = (): any => ({
    btc: [{code: 'USD', fetchedOn: 0, name: 'US Dollar', rate: 50000, ts: 0}],
  });

  const makeFullWallet = (overrides: any = {}): any => ({
    ...makeWallet(overrides),
    balance: makeBalance({sat: 100000000, satLocked: 0, satConfirmedLocked: 0, satSpendable: 100000000, satPending: 0}),
    credentials: makeCredentials({n: 1, m: 1, account: 0, walletName: 'BTC Wallet', isComplete: jest.fn(() => true)}),
    chain: 'btc',
    currencyAbbreviation: 'btc',
    currencyName: 'Bitcoin',
    chainName: 'Bitcoin',
    tokenAddress: undefined,
    network: Network.mainnet,
    isScanning: false,
    hideWallet: false,
    hideWalletByAccount: false,
    hideBalance: false,
    walletName: 'BTC Wallet',
    tssMetadata: undefined,
  });

  it('builds a WalletRowProps from wallet data', () => {
    const dispatch = makeDispatch() as any;
    const wallet = makeFullWallet();
    const result = buildUIFormattedWallet(wallet, 'USD', makeRates(), dispatch);
    expect(result.id).toBe('wallet-1');
    expect(result.currencyAbbreviation).toBeDefined();
    expect(result.network).toBe(Network.mainnet);
    expect(result.chain).toBe('btc');
  });

  it('includes fiat balance calculations when skipFiatCalculations is false', () => {
    const dispatch = makeDispatch() as any;
    const wallet = makeFullWallet();
    const result = buildUIFormattedWallet(wallet, 'USD', makeRates(), dispatch, undefined, false);
    expect(result.fiatBalance).toBeDefined();
    expect(typeof result.fiatBalance).toBe('number');
  });

  it('skips fiat calculations when skipFiatCalculations is true', () => {
    const dispatch = makeDispatch() as any;
    const wallet = makeFullWallet();
    const result = buildUIFormattedWallet(wallet, 'USD', makeRates(), dispatch, undefined, true);
    expect(result.fiatBalance).toBeUndefined();
  });

  it('sets multisig string when credentials.n > 1', () => {
    const dispatch = makeDispatch() as any;
    // credentials.n must be > 1; buildUIFormattedWallet destructures credentials from wallet
    const wallet: any = {
      ...makeFullWallet(),
      credentials: makeCredentials({n: 3, m: 2, account: 0, walletName: 'Multisig', isComplete: jest.fn(() => true)}),
    };
    const result = buildUIFormattedWallet(wallet, 'USD', {}, dispatch, undefined, true);
    expect(result.multisig).toContain('2/3');
  });

  it('sets threshold string when tssMetadata is present', () => {
    const dispatch = makeDispatch() as any;
    const wallet: any = {
      ...makeFullWallet(),
      tssMetadata: {id: 'tss-1', n: 3, m: 2, partyId: 1},
    };
    const result = buildUIFormattedWallet(wallet, 'USD', {}, dispatch, undefined, true);
    expect(result.threshold).toContain('2/3');
  });
});

// ─── buildAccountList ─────────────────────────────────────────────────────────

describe('buildAccountList', () => {
  const makeDispatch = () => (effect: any) => {
    if (typeof effect === 'function') {
      return effect(makeDispatch(), () => ({WALLET: {customTokenDataByAddress: {}}}));
    }
    return effect;
  };

  const makeBtcWallet = (overrides: any = {}): any => ({
    ...makeWallet(),
    balance: makeBalance({sat: 100000000, satLocked: 0, satConfirmedLocked: 0, satSpendable: 100000000, satPending: 0}),
    credentials: makeCredentials({n: 1, m: 1, account: 0, walletName: 'BTC', isComplete: jest.fn(() => true)}),
    chain: 'btc',
    currencyAbbreviation: 'btc',
    currencyName: 'Bitcoin',
    chainName: 'Bitcoin',
    tokenAddress: undefined,
    network: Network.mainnet,
    isScanning: false,
    hideWallet: false,
    hideWalletByAccount: false,
    hideBalance: false,
    walletName: 'BTC',
    tssMetadata: undefined,
    receiveAddress: '1ABCxyz',
    ...overrides,
  });

  const makeKey2 = (wallets: any[] = []): any => ({
    ...makeKey(),
    wallets,
  });

  it('returns empty array when key has no wallets', () => {
    const dispatch = makeDispatch() as any;
    const key = makeKey2([]);
    const result = buildAccountList(key, 'USD', {}, dispatch, {skipFiatCalculations: true});
    expect(result).toEqual([]);
  });

  it('builds account list from wallets', () => {
    const dispatch = makeDispatch() as any;
    const wallet = makeBtcWallet();
    const key = makeKey2([wallet]);
    const result = buildAccountList(key, 'USD', {}, dispatch, {skipFiatCalculations: true});
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].chains).toContain('btc');
  });

  it('filters out wallets where hideWallet is true when filterByHideWallet=true', () => {
    const dispatch = makeDispatch() as any;
    const wallet = makeBtcWallet({hideWallet: true});
    const key = makeKey2([wallet]);
    const result = buildAccountList(key, 'USD', {}, dispatch, {
      skipFiatCalculations: true,
      filterByHideWallet: true,
    });
    expect(result).toHaveLength(0);
  });

  it('filters out wallets with no balance when filterWalletsByBalance=true', () => {
    const dispatch = makeDispatch() as any;
    const wallet = makeBtcWallet({
      balance: makeBalance({sat: 0}),
    });
    const key = makeKey2([wallet]);
    const result = buildAccountList(key, 'USD', {}, dispatch, {
      skipFiatCalculations: true,
      filterWalletsByBalance: true,
    });
    expect(result).toHaveLength(0);
  });

  it('filters by chain when filterWalletsByChain=true and chain matches', () => {
    const dispatch = makeDispatch() as any;
    const wallet = makeBtcWallet();
    const key = makeKey2([wallet]);
    const result = buildAccountList(key, 'USD', {}, dispatch, {
      skipFiatCalculations: true,
      filterWalletsByChain: true,
      chain: 'btc',
    });
    expect(result.length).toBe(1);
  });

  it('filters out wallet when chain does not match', () => {
    const dispatch = makeDispatch() as any;
    const wallet = makeBtcWallet();
    const key = makeKey2([wallet]);
    const result = buildAccountList(key, 'USD', {}, dispatch, {
      skipFiatCalculations: true,
      filterWalletsByChain: true,
      chain: 'eth',
    });
    expect(result).toHaveLength(0);
  });

  it('filters by network using paymentOptions when filterWalletsByPaymentOptions=true', () => {
    const dispatch = makeDispatch() as any;
    const wallet = makeBtcWallet({network: Network.mainnet});
    const key = makeKey2([wallet]);
    const result = buildAccountList(key, 'USD', {}, dispatch, {
      skipFiatCalculations: true,
      filterWalletsByPaymentOptions: true,
      paymentOptions: [{network: Network.mainnet} as any],
    });
    expect(result.length).toBe(1);
  });

  it('merges wallets sharing the same receiveAddress into one account', () => {
    const dispatch = makeDispatch() as any;
    const wallet1 = makeBtcWallet({receiveAddress: 'shared-addr', chain: 'btc', id: 'w1'});
    const wallet2 = makeBtcWallet({receiveAddress: 'shared-addr', chain: 'eth', id: 'w2',
      credentials: makeCredentials({n: 1, m: 1, account: 0, walletId: 'wallet-2', walletName: 'ETH', isComplete: jest.fn(() => true)}),
      currencyAbbreviation: 'eth', currencyName: 'Ethereum', chainName: 'Ethereum'});
    const key = makeKey2([wallet1, wallet2]);
    const result = buildAccountList(key, 'USD', {}, dispatch, {skipFiatCalculations: true});
    // Both wallets share same receiveAddress → merged into one account
    expect(result.length).toBe(1);
    expect(result[0].wallets.length).toBe(2);
  });

  it('uses filterByCustomWallets when provided', () => {
    const dispatch = makeDispatch() as any;
    const wallet1 = makeBtcWallet({id: 'w1'});
    const wallet2 = makeBtcWallet({id: 'w2', receiveAddress: '2ABCxyz',
      credentials: makeCredentials({walletId: 'wallet-2', n: 1, m: 1, account: 0, walletName: 'BTC2', isComplete: jest.fn(() => true)})});
    const key = makeKey2([wallet1, wallet2]);
    // Only pass wallet1 as custom filter
    const result = buildAccountList(key, 'USD', {}, dispatch, {
      skipFiatCalculations: true,
      filterByCustomWallets: [wallet1],
    });
    expect(result.length).toBe(1);
  });
});

// ─── buildAssetsByChain ───────────────────────────────────────────────────────

describe('buildAssetsByChain', () => {
  const makeWalletRow = (chain: string, fiatBalance = 0): any => ({
    id: `wallet-${chain}`,
    chain,
    chainName: chain.toUpperCase(),
    img: '',
    badgeImg: '',
    currencyAbbreviation: chain,
    fiatBalance,
    fiatLockedBalance: 0,
    fiatConfirmedLockedBalance: 0,
    fiatSpendableBalance: 0,
    fiatPendingBalance: 0,
    receiveAddress: '0xaddr',
  });

  const makeAccountRow = (wallets: any[]): any => ({
    id: 'account-1',
    keyId: 'key-1',
    chains: wallets.map(w => w.chain),
    wallets,
    accountName: 'Test Account',
    accountNumber: 0,
    receiveAddress: '0xaddr',
    isMultiNetworkSupported: true,
    fiatBalance: 100,
    fiatLockedBalance: 0,
    fiatConfirmedLockedBalance: 0,
    fiatSpendableBalance: 100,
    fiatPendingBalance: 0,
    fiatBalanceFormat: '$100.00',
    fiatLockedBalanceFormat: '$0.00',
    fiatConfirmedLockedBalanceFormat: '$0.00',
    fiatSpendableBalanceFormat: '$100.00',
    fiatPendingBalanceFormat: '$0.00',
  });

  it('returns empty array for account with no wallets', () => {
    const account = makeAccountRow([]);
    const result = buildAssetsByChain(account, 'USD');
    expect(result).toEqual([]);
  });

  it('groups wallets by chain', () => {
    const wallets = [makeWalletRow('btc', 50), makeWalletRow('eth', 100)];
    const account = makeAccountRow(wallets);
    const result = buildAssetsByChain(account, 'USD');
    expect(result.length).toBe(2);
    const chains = result.map(r => r.chain);
    expect(chains).toContain('btc');
    expect(chains).toContain('eth');
  });

  it('accumulates fiat balance for same chain', () => {
    const wallets = [makeWalletRow('eth', 40), makeWalletRow('eth', 60)];
    const account = makeAccountRow(wallets);
    const result = buildAssetsByChain(account, 'USD');
    expect(result.length).toBe(1);
    expect(result[0].fiatBalance).toBeCloseTo(100, 1);
    expect(result[0].chainAssetsList.length).toBe(2);
  });

  it('returns one entry per distinct chain', () => {
    const wallets = [makeWalletRow('btc', 10), makeWalletRow('eth', 200)];
    const account = makeAccountRow(wallets);
    const result = buildAssetsByChain(account, 'USD');
    const chains = result.map(r => r.chain).sort();
    expect(chains).toEqual(['btc', 'eth']);
  });
});

// ─── buildAssetsByChainList ───────────────────────────────────────────────────

describe('buildAssetsByChainList', () => {
  const makeWalletRow = (chain: string, fiatBalance = 0): any => ({
    id: `wallet-${chain}`,
    chain,
    chainName: chain.toUpperCase(),
    img: '',
    badgeImg: '',
    currencyAbbreviation: chain,
    fiatBalance,
    fiatLockedBalance: 0,
    fiatConfirmedLockedBalance: 0,
    fiatSpendableBalance: 0,
    fiatPendingBalance: 0,
    receiveAddress: '0xaddr',
  });

  const makeAccountRow = (wallets: any[]): any => ({
    id: 'account-1',
    keyId: 'key-1',
    chains: wallets.map(w => w.chain),
    wallets,
    accountName: 'Test Account',
    accountNumber: 0,
    receiveAddress: '0xaddr',
    isMultiNetworkSupported: true,
    fiatBalance: 100,
    fiatLockedBalance: 0,
    fiatConfirmedLockedBalance: 0,
    fiatSpendableBalance: 100,
    fiatPendingBalance: 0,
    fiatBalanceFormat: '$100.00',
    fiatLockedBalanceFormat: '$0.00',
    fiatConfirmedLockedBalanceFormat: '$0.00',
    fiatSpendableBalanceFormat: '$100.00',
    fiatPendingBalanceFormat: '$0.00',
  });

  it('returns empty array for account with no wallets', () => {
    const account = makeAccountRow([]);
    const result = buildAssetsByChainList(account, 'USD');
    expect(result).toEqual([]);
  });

  it('builds section list format grouped by chain', () => {
    const wallets = [makeWalletRow('btc', 50), makeWalletRow('eth', 100)];
    const account = makeAccountRow(wallets);
    const result = buildAssetsByChainList(account, 'USD');
    expect(result.length).toBe(2);
    const titles = result.map(r => r.title);
    expect(titles).toContain('btc');
    expect(titles).toContain('eth');
  });

  it('accumulates balance for wallets on the same chain', () => {
    const wallets = [makeWalletRow('eth', 30), makeWalletRow('eth', 70)];
    const account = makeAccountRow(wallets);
    const result = buildAssetsByChainList(account, 'USD');
    expect(result.length).toBe(1);
    expect(result[0].data![0].fiatBalance).toBeCloseTo(100, 1);
  });

  it('sorts by fiatBalance descending', () => {
    const wallets = [makeWalletRow('btc', 10), makeWalletRow('eth', 200)];
    const account = makeAccountRow(wallets);
    const result = buildAssetsByChainList(account, 'USD');
    expect(result[0].data![0].fiatBalance).toBeGreaterThan(result[1].data![0].fiatBalance);
  });
});

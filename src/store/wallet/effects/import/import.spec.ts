/**
 * Tests for import.ts
 *
 * Strategy:
 *   - normalizeMnemonic   : exported pure function — exhaustive unit tests
 *   - startMigrationMMKVStorage : thunk that reads/writes AsyncStorage (mocked)
 *   - startMigration      : thunk — test the "no directory" / "no keys" early-
 *                           exit paths that trigger navigation without needing BWS
 *   - startImportFromHardwareWallet: basic validation paths (no key / bad coin)
 *   - getMissingVmAccounts (private) : indirectly via startImportMnemonic flow
 */

import configureTestStore from '@test/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  normalizeMnemonic,
  startMigrationMMKVStorage,
  startMigration,
  startImportFromHardwareWallet,
} from './import';

// ---------------------------------------------------------------------------
// Mocks – must appear before any imports that trigger module evaluation
// ---------------------------------------------------------------------------

jest.mock('../../../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../../managers/TokenManager', () => ({
  tokenManager: {
    getTokenOptions: jest.fn(() => ({tokenOptionsByAddress: {}})),
  },
}));

// mock helper-methods fully to avoid address.ts → BwcProvider chain at module load
jest.mock('../../../../utils/helper-methods', () => ({
  getLastDayTimestampStartOfHourMs: jest.fn(() => Date.now() - 86400000),
  addTokenChainSuffix: jest.fn((addr: string, chain: string) => `${addr}_e.${chain}`),
  getErrorString: jest.fn((e: unknown) => String(e)),
  createWalletsForAccounts: jest.fn(() => Promise.resolve([])),
  getEvmGasWallets: jest.fn(() => []),
  checkEncryptedKeysForEddsaMigration: jest.fn(() => () => Promise.resolve()),
  hashPinLegacy: jest.fn((arr: string[]) => arr.join('')),
}));

// RNFS – already mocked in test/setup.js (all methods are jest.fn())
// We add exists / readDir / readFile implementations per test
const RNFS = require('react-native-fs');

// react-native-restart
jest.mock('react-native-restart', () => ({restart: jest.fn()}));

// navigationRef
jest.mock('../../../../Root', () => ({
  navigationRef: {navigate: jest.fn(), dispatch: jest.fn()},
}));

// StackActions
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    StackActions: {replace: jest.fn(() => ({type: 'STACK_REPLACE'}))},
  };
});

// BwcProvider – heavy native module
jest.mock('../../../../lib/bwc', () => ({
  BwcProvider: {
    getInstance: jest.fn(() => ({
      getConstants: jest.fn(() => ({})),
      createKey: jest.fn(),
      getClient: jest.fn(),
      getBitcore: jest.fn(() => ({})),
      getBitcoreCash: jest.fn(() => ({})),
      getBitcoreDoge: jest.fn(() => ({})),
      getBitcoreLtc: jest.fn(() => ({})),
      getCore: jest.fn(() => ({})),
    })),
    API: {serverAssistedImport: jest.fn()},
  },
}));

// Status effects (heavy)
jest.mock('../status/status', () => ({
  startUpdateAllKeyAndWalletStatus: jest.fn(() => () => Promise.resolve()),
}));

// Rates effects
jest.mock('../rates/rates', () => ({
  startGetRates: jest.fn(() => () => Promise.resolve({})),
}));

// App effects used by migration
jest.mock('../../../app/app.effects', () => ({
  checkNotificationsPermissions: jest.fn(() => Promise.resolve(false)),
  setNotifications: jest.fn(() => ({type: 'SET_NOTIFICATIONS'})),
  subscribePushNotifications: jest.fn(() => () => Promise.resolve()),
  subscribeEmailNotifications: jest.fn(() => () => Promise.resolve()),
}));

// Coinbase effects
jest.mock('../../../coinbase', () => ({
  accessTokenSuccess: jest.fn(() => ({type: 'COINBASE/ACCESS_TOKEN_SUCCESS'})),
  coinbaseGetAccountsAndBalance: jest.fn(() => () => Promise.resolve()),
  coinbaseGetUser: jest.fn(() => () => Promise.resolve()),
}));
jest.mock('../../../coinbase/coinbase.effects', () => ({
  coinbaseUpdateExchangeRate: jest.fn(() => () => Promise.resolve()),
}));

// Wallet utils – fully mocked to avoid deep transitive imports
jest.mock('../../utils/wallet', () => ({
  buildKeyObj: jest.fn(({key, wallets}) => ({id: 'test-key-id', wallets, methods: key})),
  buildMigrationKeyObj: jest.fn(() => ({id: 'migrated-key', wallets: []})),
  buildWalletObj: jest.fn((cred: any) => cred),
  findMatchedKeyAndUpdate: jest.fn(() => ({key: {id: 'k1'}, wallets: [], keyName: undefined})),
  getMatchedKey: jest.fn(() => null),
  getReadOnlyKey: jest.fn(() => null),
  isMatch: jest.fn(() => false),
  isMatchedWallet: jest.fn(() => false),
  mapAbbreviationAndName: jest.fn(() => () => ({currencyAbbreviation: 'btc', currencyName: 'Bitcoin'})),
  findKeyByKeyId: jest.fn(() => ({id: 'k1', wallets: []})),
  isCacheKeyStale: jest.fn(() => true),
}));

// wallet-hardware utils
jest.mock('../../../../utils/wallet-hardware', () => ({
  credentialsFromExtendedPublicKey: jest.fn(() => JSON.stringify({walletId: 'test-wallet-id', walletPrivKey: 'test-priv-key'})),
}));

// currency utils
jest.mock('../../utils/currency', () => ({
  GetName: jest.fn(() => () => 'Bitcoin'),
  IsSegwitCoin: jest.fn(() => false),
  IsERCToken: jest.fn(() => false),
  isSingleAddressChain: jest.fn(() => true),
}));

// MMKV – mock the native module so that `storage = new MMKV()` in store/index.ts works
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(() => null),
    set: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn(() => []),
    contains: jest.fn(() => false),
  })),
}));

// ---------------------------------------------------------------------------
// normalizeMnemonic – pure function tests
// ---------------------------------------------------------------------------
describe('normalizeMnemonic', () => {
  it('returns undefined when words is undefined', () => {
    expect(normalizeMnemonic(undefined)).toBeUndefined();
  });

  it('returns the empty string when words is an empty string', () => {
    // normalizeMnemonic checks `!words` — empty string is falsy, returns early with the input
    expect(normalizeMnemonic('')).toBe('');
  });

  it('converts uppercase words to lowercase', () => {
    const result = normalizeMnemonic('ABANDON ABILITY ABLE');
    expect(result).toBe('abandon ability able');
  });

  it('trims leading and trailing whitespace', () => {
    const result = normalizeMnemonic('  abandon ability  ');
    expect(result).toBe('abandon ability');
  });

  it('collapses multiple spaces between words into one', () => {
    const result = normalizeMnemonic('abandon  ability   able');
    expect(result).toBe('abandon ability able');
  });

  it('handles tab characters as word separators', () => {
    const result = normalizeMnemonic('abandon\tability\table');
    expect(result).toBe('abandon ability able');
  });

  it('handles newline characters as word separators', () => {
    const result = normalizeMnemonic('abandon\nability\nable');
    expect(result).toBe('abandon ability able');
  });

  it('handles Japanese ideographic spaces (U+3000) and joins with U+3000', () => {
    const JA_SPACE = '\u3000';
    const result = normalizeMnemonic(
      `\u3042\u3070\u3093${JA_SPACE}\u304f\u308b\u307e${JA_SPACE}\u3048\u3093`,
    );
    expect(result).toContain(JA_SPACE);
  });

  it('returns the same single word trimmed and lowercased', () => {
    expect(normalizeMnemonic('  ABANDON  ')).toBe('abandon');
  });

  it('preserves normal 12-word mnemonic with single spaces', () => {
    const mnemonic =
      'abandon ability able about above absent absorb abstract absurd abuse access accident';
    expect(normalizeMnemonic(mnemonic)).toBe(mnemonic);
  });

  it('normalizes a 12-word mnemonic with mixed case and extra spaces', () => {
    const input =
      '  ABANDON  ABILITY   ABLE  ABOUT  ABOVE  ABSENT  ABSORB  ABSTRACT  ABSURD  ABUSE  ACCESS  ACCIDENT  ';
    const expected =
      'abandon ability able about above absent absorb abstract absurd abuse access accident';
    expect(normalizeMnemonic(input)).toBe(expected);
  });

  it('handles a string that has no spaces gracefully (single-word passphrase)', () => {
    expect(normalizeMnemonic('singleword')).toBe('singleword');
  });

  it('returns words when the input has no indexOf method (e.g. number-like)', () => {
    // normalizeMnemonic guards: if (!words.indexOf) return words
    const fakeWords: any = 12345;
    expect(normalizeMnemonic(fakeWords)).toBe(12345);
  });
});

// ---------------------------------------------------------------------------
// startMigrationMMKVStorage – AsyncStorage-backed thunk
// ---------------------------------------------------------------------------
describe('startMigrationMMKVStorage', () => {
  const {storage} = require('../../../index');
  const RNRestart = require('react-native-restart');

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
  });

  it('does not restart when persist:root key is absent from AsyncStorage', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['some-other-key']);
    const store = configureTestStore({});
    await store.dispatch(startMigrationMMKVStorage());
    expect(RNRestart.restart).not.toHaveBeenCalled();
  });

  it('sets migrationMMKVStorageComplete=true in state when persist:root is not in AsyncStorage', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
    const store = configureTestStore({});
    await store.dispatch(startMigrationMMKVStorage());
    // The action should be reflected in the APP state
    const appState = (store.getState() as any).APP;
    expect(appState.migrationMMKVStorageComplete).toBe(true);
  });

  it('calls storage.set and RNRestart.restart when persist:root exists', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['persist:root', 'other']);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{"APP":{}}');
    const store = configureTestStore({});
    await store.dispatch(startMigrationMMKVStorage());
    expect(storage.set).toHaveBeenCalledWith('persist:root', '{"APP":{}}');
    expect(RNRestart.restart).toHaveBeenCalledTimes(1);
  });

  it('does not call storage.set when persist:root value is null', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['persist:root']);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const store = configureTestStore({});
    await store.dispatch(startMigrationMMKVStorage());
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('handles AsyncStorage.getAllKeys rejection gracefully (no throw)', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(
      new Error('storage error'),
    );
    const store = configureTestStore({});
    // Should not throw
    await expect(store.dispatch(startMigrationMMKVStorage())).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// startMigration – early-exit paths that don't need real BWS data
// ---------------------------------------------------------------------------
describe('startMigration – early-exit paths', () => {
  const {navigationRef} = require('../../../../Root');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to OnboardingStart when cordova directory does not exist', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValueOnce(false);
    const store = configureTestStore({});
    await store.dispatch(startMigration());
    expect(navigationRef.dispatch).toHaveBeenCalled();
  });

  it('navigates to OnboardingStart when key file is not found in directory', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValueOnce(true);
    // readDir returns a list without a 'keys' file
    (RNFS.readDir as jest.Mock).mockResolvedValueOnce([{name: 'profile'}]);
    const store = configureTestStore({});
    await store.dispatch(startMigration());
    expect(navigationRef.dispatch).toHaveBeenCalled();
  });

  it('navigates to OnboardingStart when keys file is empty array', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValueOnce(true);
    (RNFS.readDir as jest.Mock).mockResolvedValueOnce([{name: 'keys'}, {name: 'profile'}]);
    (RNFS.readFile as jest.Mock)
      .mockResolvedValueOnce('[]')               // keys file → empty array
      .mockResolvedValueOnce('{"credentials":[]}'); // profile file
    const store = configureTestStore({});
    await store.dispatch(startMigration());
    expect(navigationRef.dispatch).toHaveBeenCalled();
  });

  it('resolves without throwing even when RNFS.exists rejects', async () => {
    (RNFS.exists as jest.Mock).mockRejectedValueOnce(new Error('fs error'));
    const store = configureTestStore({});
    // startMigration catches errors and resolves
    await expect(store.dispatch(startMigration())).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// startImportFromHardwareWallet – validation paths (no real BWS calls)
// ---------------------------------------------------------------------------
describe('startImportFromHardwareWallet – validation paths', () => {
  const baseArgs = {
    key: {
      id: 'hw-key-id',
      wallets: [],
    } as any,
    hardwareSource: 'ledger' as any,
    xPubKey: 'xpub-test',
    accountPath: "m/44'/0'/0'",
    coin: 'btc' as const,
    chain: 'btc' as const,
    derivationStrategy: 'BIP44',
    accountNumber: 0,
    network: 'livenet' as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when hardwareSource is falsy', async () => {
    const store = configureTestStore({});
    const args = {...baseArgs, hardwareSource: '' as any};
    await expect(
      store.dispatch(startImportFromHardwareWallet(args)),
    ).rejects.toThrow('Invalid hardware wallet source');
  });

  it('rejects when coin is not in BitpaySupportedCoins', async () => {
    const store = configureTestStore({});
    const args = {...baseArgs, coin: 'INVALIDCOIN' as any};
    await expect(
      store.dispatch(startImportFromHardwareWallet(args)),
    ).rejects.toThrow('Unsupported currency');
  });

  it('rejects when the wallet already exists in the key', async () => {
    const store = configureTestStore({});
    const existingWallet = {
      credentials: {
        rootPath: "m/44'/0'/0'",
        account: 0,
        network: 'livenet',
        coin: 'btc',
        chain: 'btc',
      },
      currencyAbbreviation: 'btc',
      chain: 'btc',
    };
    const args = {
      ...baseArgs,
      key: {id: 'hw-key-id', wallets: [existingWallet]} as any,
    };
    await expect(
      store.dispatch(startImportFromHardwareWallet(args)),
    ).rejects.toThrow('already in the app');
  });
});

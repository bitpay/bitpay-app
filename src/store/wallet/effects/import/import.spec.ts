/**
 * Tests for import.ts
 *
 * Strategy:
 *   - normalizeMnemonic   : exported pure function — exhaustive unit tests
 *   - startMigrationMMKVStorage : thunk that reads/writes AsyncStorage (mocked)
 *   - startMigration      : thunk — test the "no directory" / "no keys" early-
 *                           exit paths that trigger navigation without needing BWS
 *   - serverAssistedImport : progress-message queue never delays the result
 *   - getMissingVmAccounts (private) : indirectly via startImportMnemonic flow
 */

import configureTestStore from '@test/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  linkTokenToWallet,
  normalizeMnemonic,
  startMigrationMMKVStorage,
  startMigration,
  serverAssistedImport,
} from './import';
import {BwcProvider} from '../../../../lib/bwc';
import {ongoingProcessManager} from '../../../../managers/OngoingProcessManager';

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
  addTokenChainSuffix: jest.fn(
    (addr: string, chain: string) => `${addr}_e.${chain}`,
  ),
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

// Wallet utils – fully mocked to avoid deep transitive imports
jest.mock('../../utils/wallet', () => ({
  buildKeyObj: jest.fn(({key, wallets}) => ({
    id: 'test-key-id',
    wallets,
    methods: key,
  })),
  buildMigrationKeyObj: jest.fn(() => ({id: 'migrated-key', wallets: []})),
  buildWalletObj: jest.fn((cred: any) => cred),
  findMatchedKeyAndUpdate: jest.fn(() => ({
    key: {id: 'k1'},
    wallets: [],
    keyName: undefined,
  })),
  getMatchedKey: jest.fn(() => null),
  getReadOnlyKey: jest.fn(() => null),
  isMatch: jest.fn(() => false),
  isMatchedWallet: jest.fn(() => false),
  mapAbbreviationAndName: jest.fn(() => () => ({
    currencyAbbreviation: 'btc',
    currencyName: 'Bitcoin',
  })),
  findKeyByKeyId: jest.fn(() => ({id: 'k1', wallets: []})),
  isCacheKeyStale: jest.fn(() => true),
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
describe('linkTokenToWallet', () => {
  const makeWallet = (walletId: string, tokenAddress?: string): any => ({
    credentials: {
      walletId,
      ...(tokenAddress ? {token: {address: tokenAddress}} : {}),
    },
  });

  it('links an EVM token wallet to the wallet it belongs to', () => {
    const baseWallet = makeWallet('wallet-1');
    const tokenWallet = makeWallet('wallet-1-0xtoken', '0xtoken');

    linkTokenToWallet([tokenWallet], [baseWallet, tokenWallet]);

    expect(baseWallet.tokens).toEqual(['wallet-1-0xtoken']);
  });

  it('links an SVM token wallet, whose mint is not 0x prefixed', () => {
    const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const baseWallet = makeWallet('wallet-1');
    const tokenWallet = makeWallet(`wallet-1-${mint}`, mint);

    linkTokenToWallet([tokenWallet], [baseWallet, tokenWallet]);

    expect(baseWallet.tokens).toEqual([`wallet-1-${mint}`]);
  });

  it('links a token of a multisig wallet to the multisig wallet, not to the wallet it derives from', () => {
    const baseWallet = makeWallet('wallet-1');
    const multisigWallet = makeWallet('wallet-1-0xmultisig');
    const tokenWallet = makeWallet('wallet-1-0xmultisig-0xtoken', '0xtoken');

    linkTokenToWallet([tokenWallet], [baseWallet, multisigWallet, tokenWallet]);

    expect(multisigWallet.tokens).toEqual(['wallet-1-0xmultisig-0xtoken']);
    expect(baseWallet.tokens).toBeUndefined();
  });

  it('leaves wallets untouched when the token carries no address', () => {
    const baseWallet = makeWallet('wallet-1');
    const tokenWallet = makeWallet('wallet-1-0xtoken');

    linkTokenToWallet([tokenWallet], [baseWallet, tokenWallet]);

    expect(baseWallet.tokens).toBeUndefined();
  });
});

describe('startMigrationMMKVStorage', () => {
  const {storage} = require('../../../index');
  const RNRestart = require('react-native-restart');
  beforeEach(() => {
    jest.clearAllMocks();
    require('../../../vault-storage').activateVaultStorage();
  });
  it('satisfies the existing UI gate from committed activation without touching old sources', async () => {
    const store = configureTestStore({});
    await store.dispatch(startMigrationMMKVStorage());
    expect((store.getState() as any).APP.migrationMMKVStorageComplete).toBe(
      true,
    );
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(AsyncStorage.getAllKeys).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
    expect(RNRestart.restart).not.toHaveBeenCalled();
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
    (RNFS.readDir as jest.Mock).mockResolvedValueOnce([
      {name: 'keys'},
      {name: 'profile'},
    ]);
    (RNFS.readFile as jest.Mock)
      .mockResolvedValueOnce('[]') // keys file → empty array
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
// serverAssistedImport – progress messages are paced but never delay the result
// ---------------------------------------------------------------------------

describe('serverAssistedImport – progress queue', () => {
  const bwcImport = BwcProvider.API.serverAssistedImport as jest.Mock;
  let emitter: any;
  let show: jest.SpyInstance;

  const wallet = (walletId: string) => ({credentials: {walletId}} as any);

  beforeEach(() => {
    jest.useFakeTimers();
    show = jest.spyOn(ongoingProcessManager, 'show').mockImplementation();
    bwcImport.mockImplementation((_opts, _clientOpts, events) => {
      emitter = events;
    });
  });

  afterEach(() => {
    show.mockRestore();
    bwcImport.mockReset();
    jest.useRealTimers();
  });

  const emitProgress = () => {
    emitter.emit('findingCopayers', 16);
    emitter.emit('foundCopayers', 2);
    emitter.emit('findingCopayers', 2);
    emitter.emit('foundCopayers', 0);
    emitter.emit('gettingStatuses');
    emitter.emit('gatheringWalletsInfos', 2);
  };

  it('paces queued messages one per second while the import runs', () => {
    serverAssistedImport({words: 'w'});
    emitProgress();

    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenLastCalledWith('findingCopayers', expect.anything());
    jest.advanceTimersByTime(1000);
    expect(show).toHaveBeenCalledTimes(2);
    expect(show).toHaveBeenLastCalledWith('foundCopayers', expect.anything());
  });

  it('resolves on done without waiting for queued messages', async () => {
    const result = serverAssistedImport({words: 'w'});
    emitProgress();
    emitter.emit('done', {key: {id: 'k'}, clients: [wallet('a'), wallet('a')]});

    await expect(result).resolves.toEqual({
      key: {id: 'k'},
      wallets: [wallet('a')],
    });
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('shows no queued message after done, so the modal cannot reappear', async () => {
    const result = serverAssistedImport({words: 'w'});
    emitProgress();
    emitter.emit('done', {key: {id: 'k'}, clients: [wallet('a')]});
    await result;

    emitter.emit('gettingStatuses');
    jest.advanceTimersByTime(60000);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('rejects on error without waiting for queued messages', async () => {
    const result = serverAssistedImport({words: 'w'});
    emitProgress();
    emitter.emit('error', new Error('boom'));

    await expect(result).rejects.toThrow('boom');
    jest.advanceTimersByTime(60000);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('still rejects with WALLET_DOES_NOT_EXIST when nothing was found', async () => {
    const result = serverAssistedImport({words: 'w'});
    emitter.emit('done', {key: {id: 'k'}, clients: []});

    await expect(result).rejects.toThrow('WALLET_DOES_NOT_EXIST');
  });
});

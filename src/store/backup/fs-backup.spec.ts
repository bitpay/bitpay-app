/**
 * Tests for src/store/backup/fs-backup.ts
 *
 * react-native-fs is fully mocked in test/setup.js (all methods are jest.fn()).
 * Sentry is also mocked in setup.js.
 *
 * The module has a module-level `cachedBackupExists` boolean. We use
 * jest.isolateModules (with helper-methods mocked to avoid the bwc/bitcore
 * chain) to get a fresh module instance per-test.
 */
import RNFS from 'react-native-fs';

// Mock only what fs-backup needs from helper-methods. Using requireActual here
// would pull in the bwc/bitcore-lib chain and cause duplicate-instance errors
// when jest.isolateModules re-requires the module.
jest.mock('../../utils/helper-methods', () => ({
  getErrorString: jest.fn((err: any) =>
    err instanceof Error ? err.message : String(err),
  ),
  sleep: jest.fn(() => Promise.resolve()),
}));

// Mock LogActions and initLogs so the module loads without a Redux store
jest.mock('../../store/log', () => ({
  LogActions: {
    persistLog: jest.fn(a => a),
    error: jest.fn((msg: string) => ({type: 'LOG/ERROR', payload: msg})),
  },
}));

jest.mock('../../store/log/initLogs', () => ({
  add: jest.fn(),
}));

const mockedRNFS = RNFS as jest.Mocked<typeof RNFS>;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get a fresh module instance (resets module-level cachedBackupExists)
// ─────────────────────────────────────────────────────────────────────────────
function getFreshModule(): typeof import('./fs-backup') {
  let mod: typeof import('./fs-backup');
  jest.isolateModules(() => {
    mod = require('./fs-backup');
  });
  return mod!;
}

const safeRoot = (extra: {[key: string]: any} = {}) =>
  JSON.stringify({
    ...extra,
    WALLET: {keys: {}, secretsMigrated: true},
  });

// ─────────────────────────────────────────────────────────────────────────────
// backupFileExists
// ─────────────────────────────────────────────────────────────────────────────

describe('backupFileExists', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns true when the file exists', async () => {
    const {backupFileExists} = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValueOnce(true);
    expect(await backupFileExists()).toBe(true);
  });

  it('returns false when the file does not exist', async () => {
    const {backupFileExists} = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValueOnce(false);
    expect(await backupFileExists()).toBe(false);
  });

  it('returns false when RNFS.exists throws', async () => {
    const {backupFileExists} = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockRejectedValueOnce(
      new Error('fs error'),
    );
    expect(await backupFileExists()).toBe(false);
  });

  it('returns true from cache on second call without hitting RNFS again', async () => {
    const {backupFileExists} = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValueOnce(true);
    await backupFileExists(); // sets cachedBackupExists = true
    jest.clearAllMocks();
    const result = await backupFileExists(); // should short-circuit via cache
    expect(result).toBe(true);
    expect(mockedRNFS.exists).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// backupPersistRoot
// ─────────────────────────────────────────────────────────────────────────────

describe('backupPersistRoot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(false);
    (mockedRNFS.writeFile as jest.Mock).mockResolvedValue(undefined);
    (mockedRNFS.moveFile as jest.Mock).mockResolvedValue(undefined);
    (mockedRNFS.unlink as jest.Mock).mockResolvedValue(undefined);
    (mockedRNFS.mkdir as jest.Mock).mockResolvedValue(undefined);
  });

  it('strips MARKET_STATS, PORTFOLIO, RATE, SHOP_CATALOG and keeps other fields', async () => {
    const {backupPersistRoot} = getFreshModule();
    const raw = JSON.stringify({
      MARKET_STATS: {a: 1},
      PORTFOLIO: {b: 2},
      RATE: {c: 3},
      SHOP_CATALOG: {d: 4},
      WALLET: {
        keys: {},
        secretsMigrated: true,
      },
    });
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(false);
    await backupPersistRoot(raw);

    expect(mockedRNFS.writeFile).toHaveBeenCalledTimes(1);
    const written = JSON.parse(
      (mockedRNFS.writeFile as jest.Mock).mock.calls[0][1],
    );
    expect(written.MARKET_STATS).toBeUndefined();
    expect(written.PORTFOLIO).toBeUndefined();
    expect(written.RATE).toBeUndefined();
    expect(written.SHOP_CATALOG).toBeUndefined();
    expect(written.WALLET).toEqual({
      keys: {},
      secretsMigrated: true,
    });
  });

  it('preserves malformed payload backup behavior before migration cleanup', async () => {
    const {backupPersistRoot} = getFreshModule();
    const rawJson = 'not valid json {{{}}}';
    await backupPersistRoot(rawJson);

    expect(mockedRNFS.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      rawJson,
      'utf8',
    );
  });

  it('preserves legacy backups before migration cleanup', async () => {
    const {backupPersistRoot} = getFreshModule();
    const rawJson = JSON.stringify({
      WALLET: JSON.stringify({
        secretsMigrated: true,
        properties: {mnemonic: 'legacy plaintext'},
      }),
    });

    await backupPersistRoot(rawJson);

    expect(mockedRNFS.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      rawJson,
      'utf8',
    );
  });

  it('accepts a redux-persist wallet slice once migrated', async () => {
    const {backupPersistRoot} = getFreshModule();
    const rawJson = JSON.stringify({
      WALLET: JSON.stringify({secretsMigrated: true}),
    });

    await backupPersistRoot(rawJson);

    expect(mockedRNFS.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      rawJson,
      'utf8',
    );
  });

  it('creates the directory when it does not exist', async () => {
    const {backupPersistRoot} = getFreshModule();
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(false) // ensureDir: BASE_DIR not exists → mkdir
      .mockResolvedValue(false); // final file does not exist
    await backupPersistRoot(safeRoot());
    expect(mockedRNFS.mkdir).toHaveBeenCalledTimes(1);
  });

  it('skips mkdir when the directory already exists', async () => {
    const {backupPersistRoot} = getFreshModule();
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(true) // ensureDir: dir exists
      .mockResolvedValue(false); // no final file
    await backupPersistRoot(safeRoot());
    expect(mockedRNFS.mkdir).not.toHaveBeenCalled();
  });

  it('rotates final→backup and moves temp→final when final exists but backup does not', async () => {
    const {backupPersistRoot} = getFreshModule();
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(true) // ensureDir: dir exists
      .mockResolvedValueOnce(true) // finalExists = true
      .mockResolvedValueOnce(false); // bakExists = false → no unlink
    await backupPersistRoot(safeRoot());
    expect(mockedRNFS.unlink).not.toHaveBeenCalled();
    expect(mockedRNFS.moveFile).toHaveBeenCalledTimes(2); // FINAL→BAK, TEMP→FINAL
  });

  it('unlinks old backup before rotating when both final and backup exist', async () => {
    const {backupPersistRoot} = getFreshModule();
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(true) // ensureDir: dir exists
      .mockResolvedValueOnce(true) // finalExists = true
      .mockResolvedValueOnce(true); // bakExists = true → unlink
    await backupPersistRoot(safeRoot());
    expect(mockedRNFS.unlink).toHaveBeenCalledTimes(1);
    expect(mockedRNFS.moveFile).toHaveBeenCalledTimes(2);
  });

  it('still moves temp→final even when the final→backup rotation throws', async () => {
    const {backupPersistRoot} = getFreshModule();
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(true) // ensureDir: dir exists
      .mockResolvedValueOnce(true) // finalExists
      .mockResolvedValueOnce(false); // bakExists = false
    (mockedRNFS.moveFile as jest.Mock)
      .mockRejectedValueOnce(new Error('rotate failed'))
      .mockResolvedValueOnce(undefined);
    await backupPersistRoot(safeRoot());
    expect(mockedRNFS.moveFile).toHaveBeenCalledTimes(2);
  });

  it('cleans up temp file when writeFile throws', async () => {
    const {backupPersistRoot} = getFreshModule();
    (mockedRNFS.writeFile as jest.Mock).mockRejectedValueOnce(
      new Error('write error'),
    );
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(true) // ensureDir: dir exists
      .mockResolvedValueOnce(true); // tmpExists = true → unlink temp
    await backupPersistRoot(safeRoot());
    expect(mockedRNFS.unlink).toHaveBeenCalledTimes(1);
  });

  it('does not throw even if temp file cleanup also fails', async () => {
    const {backupPersistRoot} = getFreshModule();
    (mockedRNFS.writeFile as jest.Mock).mockRejectedValueOnce(
      new Error('write error'),
    );
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(true) // ensureDir: dir exists
      .mockResolvedValueOnce(true); // tmpExists = true
    (mockedRNFS.unlink as jest.Mock).mockRejectedValueOnce(
      new Error('unlink error'),
    );
    await expect(backupPersistRoot(safeRoot())).resolves.toBeUndefined();
  });
});

describe('removePersistRootBackups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedRNFS.unlink as jest.Mock).mockResolvedValue(undefined);
  });

  it('removes the final, rolling, and temporary backups', async () => {
    const {removePersistRootBackups} = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(true);

    await removePersistRootBackups();

    expect(mockedRNFS.unlink).toHaveBeenCalledTimes(3);
  });

  it('rejects when a legacy backup cannot be removed', async () => {
    const {removePersistRootBackups} = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(true);
    (mockedRNFS.unlink as jest.Mock).mockRejectedValueOnce(
      new Error('unlink failed'),
    );

    await expect(removePersistRootBackups()).rejects.toThrow('unlink failed');
    expect(mockedRNFS.unlink).toHaveBeenCalledTimes(3);
  });

  it('invalidates the cached existence result after cleanup', async () => {
    const {
      backupFileExists,
      removePersistRootBackups,
      resumePersistRootBackups,
    } = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(true);
    await backupFileExists();
    await removePersistRootBackups();
    await resumePersistRootBackups();

    jest.clearAllMocks();
    (mockedRNFS.exists as jest.Mock).mockResolvedValueOnce(false);

    expect(await backupFileExists()).toBe(false);
    expect(mockedRNFS.exists).toHaveBeenCalledTimes(1);
  });

  it('ignores an existence check that started before cleanup', async () => {
    const {
      backupFileExists,
      removePersistRootBackups,
      resumePersistRootBackups,
    } = getFreshModule();
    let resolveStaleCheck!: (exists: boolean) => void;
    (mockedRNFS.exists as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise<boolean>(resolve => {
            resolveStaleCheck = resolve;
          }),
      )
      .mockResolvedValue(false);

    const staleCheck = backupFileExists();
    const cleanup = removePersistRootBackups();
    resolveStaleCheck(true);

    expect(await staleCheck).toBe(false);

    await cleanup;
    await resumePersistRootBackups();

    jest.clearAllMocks();
    (mockedRNFS.exists as jest.Mock).mockResolvedValueOnce(false);
    expect(await backupFileExists()).toBe(false);
    expect(mockedRNFS.exists).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache set by a backup that was already in flight', async () => {
    const {
      backupFileExists,
      backupPersistRoot,
      removePersistRootBackups,
      resumePersistRootBackups,
    } = getFreshModule();
    let releaseWrite!: () => void;
    let markWriteStarted!: () => void;
    const writeStarted = new Promise<void>(resolve => {
      markWriteStarted = resolve;
    });
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(false);
    (mockedRNFS.writeFile as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          releaseWrite = resolve;
          markWriteStarted();
        }),
    );
    (mockedRNFS.moveFile as jest.Mock).mockResolvedValue(undefined);

    const pendingBackup = backupPersistRoot(safeRoot());
    await writeStarted;
    const cleanup = removePersistRootBackups();
    releaseWrite();
    await pendingBackup;
    await cleanup;
    await resumePersistRootBackups();

    jest.clearAllMocks();
    (mockedRNFS.exists as jest.Mock).mockResolvedValueOnce(false);
    expect(await backupFileExists()).toBe(false);
    expect(mockedRNFS.exists).toHaveBeenCalledTimes(1);
  });

  it('does not consult the filesystem while backups are suspended', async () => {
    const {
      backupFileExists,
      removePersistRootBackups,
      resumePersistRootBackups,
    } = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(false);

    await removePersistRootBackups();
    jest.clearAllMocks();

    expect(await backupFileExists()).toBe(false);
    expect(mockedRNFS.exists).not.toHaveBeenCalled();

    await resumePersistRootBackups();
  });

  it('defers new backups until cleanup is resumed', async () => {
    const {
      backupPersistRoot,
      removePersistRootBackups,
      resumePersistRootBackups,
    } = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(false);
    (mockedRNFS.mkdir as jest.Mock).mockResolvedValue(undefined);
    (mockedRNFS.writeFile as jest.Mock).mockResolvedValue(undefined);
    (mockedRNFS.moveFile as jest.Mock).mockResolvedValue(undefined);

    const rawJson = safeRoot();
    const cleanup = removePersistRootBackups();
    await backupPersistRoot(rawJson);
    await backupPersistRoot(
      JSON.stringify({WALLET: JSON.stringify({secretsMigrated: false})}),
    );
    await cleanup;

    expect(mockedRNFS.writeFile).not.toHaveBeenCalled();

    await resumePersistRootBackups();

    expect(mockedRNFS.writeFile).toHaveBeenCalledTimes(1);
    expect(mockedRNFS.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      rawJson,
      'utf8',
    );
  });

  it('rejects a late legacy payload after a migrated backup was written', async () => {
    const {
      backupPersistRoot,
      removePersistRootBackups,
      resumePersistRootBackups,
    } = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(false);
    (mockedRNFS.mkdir as jest.Mock).mockResolvedValue(undefined);
    (mockedRNFS.writeFile as jest.Mock).mockResolvedValue(undefined);
    (mockedRNFS.moveFile as jest.Mock).mockResolvedValue(undefined);

    await removePersistRootBackups();
    await resumePersistRootBackups();
    const migrated = safeRoot();
    await backupPersistRoot(migrated);
    await backupPersistRoot(
      JSON.stringify({
        WALLET: JSON.stringify({
          secretsMigrated: false,
          keys: {key1: {properties: {mnemonic: 'legacy plaintext'}}},
        }),
      }),
    );

    expect(mockedRNFS.writeFile).toHaveBeenCalledTimes(1);
    expect(mockedRNFS.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      migrated,
      'utf8',
    );
  });

  it('can discard a deferred backup after a failed migration', async () => {
    const {
      backupPersistRoot,
      removePersistRootBackups,
      resumePersistRootBackups,
    } = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(false);

    const cleanup = removePersistRootBackups();
    await backupPersistRoot(safeRoot());
    await cleanup;
    await resumePersistRootBackups(true);

    expect(mockedRNFS.writeFile).not.toHaveBeenCalled();
  });

  it('rejects a late legacy write after cleanup has resumed', async () => {
    const {
      backupPersistRoot,
      removePersistRootBackups,
      resumePersistRootBackups,
    } = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(false);

    await removePersistRootBackups();
    await resumePersistRootBackups();
    await backupPersistRoot(
      JSON.stringify({
        WALLET: JSON.stringify({secretsMigrated: false}),
      }),
    );

    expect(mockedRNFS.writeFile).not.toHaveBeenCalled();
  });

  it('backs up an unmigrated payload again after a discarded migration', async () => {
    const {
      backupPersistRoot,
      removePersistRootBackups,
      resumePersistRootBackups,
    } = getFreshModule();
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(false);
    const unmigrated = JSON.stringify({
      WALLET: JSON.stringify({secretsMigrated: false}),
    });

    await removePersistRootBackups();
    await resumePersistRootBackups(true);
    await backupPersistRoot(unmigrated);

    expect(mockedRNFS.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      unmigrated,
      'utf8',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// readBackupPersistRoot
// ─────────────────────────────────────────────────────────────────────────────

describe('readBackupPersistRoot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedRNFS.exists as jest.Mock).mockResolvedValue(false);
  });

  it('returns valid JSON data from the final file', async () => {
    const {readBackupPersistRoot} = getFreshModule();
    const jsonStr = '{"WALLET":{"keys":{}}}';
    (mockedRNFS.exists as jest.Mock).mockResolvedValueOnce(true);
    (mockedRNFS.readFile as jest.Mock).mockResolvedValueOnce(jsonStr);
    expect(await readBackupPersistRoot()).toBe(jsonStr);
  });

  it('falls through to backup when final file contains invalid JSON', async () => {
    const {readBackupPersistRoot} = getFreshModule();
    const bakJson = '{"WALLET":{}}';
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(true) // final exists
      .mockResolvedValueOnce(true); // bak exists
    (mockedRNFS.readFile as jest.Mock)
      .mockResolvedValueOnce('not valid json')
      .mockResolvedValueOnce(bakJson);
    expect(await readBackupPersistRoot()).toBe(bakJson);
  });

  it('returns null when final read throws and backup does not exist', async () => {
    const {readBackupPersistRoot} = getFreshModule();
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(true) // final exists
      .mockResolvedValueOnce(false); // bak does not exist
    (mockedRNFS.readFile as jest.Mock).mockRejectedValueOnce(
      new Error('read error'),
    );
    expect(await readBackupPersistRoot()).toBeNull();
  });

  it('returns null when backup file data is also invalid JSON', async () => {
    const {readBackupPersistRoot} = getFreshModule();
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(true) // final exists
      .mockResolvedValueOnce(true); // bak exists
    (mockedRNFS.readFile as jest.Mock)
      .mockResolvedValueOnce('bad json')
      .mockResolvedValueOnce('also bad');
    expect(await readBackupPersistRoot()).toBeNull();
  });

  it('returns null when neither final nor backup file exists', async () => {
    const {readBackupPersistRoot} = getFreshModule();
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(false) // final does not exist
      .mockResolvedValueOnce(false); // bak does not exist
    expect(await readBackupPersistRoot()).toBeNull();
  });

  it('returns null when final does not exist and backup read throws', async () => {
    const {readBackupPersistRoot} = getFreshModule();
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(false) // final does not exist
      .mockResolvedValueOnce(true); // bak exists
    (mockedRNFS.readFile as jest.Mock).mockRejectedValueOnce(
      new Error('bak read error'),
    );
    expect(await readBackupPersistRoot()).toBeNull();
  });

  it('returns valid JSON from backup when final does not exist', async () => {
    const {readBackupPersistRoot} = getFreshModule();
    const bakJson = '{"keys":{"k1":{}}}';
    (mockedRNFS.exists as jest.Mock)
      .mockResolvedValueOnce(false) // final does not exist
      .mockResolvedValueOnce(true); // bak exists
    (mockedRNFS.readFile as jest.Mock).mockResolvedValueOnce(bakJson);
    expect(await readBackupPersistRoot()).toBe(bakJson);
  });
});

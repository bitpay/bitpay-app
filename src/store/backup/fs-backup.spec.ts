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
// Helper: in-memory fs that reproduces the iOS semantics behind RN-2417 —
// NSFileManager.moveItem rejects when the source is gone OR when something
// already sits at the destination, and createFileAtPath rejects when the
// containing directory is missing.
// ─────────────────────────────────────────────────────────────────────────────
type Entry = 'dir' | 'final' | 'bak' | 'tmp';

const entryOf = (path: string): Entry =>
  path.endsWith('.tmp')
    ? 'tmp'
    : path.endsWith('.bak')
    ? 'bak'
    : path.endsWith('.json')
    ? 'final'
    : 'dir';

function mockFs(initial: Entry[] = []): Set<Entry> {
  const fs = new Set<Entry>(initial);

  (mockedRNFS.exists as jest.Mock).mockImplementation((path: string) =>
    Promise.resolve(fs.has(entryOf(path))),
  );
  (mockedRNFS.mkdir as jest.Mock).mockImplementation((path: string) => {
    fs.add(entryOf(path));
    return Promise.resolve();
  });
  (mockedRNFS.writeFile as jest.Mock).mockImplementation((path: string) => {
    if (!fs.has('dir')) {
      return Promise.reject(
        new Error(`ENOENT: no such file or directory, open '${path}'`),
      );
    }
    fs.add(entryOf(path));
    return Promise.resolve();
  });
  (mockedRNFS.unlink as jest.Mock).mockImplementation((path: string) => {
    fs.delete(entryOf(path));
    return Promise.resolve();
  });
  (mockedRNFS.moveFile as jest.Mock).mockImplementation(
    (src: string, dest: string) => {
      if (!fs.has(entryOf(src))) {
        return Promise.reject(
          new Error(
            `"${src}" couldn't be moved because the former doesn't exist`,
          ),
        );
      }
      if (fs.has(entryOf(dest))) {
        return Promise.reject(
          new Error(
            `"${src}" couldn't be moved because an item with the same name already exists`,
          ),
        );
      }
      fs.delete(entryOf(src));
      fs.add(entryOf(dest));
      return Promise.resolve();
    },
  );

  return fs;
}

const currentMoveImpl = () =>
  (mockedRNFS.moveFile as jest.Mock).getMockImplementation()!;

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
    mockFs(['dir']);
  });

  it('strips MARKET_STATS, PORTFOLIO, RATE, SHOP_CATALOG and keeps other fields', async () => {
    const {backupPersistRoot} = getFreshModule();
    const raw = JSON.stringify({
      MARKET_STATS: {a: 1},
      PORTFOLIO: {b: 2},
      RATE: {c: 3},
      SHOP_CATALOG: {d: 4},
      WALLET: {keys: {}},
    });
    await backupPersistRoot(raw);

    expect(mockedRNFS.writeFile).toHaveBeenCalledTimes(1);
    const written = JSON.parse(
      (mockedRNFS.writeFile as jest.Mock).mock.calls[0][1],
    );
    expect(written.MARKET_STATS).toBeUndefined();
    expect(written.PORTFOLIO).toBeUndefined();
    expect(written.RATE).toBeUndefined();
    expect(written.SHOP_CATALOG).toBeUndefined();
    expect(written.WALLET).toEqual({keys: {}});
  });

  it('writes raw JSON unchanged when JSON.parse fails', async () => {
    const {backupPersistRoot} = getFreshModule();
    const rawJson = 'not valid json {{{}}}';
    await backupPersistRoot(rawJson);

    expect(mockedRNFS.writeFile).toHaveBeenCalledTimes(1);
    expect((mockedRNFS.writeFile as jest.Mock).mock.calls[0][1]).toBe(rawJson);
  });

  it('creates the directory when it does not exist and still lands the backup', async () => {
    const {backupPersistRoot} = getFreshModule();
    const fs = mockFs([]);
    await backupPersistRoot('{}');
    expect(mockedRNFS.mkdir).toHaveBeenCalledTimes(1);
    expect(fs.has('final')).toBe(true);
    expect(fs.has('tmp')).toBe(false);
  });

  it('skips mkdir when the directory already exists', async () => {
    const {backupPersistRoot} = getFreshModule();
    await backupPersistRoot('{}');
    expect(mockedRNFS.mkdir).not.toHaveBeenCalled();
  });

  it('rotates final→backup and moves temp→final when final exists but backup does not', async () => {
    const {backupPersistRoot} = getFreshModule();
    const fs = mockFs(['dir', 'final']);
    await backupPersistRoot('{}');
    expect(mockedRNFS.moveFile).toHaveBeenCalledTimes(2); // FINAL→BAK, TEMP→FINAL
    expect(fs.has('final')).toBe(true);
    expect(fs.has('bak')).toBe(true);
    expect(fs.has('tmp')).toBe(false);
  });

  it('unlinks the old backup before rotating when both final and backup exist', async () => {
    const {backupPersistRoot} = getFreshModule();
    const fs = mockFs(['dir', 'final', 'bak']);
    await backupPersistRoot('{}');
    expect(mockedRNFS.unlink).toHaveBeenCalledTimes(1);
    expect(mockedRNFS.moveFile).toHaveBeenCalledTimes(2);
    expect(fs.has('final')).toBe(true);
  });

  // RN-2417: `"persist-root.json.tmp" couldn't be moved ... an item with the
  // same name already exists` — a failed rotation left the final file in place.
  it('overwrites the final file when the final→backup rotation throws', async () => {
    const {backupPersistRoot} = getFreshModule();
    const fs = mockFs(['dir', 'final']);
    const move = currentMoveImpl();
    let calls = 0;
    (mockedRNFS.moveFile as jest.Mock).mockImplementation((src, dest) =>
      ++calls === 1
        ? Promise.reject(new Error('rotate failed'))
        : move(src, dest),
    );

    await expect(backupPersistRoot('{}')).resolves.toBeUndefined();
    expect(mockedRNFS.moveFile).toHaveBeenCalledTimes(2);
    expect(fs.has('final')).toBe(true);
    expect(fs.has('tmp')).toBe(false);
  });

  // RN-2417: `"persist-root.json.tmp" couldn't be moved ... the former doesn't
  // exist, or the folder containing the latter doesn't exist` — iOS purged the
  // cache directory between the temp write and the move.
  it('retries once when the cache directory is purged between write and move', async () => {
    const {backupPersistRoot} = getFreshModule();
    const fs = mockFs(['dir']);
    const move = currentMoveImpl();
    let purged = false;
    (mockedRNFS.moveFile as jest.Mock).mockImplementation((src, dest) => {
      if (!purged) {
        purged = true;
        fs.clear(); // system wiped CachesDirectoryPath
        return Promise.reject(new Error("the former doesn't exist"));
      }
      return move(src, dest);
    });

    await expect(backupPersistRoot('{}')).resolves.toBeUndefined();
    expect(mockedRNFS.writeFile).toHaveBeenCalledTimes(2);
    expect(mockedRNFS.mkdir).toHaveBeenCalledTimes(1); // recreated after the purge
    expect(fs.has('final')).toBe(true);
  });

  it('cleans up the temp file and rejects when the write keeps failing', async () => {
    const {backupPersistRoot} = getFreshModule();
    const fs = mockFs(['dir']);
    (mockedRNFS.writeFile as jest.Mock).mockImplementation(() => {
      fs.add('tmp');
      return Promise.reject(new Error('write error'));
    });

    await expect(backupPersistRoot('{}')).rejects.toThrow('write error');
    expect(mockedRNFS.writeFile).toHaveBeenCalledTimes(2);
    expect(fs.has('tmp')).toBe(false);
  });

  it('rejects but does not blow up when temp file cleanup also fails', async () => {
    const {backupPersistRoot} = getFreshModule();
    mockFs(['dir', 'tmp']);
    (mockedRNFS.writeFile as jest.Mock).mockRejectedValue(
      new Error('write error'),
    );
    (mockedRNFS.unlink as jest.Mock).mockRejectedValue(
      new Error('unlink error'),
    );

    await expect(backupPersistRoot('{}')).rejects.toThrow('write error');
  });

  it('keeps the queue usable after a failed backup', async () => {
    const {backupPersistRoot} = getFreshModule();
    const fs = mockFs(['dir']);
    (mockedRNFS.writeFile as jest.Mock).mockRejectedValue(
      new Error('write error'),
    );
    await expect(backupPersistRoot('{}')).rejects.toThrow('write error');

    mockFs(['dir']);
    await expect(backupPersistRoot('{}')).resolves.toBeUndefined();
    expect(fs.has('final')).toBe(false); // second call uses its own fs
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

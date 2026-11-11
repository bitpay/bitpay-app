import {Platform} from 'react-native';
import {
  CloudStorage,
  CloudStorageError,
  CloudStorageErrorCode,
} from 'react-native-cloud-storage';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {
  CloudBackupError,
  connectToCloud,
  deleteCloudBackupFiles,
  getCloudBackupFileName,
  getCloudKeyshareFileName,
  groupBackupsByKey,
  saveCloudBackupFile,
} from './storage';

const storageMock = {
  isCloudAvailable: jest.fn(),
  exists: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
};

(CloudStorage as unknown as jest.Mock).mockImplementation(() => storageMock);

const saveError = async (contents = 'backup') => {
  try {
    await saveCloudBackupFile('BitPay-Backup-1-abc.json', contents);
  } catch (err) {
    return err as CloudBackupError;
  }
  throw new Error('expected saveCloudBackupFile to fail');
};

describe('getCloudBackupFileName', () => {
  it.each([
    ['a fingerprint', 'abcd1234'],
    ['an imported id', 'legacy_id/with spaces'],
  ])('names the file with a hex key reference for %s', (_label, keyRef) => {
    const name = getCloudBackupFileName(1793836800000, keyRef);

    expect(name).toMatch(/^BitPay-Backup-1793836800000-[0-9a-f]{16}\.json$/);
    expect(groupBackupsByKey([name])).toHaveLength(1);
  });
});

describe('groupBackupsByKey', () => {
  it('lists every file of each key newest first, newest key first', () => {
    const keyA = getCloudBackupFileName(100, 'aaaa1111');
    const keyALatest = getCloudBackupFileName(300, 'aaaa1111');
    const keyB = getCloudBackupFileName(200, 'bbbb2222');

    expect(
      groupBackupsByKey([keyA, keyB, keyALatest]).map(group =>
        group.files.map(file => file.name),
      ),
    ).toEqual([[keyALatest, keyA], [keyB]]);
  });

  it('keeps keyshare backups apart from recovery phrase backups of the same key', () => {
    const phrase = getCloudBackupFileName(100, 'aaaa1111');
    const keyshare = getCloudKeyshareFileName(200, 'aaaa1111');

    expect(
      groupBackupsByKey([phrase, keyshare]).map(({kind, files}) => [
        kind,
        files.map(file => file.name),
      ]),
    ).toEqual([
      ['keyshare', [keyshare]],
      ['phrase', [phrase]],
    ]);
  });

  it('ignores files that are not BitPay backups', () => {
    const name = getCloudBackupFileName(100, 'aaaa1111');

    expect(
      groupBackupsByKey([
        'notes.txt',
        name.replace('100', 'abc'),
        `${name}.icloud`,
        `Copy of ${name}`,
      ]),
    ).toEqual([]);
  });
});

describe('saveCloudBackupFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storageMock.exists.mockResolvedValue(false);
    storageMock.mkdir.mockResolvedValue(undefined);
    storageMock.writeFile.mockResolvedValue(undefined);
    storageMock.readFile.mockResolvedValue('backup');
  });

  it('writes a new file and reads it back', async () => {
    await saveCloudBackupFile('BitPay-Backup-1-abc.json', 'backup');

    expect(storageMock.mkdir).toHaveBeenCalledWith('BitPay Backups');
    expect(storageMock.writeFile).toHaveBeenCalledWith(
      'BitPay Backups/BitPay-Backup-1-abc.json',
      'backup',
    );
  });

  it('never overwrites an existing file', async () => {
    storageMock.exists.mockResolvedValue(true);

    expect((await saveError()).reason).toBe('unknown');
    expect(storageMock.writeFile).not.toHaveBeenCalled();
  });

  it('fails when the cloud does not return what was written', async () => {
    storageMock.readFile.mockResolvedValue('');

    expect((await saveError()).reason).toBe('not_confirmed');
  });

  it.each([
    ['ERR_QUOTA_EXCEEDED', 'storage_full'],
    ['ERR_NETWORK_ERROR', 'network'],
    ['ERR_AUTHENTICATION_FAILED', 'unavailable'],
    ['ERR_WRITE_ERROR', 'unknown'],
  ])('maps %s to %s', async (code, reason) => {
    storageMock.writeFile.mockRejectedValue(
      new CloudStorageError('', code as CloudStorageErrorCode),
    );

    expect((await saveError()).reason).toBe(reason);
  });

  it.each([
    ['ios', 'unavailable'],
    ['android', 'unknown'],
  ])('maps a missing cloud directory on %s to %s', async (platform, reason) => {
    const os = Platform.OS;
    Platform.OS = platform as typeof Platform.OS;
    storageMock.exists.mockRejectedValue(
      new CloudStorageError(
        '',
        'ERR_DIRECTORY_NOT_FOUND' as CloudStorageErrorCode,
      ),
    );

    try {
      expect((await saveError()).reason).toBe(reason);
    } finally {
      Platform.OS = os;
    }
  });
});

describe('deleteCloudBackupFiles', () => {
  const deleteStorageMock = Object.assign(storageMock, {
    readdir: jest.fn(),
    unlink: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    deleteStorageMock.exists.mockResolvedValue(true);
    deleteStorageMock.unlink.mockResolvedValue(undefined);
  });

  it('removes every backup of the key and nothing else', async () => {
    const keyOld = getCloudBackupFileName(100, 'aaaa1111');
    const keyNew = getCloudBackupFileName(300, 'aaaa1111');
    const otherKey = getCloudBackupFileName(200, 'bbbb2222');
    deleteStorageMock.readdir.mockResolvedValue([
      keyOld,
      otherKey,
      keyNew,
      'notes.txt',
    ]);

    await expect(deleteCloudBackupFiles('aaaa1111')).resolves.toBe(2);

    expect(deleteStorageMock.unlink.mock.calls.map(([path]) => path)).toEqual([
      `BitPay Backups/${keyOld}`,
      `BitPay Backups/${keyNew}`,
    ]);
  });

  it('leaves the keyshare backups of the key alone', async () => {
    const phrase = getCloudBackupFileName(100, 'aaaa1111');
    const keyshare = getCloudKeyshareFileName(200, 'aaaa1111');
    deleteStorageMock.readdir.mockResolvedValue([phrase, keyshare]);

    await expect(deleteCloudBackupFiles('aaaa1111')).resolves.toBe(1);

    expect(deleteStorageMock.unlink.mock.calls.map(([path]) => path)).toEqual([
      `BitPay Backups/${phrase}`,
    ]);
  });

  it('keeps the backup it is told to keep', async () => {
    const keyOld = getCloudBackupFileName(100, 'aaaa1111');
    const keyNew = getCloudBackupFileName(300, 'aaaa1111');
    deleteStorageMock.readdir.mockResolvedValue([keyNew, keyOld]);

    await expect(deleteCloudBackupFiles('aaaa1111', keyNew)).resolves.toBe(1);

    expect(deleteStorageMock.unlink.mock.calls.map(([path]) => path)).toEqual([
      `BitPay Backups/${keyOld}`,
    ]);
  });

  it('keeps the newest backup when an older one fails to delete', async () => {
    const keyOld = getCloudBackupFileName(100, 'aaaa1111');
    const keyNew = getCloudBackupFileName(300, 'aaaa1111');
    deleteStorageMock.readdir.mockResolvedValue([keyNew, keyOld]);
    deleteStorageMock.unlink.mockRejectedValueOnce(
      new CloudStorageError('', 'ERR_NETWORK_ERROR' as CloudStorageErrorCode),
    );

    await expect(deleteCloudBackupFiles('aaaa1111')).rejects.toMatchObject({
      reason: 'network',
    });
    expect(deleteStorageMock.unlink).toHaveBeenCalledTimes(1);
    expect(deleteStorageMock.unlink).toHaveBeenCalledWith(
      `BitPay Backups/${keyOld}`,
    );
  });

  it('reports when the key has no backup files', async () => {
    deleteStorageMock.readdir.mockResolvedValue([
      getCloudBackupFileName(200, 'bbbb2222'),
    ]);

    await expect(deleteCloudBackupFiles('aaaa1111')).resolves.toBe(0);
    expect(deleteStorageMock.unlink).not.toHaveBeenCalled();
  });

  it('maps a failed delete to a cloud backup error', async () => {
    deleteStorageMock.readdir.mockResolvedValue([
      getCloudBackupFileName(100, 'aaaa1111'),
    ]);
    deleteStorageMock.unlink.mockRejectedValue(
      new CloudStorageError('', 'ERR_NETWORK_ERROR' as CloudStorageErrorCode),
    );

    await expect(deleteCloudBackupFiles('aaaa1111')).rejects.toMatchObject({
      reason: 'network',
    });
  });
});

describe('connectToCloud', () => {
  const os = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    storageMock.isCloudAvailable.mockResolvedValue(true);
    (GoogleSignin.hasPreviousSignIn as jest.Mock).mockReturnValue(true);
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      type: 'success',
      data: {},
    });
  });

  afterEach(() => {
    Platform.OS = os;
    (GoogleSignin.hasPreviousSignIn as jest.Mock).mockReturnValue(false);
  });

  it('signs out first when another Google account is requested', async () => {
    (GoogleSignin as any).signOut = jest.fn(() => {
      (GoogleSignin.hasPreviousSignIn as jest.Mock).mockReturnValue(false);
      return Promise.resolve(null);
    });

    await connectToCloud({chooseAccount: true});

    expect((GoogleSignin as any).signOut).toHaveBeenCalledTimes(1);
    expect(GoogleSignin.signInSilently).not.toHaveBeenCalled();
    expect(GoogleSignin.signIn).toHaveBeenCalledTimes(1);
  });
});

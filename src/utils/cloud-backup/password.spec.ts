import {
  InvalidCloudBackupError,
  WrongCloudBackupPasswordError,
  encryptCloudBackup,
} from './codec';
import {BwcProvider} from '../../lib/bwc';
import {
  KEYSHARE_PBKDF2_ITERATIONS,
  checkCloudBackupPassword,
  decryptCloudKeyshare,
  decryptNewestCloudBackup,
} from './password';
import {
  CloudBackupError,
  getCloudBackupFileName,
  getCloudKeyshareFileName,
  groupBackupsByKey,
  listCloudBackups,
  readCloudBackupFile,
} from './storage';

jest.mock('./storage', () => ({
  ...jest.requireActual('./storage'),
  listCloudBackups: jest.fn(),
  readCloudBackupFile: jest.fn(),
}));

const password = 'Str0ng!Backup-Pw';
const payload = {
  mnemonic: 'demo fake words not a real phrase never use these for funds',
  keyName: 'My Key',
};

const mockListCloudBackups = listCloudBackups as jest.Mock;
const mockReadCloudBackupFile = readCloudBackupFile as jest.Mock;

const backup = (createdAt: number, keyRef: string, filePassword: string) =>
  encryptCloudBackup(
    {keyId: keyRef, fingerPrint: keyRef, createdAt},
    payload,
    filePassword,
  );

const mockFiles = (files: Record<string, string>) => {
  mockListCloudBackups.mockResolvedValue(groupBackupsByKey(Object.keys(files)));
  mockReadCloudBackupFile.mockImplementation((name: string) =>
    Promise.resolve(files[name]),
  );
};

const keyshareBackup = (
  contents: object,
  filePassword: string,
  iter = KEYSHARE_PBKDF2_ITERATIONS,
) =>
  JSON.stringify(
    BwcProvider.getInstance()
      .getEncryption()
      .encryptWithPassword(JSON.stringify(contents), filePassword, {iter}),
  );

describe('checkCloudBackupPassword', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not download keyshare backups, which have their own password', async () => {
    const phrase = getCloudBackupFileName(100, 'aaaa1111');
    const keyshare = getCloudKeyshareFileName(200, 'aaaa1111');
    mockFiles({
      [phrase]: await backup(100, 'aaaa1111', password),
      [keyshare]: keyshareBackup({isTSS: true}, 'other-pw'),
    });

    expect(await checkCloudBackupPassword(password, 'aaaa1111')).toBe('match');
    expect(mockReadCloudBackupFile).not.toHaveBeenCalledWith(keyshare);
  });

  it('checks the password only against the backups of the same key', async () => {
    const thisKey = getCloudBackupFileName(100, 'aaaa1111');
    const otherKey = getCloudBackupFileName(200, 'bbbb2222');
    mockFiles({
      [thisKey]: await backup(100, 'aaaa1111', password),
      [otherKey]: await backup(200, 'bbbb2222', 'Other!Passw0rd'),
    });

    expect(await checkCloudBackupPassword(password, 'aaaa1111')).toBe('match');
    expect(await checkCloudBackupPassword('Other!Passw0rd', 'aaaa1111')).toBe(
      'wrong',
    );
    expect(mockReadCloudBackupFile).not.toHaveBeenCalledWith(otherKey);
  });

  it('checks the password against the newest backup of the key', async () => {
    const older = getCloudBackupFileName(100, 'aaaa1111');
    const newest = getCloudBackupFileName(200, 'aaaa1111');
    mockFiles({
      [older]: await backup(100, 'aaaa1111', 'Old!Passw0rd'),
      [newest]: await backup(200, 'aaaa1111', password),
    });

    expect(await checkCloudBackupPassword(password, 'aaaa1111')).toBe('match');
    expect(await checkCloudBackupPassword('Old!Passw0rd', 'aaaa1111')).toBe(
      'wrong',
    );
    expect(mockReadCloudBackupFile).toHaveBeenLastCalledWith(newest);
  });

  it('skips damaged files and checks the next newest one', async () => {
    const valid = getCloudBackupFileName(100, 'aaaa1111');
    const damaged = getCloudBackupFileName(200, 'aaaa1111');
    mockFiles({
      [valid]: await backup(100, 'aaaa1111', password),
      [damaged]: 'not a backup',
    });

    expect(await checkCloudBackupPassword(password, 'aaaa1111')).toBe('match');
  });

  it('reports none when the key has no backup, even if other keys do', async () => {
    const otherKey = getCloudBackupFileName(200, 'bbbb2222');
    mockFiles({[otherKey]: await backup(200, 'bbbb2222', password)});

    expect(await checkCloudBackupPassword(password, 'aaaa1111')).toBe('none');
  });

  it('passes cloud errors through', async () => {
    const name = getCloudBackupFileName(100, 'aaaa1111');
    mockListCloudBackups.mockResolvedValue(groupBackupsByKey([name]));
    mockReadCloudBackupFile.mockRejectedValue(new CloudBackupError('network'));

    await expect(
      checkCloudBackupPassword(password, 'aaaa1111'),
    ).rejects.toEqual(new CloudBackupError('network'));
  });
});

describe('decryptNewestCloudBackup', () => {
  beforeEach(() => jest.clearAllMocks());

  const keyFiles = async (files: Record<string, string>) => {
    mockFiles(files);
    return (await listCloudBackups())[0].files;
  };

  it('restores the newest backup that decrypts, past a damaged one', async () => {
    const older = getCloudBackupFileName(100, 'aaaa1111');
    const newest = getCloudBackupFileName(200, 'aaaa1111');
    const text = await backup(100, 'aaaa1111', password);
    const valid = JSON.parse(text);
    const damaged = JSON.stringify({
      ...valid,
      createdAt: 200,
      ciphertext: Buffer.from('damaged').toString('base64'),
    });
    const files = await keyFiles({[older]: text, [newest]: damaged});

    const restored = await decryptNewestCloudBackup(files, password);

    expect(restored?.text).toBe(text);
    expect(restored?.payload).toEqual(payload);
  });

  it('reports a wrong password only when no backup decrypts', async () => {
    const files = await keyFiles({
      [getCloudBackupFileName(100, 'aaaa1111')]: await backup(
        100,
        'aaaa1111',
        password,
      ),
    });

    await expect(
      decryptNewestCloudBackup(files, 'Wr0ng!Password'),
    ).rejects.toBeInstanceOf(WrongCloudBackupPasswordError);
  });

  it('returns nothing when every file is damaged', async () => {
    const files = await keyFiles({
      [getCloudBackupFileName(100, 'aaaa1111')]: 'not a backup',
    });

    expect(await decryptNewestCloudBackup(files, password)).toBeUndefined();
  });
});

describe('decryptCloudKeyshare', () => {
  beforeEach(() => jest.clearAllMocks());

  const keyshareFiles = async (files: Record<string, string>) => {
    mockFiles(files);
    return (await listCloudBackups())[0].files;
  };

  it('returns the keyshare backup the password opens', async () => {
    const name = getCloudKeyshareFileName(100, 'aaaa1111');
    const contents = {isTSS: true, version: 1};
    const files = await keyshareFiles({
      [name]: keyshareBackup(contents, 'keyshare-pw'),
    });

    expect(
      JSON.parse(await decryptCloudKeyshare(files, 'keyshare-pw')),
    ).toEqual(contents);
  });

  it('rejects a password that opens no keyshare backup', async () => {
    const name = getCloudKeyshareFileName(100, 'aaaa1111');
    const files = await keyshareFiles({
      [name]: keyshareBackup({isTSS: true}, 'keyshare-pw'),
    });

    await expect(decryptCloudKeyshare(files, 'wrong-pw')).rejects.toThrow(
      WrongCloudBackupPasswordError,
    );
  });

  it('falls back to an older keyshare backup the password opens', async () => {
    const older = getCloudKeyshareFileName(100, 'aaaa1111');
    const newest = getCloudKeyshareFileName(200, 'aaaa1111');
    const contents = {isTSS: true, version: 1};
    const files = await keyshareFiles({
      [older]: keyshareBackup(contents, 'keyshare-pw'),
      [newest]: keyshareBackup({isTSS: true, version: 2}, 'other-pw'),
    });

    expect(
      JSON.parse(await decryptCloudKeyshare(files, 'keyshare-pw')),
    ).toEqual(contents);
  });

  const withoutSalt = () => {
    const envelope = JSON.parse(keyshareBackup({isTSS: true}, 'keyshare-pw'));
    delete envelope.salt;
    return JSON.stringify(envelope);
  };

  it.each([
    ['is not JSON', () => 'not json'],
    ['has no ciphertext', () => JSON.stringify({iv: 'x'})],
    ['has no salt', withoutSalt],
    [
      'asks for another iteration count',
      () => keyshareBackup({isTSS: true}, 'keyshare-pw', 1),
    ],
  ])(
    'reports a keyshare file that %s as damaged, not as a wrong password',
    async (_case, text) => {
      const name = getCloudKeyshareFileName(100, 'aaaa1111');
      const files = await keyshareFiles({[name]: text()});

      await expect(decryptCloudKeyshare(files, 'keyshare-pw')).rejects.toThrow(
        new InvalidCloudBackupError('damaged'),
      );
    },
  );

  it('falls back to an older keyshare backup when the newest is damaged', async () => {
    const older = getCloudKeyshareFileName(100, 'aaaa1111');
    const newest = getCloudKeyshareFileName(200, 'aaaa1111');
    const contents = {isTSS: true, version: 1};
    const files = await keyshareFiles({
      [older]: keyshareBackup(contents, 'keyshare-pw'),
      [newest]: 'not json',
    });

    expect(
      JSON.parse(await decryptCloudKeyshare(files, 'keyshare-pw')),
    ).toEqual(contents);
  });

  it('rejects a file that is not a keyshare backup as damaged', async () => {
    const name = getCloudKeyshareFileName(100, 'aaaa1111');
    const files = await keyshareFiles({
      [name]: keyshareBackup({mnemonic: 'x'}, 'keyshare-pw'),
    });

    await expect(decryptCloudKeyshare(files, 'keyshare-pw')).rejects.toThrow(
      new InvalidCloudBackupError('damaged'),
    );
  });
});

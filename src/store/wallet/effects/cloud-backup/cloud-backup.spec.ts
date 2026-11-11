import configureTestStore from '@test/store';
import {BwcProvider} from '../../../../lib/bwc';
import {decryptCloudBackup} from '../../../../utils/cloud-backup/codec';
import {
  CloudBackupError,
  deleteCloudBackupFiles,
  saveCloudBackupFile,
} from '../../../../utils/cloud-backup/storage';
import {startImportMnemonic} from '../import/import';
import {
  isKeyPassphrase,
  isMissingWalletsError,
  startCloudBackup,
  startRestoreRecoveryPhrase,
} from './cloud-backup';

jest.mock('../import/import', () => ({
  normalizeMnemonic: jest.requireActual('../import/import').normalizeMnemonic,
  startImportMnemonic: jest.fn(),
}));

jest.mock('../../../../utils/cloud-backup/storage', () => ({
  ...jest.requireActual('../../../../utils/cloud-backup/storage'),
  connectToCloud: jest.fn(() => Promise.resolve()),
  saveCloudBackupFile: jest.fn(),
  deleteCloudBackupFiles: jest.fn(),
}));

const password = 'Str0ng!Backup-Pw';
const words =
  'demo fake words not a real phrase never use these for funds'.split(' ');
const key = {
  id: 'key-1',
  keyName: 'My Key',
  backupComplete: false,
  properties: {fingerPrint: 'abcd1234'},
  wallets: [],
} as any;

const mockSaveCloudBackupFile = saveCloudBackupFile as jest.Mock;
const mockDeleteCloudBackupFiles = deleteCloudBackupFiles as jest.Mock;

const waitForSave = async () => {
  while (!mockSaveCloudBackupFile.mock.calls.length) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

describe('startCloudBackup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks the key backed up only after the cloud confirms the file', async () => {
    let confirmSave!: () => void;
    mockSaveCloudBackupFile.mockReturnValue(
      new Promise<void>(resolve => (confirmSave = resolve)),
    );
    const store = configureTestStore({WALLET: {keys: {[key.id]: key}}});

    const backup = store.dispatch(startCloudBackup({key, words, password}));
    await waitForSave();

    expect(store.getState().WALLET.keys[key.id].backupComplete).toBe(false);

    confirmSave();
    await backup;

    const [name, contents] = mockSaveCloudBackupFile.mock.calls[0];
    const savedKey = store.getState().WALLET.keys[key.id];
    expect(savedKey.backupComplete).toBe(true);
    expect(name).toMatch(/^BitPay-Backup-\d+-[0-9a-f]{16}\.json$/);
    expect(name).toContain(`-${savedKey.cloudBackupTimestamp}-`);
    expect(await decryptCloudBackup(contents, password)).toEqual({
      mnemonic: words.join(' '),
      keyName: 'My Key',
    });
  });

  it.each([
    ['removes', true],
    ['keeps', false],
  ])(
    '%s the older backups of the key once the new one is saved, when revoking: %s',
    async (_action, revokeOlder) => {
      mockSaveCloudBackupFile.mockResolvedValue(undefined);
      mockDeleteCloudBackupFiles.mockResolvedValue(1);
      const store = configureTestStore({WALLET: {keys: {[key.id]: key}}});

      await store.dispatch(
        startCloudBackup({key, words, password, revokeOlder}),
      );

      const [name] = mockSaveCloudBackupFile.mock.calls[0];
      expect(mockDeleteCloudBackupFiles.mock.calls).toEqual(
        revokeOlder ? [['abcd1234', name]] : [],
      );
    },
  );

  it('does not remove older backups when the new one fails to save', async () => {
    mockSaveCloudBackupFile.mockRejectedValue(new CloudBackupError('network'));
    const store = configureTestStore({WALLET: {keys: {[key.id]: key}}});

    await expect(
      store.dispatch(
        startCloudBackup({key, words, password, revokeOlder: true}),
      ),
    ).rejects.toMatchObject({reason: 'network'});

    expect(mockDeleteCloudBackupFiles).not.toHaveBeenCalled();
  });

  it('marks a key with a recovery phrase password without saving the password', async () => {
    mockSaveCloudBackupFile.mockResolvedValue(undefined);
    const passphraseKey = {
      ...key,
      properties: {...key.properties, mnemonicHasPassphrase: true},
    };
    const store = configureTestStore({
      WALLET: {keys: {[passphraseKey.id]: passphraseKey}},
    });

    await store.dispatch(
      startCloudBackup({key: passphraseKey, words, password}),
    );

    const [, contents] = mockSaveCloudBackupFile.mock.calls[0];
    expect(await decryptCloudBackup(contents, password)).toEqual({
      mnemonic: words.join(' '),
      keyName: 'My Key',
      mnemonicHasPassphrase: true,
    });
  });

  it('leaves the key not backed up when the cloud save fails', async () => {
    mockSaveCloudBackupFile.mockRejectedValue(new CloudBackupError('network'));
    const store = configureTestStore({WALLET: {keys: {[key.id]: key}}});

    await expect(
      store.dispatch(startCloudBackup({key, words, password})),
    ).rejects.toMatchObject({reason: 'network'});

    expect(store.getState().WALLET.keys[key.id].backupComplete).toBe(false);
    expect(store.getState().WALLET.keys[key.id].cloudBackupTimestamp).toBe(
      undefined,
    );
  });
});

describe('startRestoreRecoveryPhrase', () => {
  const mnemonic = words.join(' ');
  const mockStartImportMnemonic = startImportMnemonic as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  it('imports the phrase with every wallet the backup could have had', async () => {
    mockStartImportMnemonic.mockReturnValue(() => Promise.resolve(key));
    const store = configureTestStore({});

    await expect(
      store.dispatch(startRestoreRecoveryPhrase(mnemonic)),
    ).resolves.toBe(key);

    expect(mockStartImportMnemonic).toHaveBeenCalledWith(
      {words: mnemonic},
      {includeTestnetWallets: true, includeLegacyWallets: true},
    );
  });

  it('imports with the recovery phrase password when there is one', async () => {
    mockStartImportMnemonic.mockReturnValue(() => Promise.resolve(key));
    const store = configureTestStore({});

    await store.dispatch(startRestoreRecoveryPhrase(mnemonic, 'phrase-pw'));

    expect(mockStartImportMnemonic).toHaveBeenCalledWith(
      {words: mnemonic},
      {
        includeTestnetWallets: true,
        includeLegacyWallets: true,
        passphrase: 'phrase-pw',
      },
    );
  });

  it('passes on the error when the import finds no wallets, without creating a key', async () => {
    const missingWallets = new Error('WALLET_DOES_NOT_EXIST');
    mockStartImportMnemonic.mockReturnValue(() =>
      Promise.reject(missingWallets),
    );
    const store = configureTestStore({});

    await expect(
      store.dispatch(startRestoreRecoveryPhrase(mnemonic)),
    ).rejects.toBe(missingWallets);

    expect(Object.keys(store.getState().WALLET.keys)).toEqual([]);
  });
});

describe('isKeyPassphrase', () => {
  const testPhrase =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const fingerPrint = BwcProvider.getInstance().createKey({
    seedType: 'mnemonic',
    seedData: testPhrase,
    passphrase: 'phrase-pw',
  }).fingerPrint;

  it.each([
    ['the password the key was made with', 'phrase-pw', true],
    ['another password', 'other-pw', false],
  ])('accepts %s: %s', (_label, passphrase, matches) => {
    expect(isKeyPassphrase(testPhrase, passphrase, fingerPrint)).toBe(matches);
  });
});

describe('isMissingWalletsError', () => {
  it.each([
    [
      'the BitPay wallet service',
      true,
      () => new (BwcProvider.getInstance().getErrors().WALLET_DOES_NOT_EXIST)(),
    ],
    ['the import', true, () => new Error('WALLET_DOES_NOT_EXIST')],
    ['another failure', false, () => new Error('network down')],
  ])(
    'treats an error from %s as missing wallets: %s',
    (_source, missing, error) => {
      expect(isMissingWalletsError(error())).toBe(missing);
    },
  );
});

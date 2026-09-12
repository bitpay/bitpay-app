import {selectNewEncryptionKey, storeEncryptionKey} from './encryption-key';

describe('selectNewEncryptionKey', () => {
  const getLegacyKey = jest.fn(() => 'legacy-key');
  const getRandomKey = jest.fn(() => 'random-key');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the legacy-compatible key when the persisted root exists', async () => {
    const hasBackup = jest.fn<Promise<boolean>, []>();

    await expect(
      selectNewEncryptionKey({
        hasPersistedRoot: () => true,
        hasBackup,
        getLegacyKey,
        getRandomKey,
      }),
    ).resolves.toEqual({key: 'legacy-key', legacyCompatible: true});

    expect(hasBackup).not.toHaveBeenCalled();
    expect(getLegacyKey).toHaveBeenCalledTimes(1);
    expect(getRandomKey).not.toHaveBeenCalled();
  });

  it('uses the legacy-compatible key when only the backup exists', async () => {
    await expect(
      selectNewEncryptionKey({
        hasPersistedRoot: () => false,
        hasBackup: async () => true,
        getLegacyKey,
        getRandomKey,
      }),
    ).resolves.toEqual({key: 'legacy-key', legacyCompatible: true});

    expect(getLegacyKey).toHaveBeenCalledTimes(1);
    expect(getRandomKey).not.toHaveBeenCalled();
  });

  it('uses a random key only when the root and backup are both absent', async () => {
    await expect(
      selectNewEncryptionKey({
        hasPersistedRoot: () => false,
        hasBackup: async () => false,
        getLegacyKey,
        getRandomKey,
      }),
    ).resolves.toEqual({key: 'random-key', legacyCompatible: false});

    expect(getLegacyKey).not.toHaveBeenCalled();
    expect(getRandomKey).toHaveBeenCalledTimes(1);
  });

  it('does not generate a key when checking the persisted root throws', async () => {
    const error = new Error('MMKV contains failed');
    const hasBackup = jest.fn<Promise<boolean>, []>();

    await expect(
      selectNewEncryptionKey({
        hasPersistedRoot: () => {
          throw error;
        },
        hasBackup,
        getLegacyKey,
        getRandomKey,
      }),
    ).rejects.toBe(error);

    expect(hasBackup).not.toHaveBeenCalled();
    expect(getLegacyKey).not.toHaveBeenCalled();
    expect(getRandomKey).not.toHaveBeenCalled();
  });

  it('does not generate a key when checking the backup throws', async () => {
    const error = new Error('backup check failed');

    await expect(
      selectNewEncryptionKey({
        hasPersistedRoot: () => false,
        hasBackup: async () => {
          throw error;
        },
        getLegacyKey,
        getRandomKey,
      }),
    ).rejects.toBe(error);

    expect(getLegacyKey).not.toHaveBeenCalled();
    expect(getRandomKey).not.toHaveBeenCalled();
  });
});

describe('storeEncryptionKey', () => {
  const encryptionKeyId = 'bitpay-app-encryption-key';
  const key = 'generated-key';

  it('resolves after Keychain confirms the write', async () => {
    const setGenericPassword = jest.fn().mockResolvedValue({
      service: encryptionKeyId,
      storage: 'keychain',
    });

    await expect(
      storeEncryptionKey(encryptionKeyId, key, setGenericPassword),
    ).resolves.toBeUndefined();

    expect(setGenericPassword).toHaveBeenCalledWith(encryptionKeyId, key, {
      service: encryptionKeyId,
    });
  });

  it('rejects when Keychain reports that the key was not stored', async () => {
    const setGenericPassword = jest.fn().mockResolvedValue(false);

    await expect(
      storeEncryptionKey(encryptionKeyId, key, setGenericPassword),
    ).rejects.toThrow('Keychain did not store the encryption key');
  });

  it('preserves a Keychain rejection', async () => {
    const error = new Error('Keychain unavailable');
    const setGenericPassword = jest.fn().mockRejectedValue(error);

    await expect(
      storeEncryptionKey(encryptionKeyId, key, setGenericPassword),
    ).rejects.toBe(error);
  });
});

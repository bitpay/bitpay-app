const mockGetGenericPassword = jest.fn();
jest.mock('react-native-keychain', () => ({
  getGenericPassword: (...args: unknown[]) => mockGetGenericPassword(...args),
}));

describe('encryptionKeyPrefetch', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetGenericPassword.mockReset();
  });

  it('starts no read on import of the module itself', () => {
    require('./encryptionKeyPrefetch');

    expect(mockGetGenericPassword).not.toHaveBeenCalled();
  });

  it('starts one Keychain read from the entry and hands it out once', async () => {
    mockGetGenericPassword.mockResolvedValue({password: 'k'});
    require('./startEncryptionKeyPrefetch');
    const prefetch = require('./encryptionKeyPrefetch');

    expect(mockGetGenericPassword).toHaveBeenCalledTimes(1);
    expect(mockGetGenericPassword).toHaveBeenCalledWith({
      service: prefetch.ENCRYPTION_KEY_SERVICE,
    });
    await expect(prefetch.takePrefetchedEncryptionKey()).resolves.toEqual({
      password: 'k',
    });
    expect(prefetch.takePrefetchedEncryptionKey()).toBeUndefined();
  });

  it('reads the entry the vault keeps its key in', () => {
    const {ENCRYPTION_KEY_SERVICE} = require('./encryptionKeyPrefetch');
    const {VAULT_KEY_SERVICE} = jest.requireActual(
      '../store/encryption-key',
    ) as typeof import('../store/encryption-key');

    expect(ENCRYPTION_KEY_SERVICE).toBe(VAULT_KEY_SERVICE);
  });

  it('passes a failed read to the consumer without an unhandled rejection', async () => {
    mockGetGenericPassword.mockRejectedValue(new Error('keystore'));
    require('./startEncryptionKeyPrefetch');
    const prefetch = require('./encryptionKeyPrefetch');

    await expect(prefetch.takePrefetchedEncryptionKey()).rejects.toThrow(
      'keystore',
    );
  });

  it('starts no second read while one is pending', () => {
    mockGetGenericPassword.mockReturnValue(new Promise(() => {}));
    require('./startEncryptionKeyPrefetch');
    const prefetch = require('./encryptionKeyPrefetch');
    prefetch.prefetchEncryptionKey();

    expect(mockGetGenericPassword).toHaveBeenCalledTimes(1);
  });
});

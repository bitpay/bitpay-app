const mockGetGenericPassword = jest.fn();
jest.mock('react-native-keychain', () => ({
  getGenericPassword: (...args: unknown[]) => mockGetGenericPassword(...args),
}));

describe('encryptionKeyPrefetch', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetGenericPassword.mockReset();
  });

  it('starts one Keychain read on import and hands it out once', async () => {
    mockGetGenericPassword.mockResolvedValue({password: 'k'});
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

  it('passes a failed read to the consumer without an unhandled rejection', async () => {
    mockGetGenericPassword.mockRejectedValue(new Error('keystore'));
    const prefetch = require('./encryptionKeyPrefetch');

    await expect(prefetch.takePrefetchedEncryptionKey()).rejects.toThrow(
      'keystore',
    );
  });

  it('starts no second read while one is pending', () => {
    mockGetGenericPassword.mockReturnValue(new Promise(() => {}));
    const prefetch = require('./encryptionKeyPrefetch');
    prefetch.prefetchEncryptionKey();

    expect(mockGetGenericPassword).toHaveBeenCalledTimes(1);
  });
});

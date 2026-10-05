import * as Keychain from 'react-native-keychain';
import {getEncryptionKey} from '.';

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
}));

const getMock = Keychain.getGenericPassword as jest.Mock;
const setMock = Keychain.setGenericPassword as jest.Mock;

describe('getEncryptionKey', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the stored key', async () => {
    getMock.mockResolvedValue({password: 'stored-key'});
    await expect(getEncryptionKey()).resolves.toBe('stored-key');
    expect(setMock).not.toHaveBeenCalled();
  });

  it('does not overwrite the stored key when the Keychain read fails', async () => {
    getMock.mockRejectedValue(new Error('Keystore operation failed'));
    await expect(getEncryptionKey()).rejects.toThrow(
      'Keystore operation failed',
    );
    expect(setMock).not.toHaveBeenCalled();
  });

  it('stores a new key when none exists', async () => {
    getMock.mockResolvedValue(false);
    setMock.mockResolvedValue({});
    const key = await getEncryptionKey();
    expect(setMock).toHaveBeenCalledWith(
      'bitpay-app-encryption-key',
      key,
      expect.objectContaining({service: 'bitpay-app-encryption-key'}),
    );
  });
});

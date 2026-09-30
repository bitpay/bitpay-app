jest.mock('@env', () => ({DISABLE_DEVELOPMENT_LOGGING: 'true'}));
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => {
    const values = new Map();
    return {
      getString: jest.fn(key => values.get(key)),
      getAllKeys: jest.fn(() => [...values.keys()]),
      set: jest.fn((key, value) => values.set(key, value)),
      delete: jest.fn(key => values.delete(key)),
    };
  }),
}));
jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
}));
jest.mock('../constants/config', () => ({
  APP_NETWORK: 'livenet',
  APP_VERSION: 'test',
  BASE_BITPAY_URLS: {livenet: 'https://example.test'},
  BASE_BWS_URL: 'https://example.test',
  BLOCKCHAIN_EXPLORERS: Object.fromEntries(
    ['eth', 'matic', 'arb', 'base', 'op', 'sol'].map(chain => [
      chain,
      {livenet: {}, testnet: {}},
    ]),
  ),
}));
jest.mock('../utils/helper-methods', () => ({
  getErrorString: (error: unknown) => String(error),
}));
jest.mock('../lib/bwc', () => ({
  BwcProvider: {getInstance: () => ({})},
}));
jest.mock('./wallet/utils/wallet', () => ({
  checkPrivateKeyEncrypted: () => false,
}));
jest.mock('./portfolio', () => ({
  clearWalletPortfolioDataWithRuntime: jest.fn(),
}));
jest.mock('../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    addLog: jest.fn(),
  },
}));

import {backupFileExists, backupPersistRoot} from './backup/fs-backup';
import {reduxStorage} from './index';

jest.mock('./backup/fs-backup', () => ({
  backupFileExists: jest.fn(),
  backupPersistRoot: jest.fn(),
  readBackupPersistRoot: jest.fn(),
}));

const flush = () => new Promise(resolve => setImmediate(resolve));

describe('persist:root filesystem backup scheduling', () => {
  it('coalesces writes during an in-flight backup and stops after 3 failures', async () => {
    (backupFileExists as jest.Mock).mockResolvedValue(false);
    let fail: (e: Error) => void = () => {};
    (backupPersistRoot as jest.Mock).mockImplementation(
      () => new Promise((_, reject) => (fail = reject)),
    );

    await reduxStorage.setItem('persist:root', '{"n":1}');
    await reduxStorage.setItem('persist:root', '{"n":2}');
    await reduxStorage.setItem('persist:root', '{"n":3}');
    await flush();
    expect(backupPersistRoot).toHaveBeenCalledTimes(1);

    fail(new Error('ENOENT'));
    await flush();
    // Only the latest pending value is retried
    expect(backupPersistRoot).toHaveBeenCalledTimes(2);
    expect(backupPersistRoot).toHaveBeenLastCalledWith('{"n":3}');

    fail(new Error('ENOENT'));
    await flush();
    await reduxStorage.setItem('persist:root', '{"n":4}');
    await flush();
    fail(new Error('ENOENT'));
    await flush();
    expect(backupPersistRoot).toHaveBeenCalledTimes(3);

    (backupFileExists as jest.Mock).mockClear();
    await reduxStorage.setItem('persist:root', '{"n":5}');
    await flush();
    expect(backupPersistRoot).toHaveBeenCalledTimes(3);
    expect(backupFileExists).not.toHaveBeenCalled();
  });
});

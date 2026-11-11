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

import {
  backupFileExists,
  backupPersistRoot,
  discardRollingBackup,
} from './backup/fs-backup';
import {fsBackupTriggerMiddleware, reduxStorage} from './index';
import {activateVaultStorage} from './vault-storage';
import {WalletActionTypes} from './wallet/wallet.types';

jest.mock('./backup/fs-backup', () => ({
  backupFileExists: jest.fn(),
  backupPersistRoot: jest.fn(),
  discardRollingBackup: jest.fn(),
  readBackupPersistRoot: jest.fn(),
}));

const flush = () => new Promise(resolve => setImmediate(resolve));

const dispatchThroughMiddleware = (type: string) =>
  fsBackupTriggerMiddleware({} as any)((action: any) => action)({type});

const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>(r => (resolve = r));
  return {promise, resolve};
};

describe('persist:root filesystem backup scheduling', () => {
  beforeAll(() => activateVaultStorage());

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

  describe('rolling .bak discard after CLEAR_TSS_SESSION_SECRETS', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      (backupFileExists as jest.Mock).mockResolvedValue(true);
      (backupPersistRoot as jest.Mock).mockResolvedValue(undefined);
      (discardRollingBackup as jest.Mock).mockResolvedValue(true);
      // Leave any earlier failure streak and pending discard behind
      dispatchThroughMiddleware(WalletActionTypes.SUCCESS_CREATE_KEY);
      await reduxStorage.setItem('persist:root', '{"reset":1}');
      await flush();
      jest.clearAllMocks();
    });

    it('discards .bak only after a backup of a write made after the clear', async () => {
      const inFlight = deferred<void>();
      (backupPersistRoot as jest.Mock).mockReturnValueOnce(inFlight.promise);

      dispatchThroughMiddleware(WalletActionTypes.SUCCESS_CREATE_KEY);
      await reduxStorage.setItem('persist:root', '{"partyKey":"x","n":1}');
      await flush();
      // Coalesced behind the in-flight backup, but written before the clear
      await reduxStorage.setItem('persist:root', '{"partyKey":"x","n":2}');
      dispatchThroughMiddleware(WalletActionTypes.CLEAR_TSS_SESSION_SECRETS);
      inFlight.resolve();
      await flush();
      expect(backupPersistRoot).toHaveBeenLastCalledWith(
        '{"partyKey":"x","n":2}',
      );
      expect(discardRollingBackup).not.toHaveBeenCalled();

      await reduxStorage.setItem('persist:root', '{"cleared":1}');
      await flush();
      expect(backupPersistRoot).toHaveBeenLastCalledWith('{"cleared":1}');
      expect(discardRollingBackup).toHaveBeenCalledTimes(1);

      // Done: later writes do not discard again
      dispatchThroughMiddleware(WalletActionTypes.UPDATE_KEY_NAME);
      await reduxStorage.setItem('persist:root', '{"later":1}');
      await flush();
      expect(backupPersistRoot).toHaveBeenLastCalledWith('{"later":1}');
      expect(discardRollingBackup).toHaveBeenCalledTimes(1);
    });

    it('keeps a pending discard for a clear dispatched while one is in progress', async () => {
      const firstDiscard = deferred<boolean>();
      (discardRollingBackup as jest.Mock).mockReturnValueOnce(
        firstDiscard.promise,
      );

      dispatchThroughMiddleware(WalletActionTypes.CLEAR_TSS_SESSION_SECRETS);
      await reduxStorage.setItem('persist:root', '{"clearedA":1}');
      await flush();
      expect(discardRollingBackup).toHaveBeenCalledTimes(1);

      dispatchThroughMiddleware(WalletActionTypes.CLEAR_TSS_SESSION_SECRETS);
      firstDiscard.resolve(true);
      await flush();

      await reduxStorage.setItem('persist:root', '{"clearedB":1}');
      await flush();
      expect(backupPersistRoot).toHaveBeenLastCalledWith('{"clearedB":1}');
      expect(discardRollingBackup).toHaveBeenCalledTimes(2);
    });

    it('retries the discard on the next write when it fails', async () => {
      (discardRollingBackup as jest.Mock).mockResolvedValueOnce(false);

      dispatchThroughMiddleware(WalletActionTypes.CLEAR_TSS_SESSION_SECRETS);
      await reduxStorage.setItem('persist:root', '{"cleared":1}');
      await flush();
      await reduxStorage.setItem('persist:root', '{"cleared":2}');
      await flush();

      expect(backupPersistRoot).toHaveBeenCalledTimes(2);
      expect(discardRollingBackup).toHaveBeenCalledTimes(2);
    });
  });
});

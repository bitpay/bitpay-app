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

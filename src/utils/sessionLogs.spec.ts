const mockMmkvStore = new Map<string, boolean>();
const mockSet = jest.fn((key: string, value: boolean) => {
  mockMmkvStore.set(key, value);
});
const mockDelete = jest.fn((key: string) => {
  mockMmkvStore.delete(key);
});
const mockExists = jest.fn();
const mockUnlink = jest.fn();
const mockWriteFile = jest.fn();

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getBoolean: jest.fn((key: string) => mockMmkvStore.get(key)),
    set: mockSet,
    delete: mockDelete,
  })),
}));

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    TemporaryDirectoryPath: '/temporary',
    LibraryDirectoryPath: '/library',
    exists: mockExists,
    unlink: mockUnlink,
    writeFile: mockWriteFile,
  },
}));

jest.mock('../constants/config', () => ({
  APP_NAME_UPPERCASE: 'BitPay',
}));

describe('sessionLogs', () => {
  const originalDev = global.__DEV__;

  afterEach(() => {
    global.__DEV__ = originalDev;
    mockMmkvStore.clear();
    mockSet.mockClear();
    mockDelete.mockClear();
    mockExists.mockReset();
    mockExists.mockResolvedValue(false);
    mockUnlink.mockReset();
    mockUnlink.mockResolvedValue(undefined);
    mockWriteFile.mockReset();
    mockWriteFile.mockResolvedValue(undefined);
  });

  it('keeps session logs enabled in DEV regardless of the production flag', () => {
    global.__DEV__ = true;

    const {isSessionLogsEnabled} = require('./sessionLogs');

    expect(isSessionLogsEnabled()).toBe(true);
  });

  it('disables session logs in production by default', () => {
    global.__DEV__ = false;

    const {isSessionLogsEnabled} = require('./sessionLogs');

    expect(isSessionLogsEnabled()).toBe(false);
  });

  it('enables session logs in production when the easter egg flag is on', () => {
    global.__DEV__ = false;

    const {
      SESSION_LOGS_PROD_ENABLED_STORAGE_KEY,
      isSessionLogsEnabled,
      setSessionLogsProdEnabled,
    } = require('./sessionLogs');

    setSessionLogsProdEnabled(true);

    expect(mockSet).toHaveBeenCalledWith(
      SESSION_LOGS_PROD_ENABLED_STORAGE_KEY,
      true,
    );
    expect(isSessionLogsEnabled()).toBe(true);
  });

  it('disables session logs in production when the easter egg flag is turned off', () => {
    global.__DEV__ = false;

    const {
      getSessionLogsProdEnabled,
      isSessionLogsEnabled,
      setSessionLogsProdEnabled,
    } = require('./sessionLogs');

    setSessionLogsProdEnabled(true);
    setSessionLogsProdEnabled(false);

    expect(getSessionLogsProdEnabled()).toBe(false);
    expect(isSessionLogsEnabled()).toBe(false);
  });

  it('clears persisted logs and legacy exported log artifacts', async () => {
    global.__DEV__ = false;
    mockMmkvStore.set('persist:logs', true);
    mockExists.mockResolvedValue(true);

    const {
      clearStoredSessionLogs,
      PERSISTED_SESSION_LOGS_STORAGE_KEY,
    } = require('./sessionLogs');

    await expect(clearStoredSessionLogs()).resolves.toBe(true);

    expect(mockDelete).toHaveBeenCalledWith(PERSISTED_SESSION_LOGS_STORAGE_KEY);
    expect(mockUnlink).toHaveBeenCalledWith('/temporary/BitPay-logs.txt');
    expect(mockUnlink).toHaveBeenCalledWith('/temporary/BitPay-logs');
    expect(mockUnlink).toHaveBeenCalledWith('/library/App-logs.txt');
    expect(mockUnlink).toHaveBeenCalledWith('/library/App-logs');
    expect(mockSet).toHaveBeenCalledWith('sessionLogsCleanupDone', true);
  });

  it('does not mark cleanup complete when persisted logs cannot be removed', async () => {
    mockDelete.mockImplementationOnce(() => {
      throw new Error('MMKV delete failed');
    });

    const {
      clearStoredSessionLogs,
      SESSION_LOGS_CLEANUP_DONE_STORAGE_KEY,
    } = require('./sessionLogs');

    await expect(clearStoredSessionLogs()).resolves.toBe(false);

    expect(mockSet).not.toHaveBeenCalledWith(
      SESSION_LOGS_CLEANUP_DONE_STORAGE_KEY,
      true,
    );
  });

  it('does not mark cleanup complete when a log artifact cannot be removed', async () => {
    mockExists.mockResolvedValue(true);
    mockUnlink.mockRejectedValueOnce(new Error('unlink failed'));

    const {
      clearStoredSessionLogs,
      SESSION_LOGS_CLEANUP_DONE_STORAGE_KEY,
    } = require('./sessionLogs');

    await expect(clearStoredSessionLogs()).resolves.toBe(false);

    expect(mockSet).not.toHaveBeenCalledWith(
      SESSION_LOGS_CLEANUP_DONE_STORAGE_KEY,
      true,
    );
  });

  it('automatically cleans old logs in production when session logs are disabled', async () => {
    global.__DEV__ = false;

    const {cleanupDisabledSessionLogs} = require('./sessionLogs');

    await cleanupDisabledSessionLogs();

    expect(mockDelete).toHaveBeenCalledWith('persist:logs');
  });

  it('keeps stored logs when session logs are enabled', async () => {
    global.__DEV__ = false;

    const {
      cleanupDisabledSessionLogs,
      setSessionLogsProdEnabled,
      SESSION_LOGS_CLEANUP_DONE_STORAGE_KEY,
    } = require('./sessionLogs');

    setSessionLogsProdEnabled(true);
    await cleanupDisabledSessionLogs();

    expect(mockDelete).toHaveBeenCalledWith(
      SESSION_LOGS_CLEANUP_DONE_STORAGE_KEY,
    );
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it('removes a shared session log file after it is used', async () => {
    mockExists.mockResolvedValue(true);
    const useFile = jest.fn().mockResolvedValue('shared');
    const {withTemporarySessionLogFile} = require('./sessionLogs');

    await expect(
      withTemporarySessionLogFile(
        '/temporary',
        'BitPay-logs',
        'sensitive log data',
        useFile,
      ),
    ).resolves.toBe('shared');

    expect(mockWriteFile).toHaveBeenCalledWith(
      '/temporary/BitPay-logs.txt',
      'sensitive log data',
      'utf8',
    );
    expect(useFile).toHaveBeenCalledWith('/temporary/BitPay-logs.txt');
    expect(mockUnlink).toHaveBeenCalledWith('/temporary/BitPay-logs.txt');
  });

  it('removes a shared session log file when sharing fails', async () => {
    mockExists.mockResolvedValue(true);
    const shareError = new Error('share failed');
    const useFile = jest.fn().mockRejectedValue(shareError);
    const {withTemporarySessionLogFile} = require('./sessionLogs');

    await expect(
      withTemporarySessionLogFile(
        '/temporary',
        'BitPay-logs',
        'sensitive log data',
        useFile,
      ),
    ).rejects.toThrow('share failed');

    expect(mockUnlink).toHaveBeenCalledWith('/temporary/BitPay-logs.txt');
  });

  it('does not fail sharing when a shared session log file cannot be removed', async () => {
    mockExists.mockResolvedValue(true);
    mockUnlink.mockRejectedValue(new Error('unlink failed'));
    const consumeFile = jest.fn().mockResolvedValue('shared');
    const {withTemporarySessionLogFile} = require('./sessionLogs');

    await expect(
      withTemporarySessionLogFile(
        '/temporary',
        'BitPay-logs',
        'sensitive log data',
        consumeFile,
      ),
    ).resolves.toBe('shared');

    expect(mockUnlink).toHaveBeenCalledWith('/temporary/BitPay-logs.txt');
  });
});

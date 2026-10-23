jest.mock('react-native-mmkv', () => {
  const stores = new Map<string, Map<string, any>>();
  const data = (id: string) => {
    if (!stores.has(id)) stores.set(id, new Map());
    return stores.get(id)!;
  };
  return {
    data,
    MMKV: jest.fn((options?: {id?: string}) => {
      const values = data(options?.id ?? 'mmkv.default');
      return {
        getString: jest.fn(key => values.get(key)),
        getBoolean: jest.fn(key => values.get(key)),
        getAllKeys: jest.fn(() => [...values.keys()]),
        set: jest.fn((key, value) => values.set(key, value)),
        delete: jest.fn(key => values.delete(key)),
      };
    }),
  };
});
jest.mock('@env', () => ({DISABLE_DEVELOPMENT_LOGGING: 'true'}));

const originalDev = (global as any).__DEV__;
beforeEach(() => {
  jest.resetModules();
  (global as any).__DEV__ = false;
});
afterEach(() => {
  (global as any).__DEV__ = originalDev;
  jest.restoreAllMocks();
});

it('early LogManager settings read opens only the stable dedicated log instance', () => {
  const native = require('react-native-mmkv');
  const {logManager} = require('../managers/LogManager');
  logManager.info('synthetic early startup log');
  const logs = require('./sessionLogs');
  expect(logs.isSessionLogsEnabled()).toBe(false);
  expect(native.MMKV.mock.calls).toEqual([[{id: 'bitpay.session-logs.v1'}]]);
  logs.setSessionLogsProdEnabled(true);
  expect(logs.getSessionLogsProdEnabled()).toBe(true);
  expect(
    new native.MMKV({id: 'bitpay.session-logs.v1'}).getBoolean(
      logs.SESSION_LOGS_PROD_ENABLED_STORAGE_KEY,
    ),
  ).toBe(true);
  expect(native.data('mmkv.default').size).toBe(0);
  expect(native.data('bitpay.wallet.v2').size).toBe(0);
});

it('buffers preparation logs then appends, prunes and clears in the same dedicated store', async () => {
  const native = require('react-native-mmkv');
  const old = native.data('mmkv.default');
  old.set('persist:root', 'legacy wallet sentinel');
  old.set('persist:logs', 'legacy logs sentinel');
  const modern = native.data('bitpay.wallet.v2');
  modern.set('persist:root', 'modern wallet sentinel');
  const logs = require('./sessionLogs');
  logs.setSessionLogsProdEnabled(true);
  const init = require('../store/log/initLogs');
  const vault = require('../store/vault-storage');
  const {logReducer} = require('../store/log/log.reducer');
  const {LogActionTypes} = require('../store/log/log.types');
  const entry = {
    timestamp: new Date().toISOString(),
    level: 2,
    message: 'synthetic preparation log',
  };
  init.appendPersistedLog(entry);
  const dispatch = jest.fn(action => logReducer(undefined, action));
  init.drainAndDispatch(dispatch);
  expect(dispatch).not.toHaveBeenCalled();
  expect(logs.sessionLogsStorage.getString('persist:logs')).toBeUndefined();
  vault.activateVaultStorage();
  init.drainAndDispatch(dispatch);
  expect(JSON.parse(logs.sessionLogsStorage.getString('persist:logs'))).toEqual(
    [entry],
  );
  const next = {...entry, message: 'synthetic reducer log'};
  logReducer(undefined, {
    type: LogActionTypes.ADD_PERSISTED_LOG,
    payload: next,
  });
  const stale = {...entry, timestamp: '2000-01-01T00:00:00Z'};
  logs.sessionLogsStorage.set(
    'persist:logs',
    JSON.stringify([stale, entry, next]),
  );
  logReducer(undefined, {type: LogActionTypes.CLEAR_LOGS});
  // Same exported reader used by SessionLog.tsx, and a second native wrapper
  // for that id sees the same data rather than a constructor-local test map.
  expect(
    JSON.parse(
      new native.MMKV({id: 'bitpay.session-logs.v1'}).getString('persist:logs'),
    ),
  ).toEqual([entry, next]);
  expect(logs.getSessionLogsProdEnabled()).toBe(true);
  const fs = require('react-native-fs');
  fs.exists.mockResolvedValue(false);
  await expect(logs.clearStoredSessionLogs()).resolves.toBe(true);
  expect(logs.sessionLogsStorage.getString('persist:logs')).toBeUndefined();
  expect(logs.hasSessionLogsCleanupRun()).toBe(true);
  expect(logs.getSessionLogsProdEnabled()).toBe(true);
  await logs.cleanupDisabledSessionLogs();
  expect(logs.hasSessionLogsCleanupRun()).toBe(false);
  logs.setSessionLogsProdEnabled(false);
  await logs.cleanupDisabledSessionLogs();
  expect(logs.hasSessionLogsCleanupRun()).toBe(true);
  expect(logs.isSessionLogsEnabled()).toBe(false);
  expect([...old.entries()]).toEqual([
    ['persist:root', 'legacy wallet sentinel'],
    ['persist:logs', 'legacy logs sentinel'],
  ]);
  expect([...modern.entries()]).toEqual([
    ['persist:root', 'modern wallet sentinel'],
  ]);
  expect(
    native.MMKV.mock.calls.every(
      ([options]: any[]) =>
        options?.id !== undefined && options.id !== 'mmkv.default',
    ),
  ).toBe(true);
});

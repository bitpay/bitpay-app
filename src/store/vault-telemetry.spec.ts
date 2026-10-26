import type {TransferRecord} from './vault-transfer';
import type {AppState} from './app/app.reducer';

const paths = {
  data: '/mmkv/mmkv.default',
  crc: '/mmkv/mmkv.default.crc',
  main: '/cache/bitpay/redux/persist-root.json',
  bak: '/cache/bitpay/redux/persist-root.json.bak',
  database: '/app/files/../databases/RKStorage',
};
const record = (
  root: TransferRecord['copies']['root'] = 'mmkv',
  backups = 0,
): TransferRecord => ({
  version: 3,
  layout: 'bitpay.wallet.v2',
  owned: true,
  phase: 'active',
  copies: {
    root,
    main: backups > 0 ? 'main' : null,
    bak: backups > 1 ? 'bak' : null,
  },
  release: {
    data: false,
    crc: false,
    async: false,
    main: false,
    bak: false,
    temp: true,
  },
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return {promise, resolve};
};

const model = async (platform: 'ios' | 'android' = 'ios', active = true) => {
  jest.resetModules();
  const nativeContext = {
    getBaseDirectory: jest.fn(() => '/mmkv'),
    getAppGroupDirectory: jest.fn(() => undefined),
  };
  const rn = {
    Platform: {OS: platform, select: (options: any) => options[platform]},
    TurboModuleRegistry: {getEnforcing: jest.fn(() => nativeContext)},
  };
  jest.doMock('react-native', () => rn);
  jest.doMock('react-native-keychain', () => ({}));
  jest.doMock('react-native-device-info', () =>
    require('react-native-device-info/jest/react-native-device-info-mock'),
  );
  const controlValues = new Map<string, unknown>([
    ['transfer', JSON.stringify(record())],
  ]);
  const control = {
    getString: jest.fn((key: string) => {
      const value = controlValues.get(key);
      return typeof value === 'string' ? value : undefined;
    }),
    contains: jest.fn((key: string) => controlValues.has(key)),
    getAllKeys: jest.fn(() => [...controlValues.keys()]),
    set: jest.fn(),
    delete: jest.fn(),
  };
  const MMKV = jest.fn(() => control);
  jest.doMock('react-native-mmkv', () => ({MMKV}));
  const files = new Map<string, boolean | Error>();
  const fs = {
    CachesDirectoryPath: '/cache',
    DocumentDirectoryPath: '/app/files',
    exists: jest.fn(async (path: string) => {
      const value = files.get(path);
      if (value instanceof Error) throw value;
      return value ?? false;
    }),
    stat: jest.fn(async () => ({size: 0})),
    readFile: jest.fn(),
    read: jest.fn(),
    hash: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
  };
  jest.doMock('react-native-fs', () => fs);
  const asyncStorage = {
    getAllKeys: jest.fn(async (): Promise<string[]> => []),
    getItem: jest.fn(),
    multiGet: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  };
  jest.doMock('@react-native-async-storage/async-storage', () => asyncStorage);
  jest.doMock('./log/initLogs', () => ({add: jest.fn()}));
  jest.doMock('./log', () => ({LogActions: {}}));
  const log = {
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };
  jest.doMock('../managers/LogManager', () => ({logManager: log}));
  const config = {
    APP_ANALYTICS_ENABLED: true,
    APP_NETWORK: 'livenet',
    APP_VERSION: 'test',
    BASE_BITPAY_URLS: {livenet: 'https://example.test'},
  };
  jest.doMock('../constants/config', () => config);
  const policy = {LEGACY_RETIREMENT_ENABLED: false};
  jest.doMock('./vault-retirement-policy', () => policy);
  const providers = Array.from({length: 3}, () => ({
    init: jest.fn(),
    track: jest.fn(),
    identify: jest.fn(),
  }));
  jest.doMock('../lib/Braze', () => ({BrazeWrapper: providers[0]}));
  jest.doMock('../lib/Mixpanel', () => ({MixpanelWrapper: providers[1]}));
  jest.doMock('../utils/appsFlyer', () => ({AppsFlyerWrapper: providers[2]}));
  const runtime: typeof import('./vault-runtime') = require('./vault-runtime');
  if (active) require('./vault-storage').activateVaultStorage();
  const {
    appReducer,
    appReduxPersistBlackList,
  }: typeof import('./app/app.reducer') = require('./app/app.reducer');
  const state: {APP: AppState} = {
    APP: appReducer(undefined, {type: '@@INIT'} as any),
  };
  const getState = jest.fn(() => state as any);
  const dispatch: jest.Mock = jest.fn((action: any): any => {
    if (typeof action === 'function')
      return action(dispatch, getState, undefined);
    state.APP = appReducer(state.APP, action);
    return action;
  });
  const {
    Analytics,
  }: typeof import('./analytics/analytics.effects') = require('./analytics/analytics.effects');
  await dispatch(Analytics.initialize());
  dispatch.mockClear();
  const track = jest.spyOn(Analytics, 'track');
  const {
    reportVaultMigrationStatus,
  }: typeof import('./vault-telemetry') = require('./vault-telemetry');
  return {
    runtime,
    state,
    getState,
    dispatch,
    Analytics,
    track,
    providers,
    config,
    policy,
    control,
    controlValues,
    MMKV,
    files,
    fs,
    asyncStorage,
    nativeContext,
    log,
    appReduxPersistBlackList,
    setRecord: (value: TransferRecord) =>
      controlValues.set('transfer', JSON.stringify(value)),
    run: () => reportVaultMigrationStatus()(dispatch, getState, undefined),
    properties: () =>
      providers[0].track.mock.calls[0][1] as Record<string, unknown>,
  };
};

afterEach(() => jest.restoreAllMocks());

it.each([null, 'mmkv', 'async', 'main', 'bak'] as const)(
  'maps root source %s and sends only the literal property allowlist',
  async source => {
    const m = await model();
    m.setRecord(record(source));
    await m.run();
    expect(m.track.mock.calls[0][0]).toBe('Vault Migration Status');
    for (const provider of m.providers) {
      expect(provider.track).toHaveBeenCalledWith(
        'BitPay App - Vault Migration Status',
        m.properties(),
      );
    }
    expect(m.properties()).toEqual({
      phase: 'active',
      rootSource: source ?? 'none',
      backupsConverted: 0,
      legacyMmkv: 'absent',
      legacyAsync: 'absent',
      legacyMainBackup: 'absent',
      legacyBakBackup: 'absent',
      blockedCount: 0,
      retirementEnabled: false,
      platform: 'ios',
      firstOpenedBeforeMmkv: 'unknown',
      legacyAsyncDb: 'n/a',
    });
    expect(Object.keys(m.properties()).sort()).toEqual([
      'backupsConverted',
      'blockedCount',
      'firstOpenedBeforeMmkv',
      'legacyAsync',
      'legacyAsyncDb',
      'legacyBakBackup',
      'legacyMainBackup',
      'legacyMmkv',
      'phase',
      'platform',
      'retirementEnabled',
      'rootSource',
    ]);
  },
);

it.each([0, 1, 2])('counts %i converted backups', async count => {
  const m = await model();
  m.setRecord(record('mmkv', count));
  await m.run();
  expect(m.properties().backupsConverted).toBe(count);
});

it('keeps granted permissions eligible in a retired record without probing those locations', async () => {
  const m = await model();
  const r = record('mmkv', 2);
  r.phase = 'retired';
  r.release = {
    data: true,
    crc: true,
    async: true,
    main: true,
    bak: true,
    temp: true,
  };
  m.setRecord(r);
  await m.run();
  expect(m.properties()).toMatchObject({
    phase: 'retired',
    legacyMmkv: 'eligible',
    legacyAsync: 'eligible',
    legacyMainBackup: 'eligible',
    legacyBakBackup: 'eligible',
    blockedCount: 0,
  });
  expect(m.fs.exists).not.toHaveBeenCalled();
  expect(m.asyncStorage.getAllKeys).not.toHaveBeenCalled();
  expect(m.nativeContext.getBaseDirectory).not.toHaveBeenCalled();
});

const locations = [
  ['mmkv', 'legacyMmkv'],
  ['async', 'legacyAsync'],
  ['main', 'legacyMainBackup'],
  ['bak', 'legacyBakBackup'],
] as const;
describe.each(locations)('%s location', (slot, property) => {
  it.each(['eligible', 'absent', 'blocked', 'unknown'] as const)(
    'reports %s',
    async status => {
      const m = await model();
      const r = record('mmkv', 2);
      if (status === 'eligible') {
        if (slot === 'mmkv') r.release.data = r.release.crc = true;
        else r.release[slot] = true;
      }
      m.setRecord(r);
      if (slot === 'async') {
        if (status === 'blocked')
          m.asyncStorage.getAllKeys.mockResolvedValue(['persist:root']);
        if (status === 'unknown')
          m.asyncStorage.getAllKeys.mockRejectedValue(
            new Error('private detail'),
          );
      } else {
        m.files.set(
          paths[slot === 'mmkv' ? 'data' : slot],
          status === 'unknown'
            ? new Error('private detail')
            : status === 'blocked',
        );
      }
      await m.run();
      expect(m.properties()[property]).toBe(status);
      expect(m.properties().blockedCount).toBe(status === 'blocked' ? 1 : 0);
      if (status === 'eligible') {
        if (slot === 'async')
          expect(m.asyncStorage.getAllKeys).not.toHaveBeenCalled();
        else {
          expect(m.fs.exists).not.toHaveBeenCalledWith(
            paths[slot === 'mmkv' ? 'data' : slot],
          );
          if (slot === 'mmkv')
            expect(m.fs.exists).not.toHaveBeenCalledWith(paths.crc);
        }
      }
    },
  );
});

it.each([
  [true, false, 'blocked'],
  [true, 'error', 'blocked'],
  [false, true, 'blocked'],
  ['error', true, 'blocked'],
  [false, false, 'absent'],
  [false, 'error', 'unknown'],
  ['error', false, 'unknown'],
  ['error', 'error', 'unknown'],
  [true, true, 'blocked'],
] as const)(
  'combines independent MMKV observations %s / %s as %s',
  async (data, crc, expected) => {
    const m = await model();
    m.files.set(
      paths.data,
      data === 'error' ? new Error('data failure') : data,
    );
    m.files.set(paths.crc, crc === 'error' ? new Error('crc failure') : crc);
    await m.run();
    expect(m.properties().legacyMmkv).toBe(expected);
    expect(m.fs.exists).toHaveBeenCalledWith(paths.data);
    expect(m.fs.exists).toHaveBeenCalledWith(paths.crc);
  },
);

it('isolates an MMKV directory failure and counts other blocked locations', async () => {
  const m = await model();
  m.nativeContext.getBaseDirectory.mockImplementation(() => {
    throw new Error('directory failure');
  });
  m.asyncStorage.getAllKeys.mockResolvedValue(['persist:root']);
  m.files.set(paths.main, true);
  m.files.set(paths.bak, true);
  await m.run();
  expect(m.properties()).toMatchObject({
    legacyMmkv: 'unknown',
    legacyAsync: 'blocked',
    legacyMainBackup: 'blocked',
    legacyBakBackup: 'blocked',
    blockedCount: 3,
  });
});

it('uses the actual iOS app-group directory without opening the legacy instance', async () => {
  const m = await model();
  m.nativeContext.getAppGroupDirectory.mockReturnValue('/group' as any);
  m.files.set('/group/mmkv.default.crc', true);
  await m.run();
  expect(m.properties().legacyMmkv).toBe('blocked');
  expect(m.fs.exists).toHaveBeenCalledWith('/group/mmkv.default');
  expect(m.fs.exists).toHaveBeenCalledWith('/group/mmkv.default.crc');
  expect(m.nativeContext.getBaseDirectory).not.toHaveBeenCalled();
  expect(m.MMKV.mock.calls).toEqual([
    [{id: 'bitpay.wallet.v2'}],
    [{id: 'bitpay.wallet.transfer.v2'}],
  ]);
  expect(m.control.set).not.toHaveBeenCalled();
  expect(m.control.delete).not.toHaveBeenCalled();
  expect(m.fs.readFile).not.toHaveBeenCalled();
  expect(m.fs.read).not.toHaveBeenCalled();
  expect(m.fs.hash).not.toHaveBeenCalled();
  expect(m.fs.stat).not.toHaveBeenCalled();
  expect(m.fs.unlink).not.toHaveBeenCalled();
  expect(m.fs.writeFile).not.toHaveBeenCalled();
  expect(m.asyncStorage.getItem).not.toHaveBeenCalled();
  expect(m.asyncStorage.multiGet).not.toHaveBeenCalled();
  expect(m.asyncStorage.setItem).not.toHaveBeenCalled();
  expect(m.asyncStorage.removeItem).not.toHaveBeenCalled();
});

it.each(['ios', 'android'] as const)(
  'reports platform and age on %s',
  async os => {
    const m = await model(os);
    m.state.APP.appFirstOpenData.firstOpenDate = 1693434850;
    await m.run();
    expect(m.properties()).toMatchObject({
      platform: os,
      firstOpenedBeforeMmkv: true,
      legacyAsyncDb: os === 'ios' ? 'n/a' : 'absent',
    });
  },
);
it.each([
  [1693434850, true],
  [1693434851, false],
  [1693434852, false],
  [undefined, 'unknown'],
] as const)('compares first-open seconds %s as %s', async (date, expected) => {
  const m = await model();
  m.state.APP.appFirstOpenData.firstOpenDate = date;
  await m.run();
  expect(m.properties().firstOpenedBeforeMmkv).toBe(expected);
});
it('snapshots a missing date before the first await even if startup fills it in', async () => {
  const m = await model();
  const pending = deferred<boolean>();
  m.fs.exists.mockReturnValueOnce(pending.promise);
  const attempt = m.run();
  expect(m.track).not.toHaveBeenCalled();
  m.state.APP.appFirstOpenData.firstOpenDate = 1693434852;
  pending.resolve(false);
  await attempt;
  expect(m.properties().firstOpenedBeforeMmkv).toBe('unknown');
});

it.each([
  [0, 'small'],
  [65535, 'small'],
  [65536, 'medium'],
  [1048575, 'medium'],
  [1048576, 'large'],
] as const)(
  'buckets the Android main database size %i as %s using only exists/stat',
  async (size, expected) => {
    const m = await model('android');
    const r = record('mmkv', 2);
    r.release = {
      data: true,
      crc: true,
      async: true,
      main: true,
      bak: true,
      temp: true,
    };
    m.setRecord(r);
    m.files.set(paths.database, true);
    m.fs.stat.mockResolvedValue({size});
    await m.run();
    expect(m.properties().legacyAsyncDb).toBe(expected);
    expect(m.fs.exists.mock.calls).toEqual([[paths.database]]);
    expect(m.fs.stat.mock.calls).toEqual([[paths.database]]);
    expect(m.asyncStorage.getAllKeys).not.toHaveBeenCalled();
    expect(m.asyncStorage.getItem).not.toHaveBeenCalled();
    expect(m.asyncStorage.multiGet).not.toHaveBeenCalled();
    expect(m.fs.readFile).not.toHaveBeenCalled();
    expect(m.fs.read).not.toHaveBeenCalled();
    expect(m.fs.hash).not.toHaveBeenCalled();
  },
);
it('does not stat an absent Android database', async () => {
  const m = await model('android');
  await m.run();
  expect(m.properties().legacyAsyncDb).toBe('absent');
  expect(m.fs.stat).not.toHaveBeenCalled();
});
it.each([
  'exists',
  'stat',
  'invalid-exists',
  -1,
  NaN,
  Infinity,
  undefined,
  null,
  '65536',
] as const)('isolates Android database failure %s', async fault => {
  const m = await model('android');
  m.files.set(paths.database, true);
  if (fault === 'exists')
    m.files.set(paths.database, new Error('exists failure'));
  else if (fault === 'stat')
    m.fs.stat.mockRejectedValue(new Error('stat failure'));
  else if (fault === 'invalid-exists') {
    const exists = m.fs.exists.getMockImplementation()!;
    m.fs.exists.mockImplementation(path =>
      path === paths.database
        ? Promise.resolve(undefined as any)
        : exists(path),
    );
  } else m.fs.stat.mockResolvedValue({size: fault as any});
  await m.run();
  expect(m.properties()).toMatchObject({
    legacyAsyncDb: 'unknown',
    legacyMmkv: 'absent',
    legacyAsync: 'absent',
    legacyMainBackup: 'absent',
    legacyBakBackup: 'absent',
    blockedCount: 0,
  });
  if (fault === 'exists' || fault === 'invalid-exists')
    expect(m.fs.stat).not.toHaveBeenCalled();
});
it('never probes the database on iOS while retaining legacy checks', async () => {
  const m = await model();
  m.files.set(paths.main, true);
  await m.run();
  expect(m.properties()).toMatchObject({
    legacyMainBackup: 'blocked',
    legacyAsyncDb: 'n/a',
  });
  expect(m.fs.exists.mock.calls).toEqual([
    [paths.data],
    [paths.crc],
    [paths.main],
    [paths.bak],
  ]);
  expect(m.asyncStorage.getAllKeys).toHaveBeenCalledTimes(1);
  expect(m.fs.stat).not.toHaveBeenCalled();
});

it.each([
  'missing',
  'wrong-type',
  'malformed',
  'preparing',
  'read-failed',
  'keys-failed',
  'unexpected-key',
])('sends nothing and never propagates for a %s record', async condition => {
  const m = await model();
  if (condition === 'missing') m.controlValues.clear();
  if (condition === 'wrong-type') m.controlValues.set('transfer', false);
  if (condition === 'malformed') m.controlValues.set('transfer', 'not json');
  if (condition === 'preparing') m.setRecord({...record(), phase: 'preparing'});
  if (condition === 'read-failed')
    m.control.getString.mockImplementation(() => {
      throw new Error('read failure');
    });
  if (condition === 'keys-failed')
    m.control.getAllKeys.mockImplementation(() => {
      throw new Error('keys failure');
    });
  if (condition === 'unexpected-key')
    m.controlValues.set('extra', 'unrecognised');
  await expect(m.run()).resolves.toBeUndefined();
  expect(m.track).not.toHaveBeenCalled();
  expect(m.fs.exists).not.toHaveBeenCalled();
  expect(m.asyncStorage.getAllKeys).not.toHaveBeenCalled();
});
it('gates the read-only accessor before constructing or reading the control store', async () => {
  const m = await model('ios', false);
  expect(() => m.runtime.readVaultTransferRecord()).toThrow('not active');
  expect(m.MMKV.mock.calls).toEqual([[{id: 'bitpay.wallet.v2'}]]);
  expect(m.control.getString).not.toHaveBeenCalled();
  expect(m.control.getAllKeys).not.toHaveBeenCalled();
  await expect(m.run()).resolves.toBeUndefined();
  expect(m.track).not.toHaveBeenCalled();
});
it('returns parsed records or reliable null without writes', async () => {
  const m = await model();
  expect(m.runtime.readVaultTransferRecord()).toEqual(record());
  m.controlValues.clear();
  expect(m.runtime.readVaultTransferRecord()).toBeNull();
  expect(m.control.set).not.toHaveBeenCalled();
  expect(m.control.delete).not.toHaveBeenCalled();
});

it('persists the signature only in onComplete through the real APP reducer', async () => {
  const m = await model();
  m.track.mockImplementationOnce(() => () => {});
  await m.run();
  expect(m.state.APP.vaultMigrationStatusSignature).toBeUndefined();
  const onComplete = m.track.mock.calls[0][2]!;
  onComplete();
  expect(typeof m.state.APP.vaultMigrationStatusSignature).toBe('string');
  expect(m.appReduxPersistBlackList).not.toContain(
    'vaultMigrationStatusSignature',
  );
});
it('deduplicates an unknown observation and ignores later files, database, age, platform and policy changes', async () => {
  const m = await model();
  m.files.set(paths.data, new Error('read failure'));
  await m.run();
  expect(m.properties()).toMatchObject({
    legacyMmkv: 'unknown',
    blockedCount: 0,
  });
  const signature = m.state.APP.vaultMigrationStatusSignature;
  m.files.clear();
  m.files.set(paths.main, true);
  m.state.APP.appFirstOpenData.firstOpenDate = 1;
  m.policy.LEGACY_RETIREMENT_ENABLED = true;
  require('react-native').Platform.OS = 'android';
  m.fs.exists.mockClear();
  m.asyncStorage.getAllKeys.mockClear();
  m.nativeContext.getBaseDirectory.mockClear();
  await m.run();
  expect(m.track).toHaveBeenCalledTimes(1);
  expect(m.state.APP.vaultMigrationStatusSignature).toBe(signature);
  expect(m.fs.exists).not.toHaveBeenCalled();
  expect(m.fs.stat).not.toHaveBeenCalled();
  expect(m.asyncStorage.getAllKeys).not.toHaveBeenCalled();
  expect(m.nativeContext.getBaseDirectory).not.toHaveBeenCalled();
});
it.each([
  'phase',
  'root',
  'main-copy',
  'bak-copy',
  'mmkv-permission',
  'async-permission',
  'main-permission',
  'bak-permission',
])('reports a changed %s once', async field => {
  const m = await model();
  const r = record('mmkv', 2);
  m.setRecord(r);
  await m.run();
  const previous = m.state.APP.vaultMigrationStatusSignature;
  if (field === 'phase') r.phase = 'retired';
  if (field === 'root') r.copies.root = 'async';
  if (field === 'main-copy') r.copies.main = null;
  if (field === 'bak-copy') r.copies.bak = null;
  if (field === 'mmkv-permission') r.release.data = r.release.crc = true;
  if (field === 'async-permission') r.release.async = true;
  if (field === 'main-permission') r.release.main = true;
  if (field === 'bak-permission') r.release.bak = true;
  m.setRecord(r);
  await m.run();
  expect(m.state.APP.vaultMigrationStatusSignature).not.toBe(previous);
  await m.run();
  expect(m.track).toHaveBeenCalledTimes(2);
});
it.each(['disabled', 'merging'])(
  'makes no record or legacy/database checks when %s at dispatch',
  async condition => {
    const m = await model('android');
    if (condition === 'disabled') m.config.APP_ANALYTICS_ENABLED = false;
    else m.Analytics.startMergingUser();
    await m.run();
    expect(m.control.getString).not.toHaveBeenCalled();
    expect(m.control.getAllKeys).not.toHaveBeenCalled();
    expect(m.fs.exists).not.toHaveBeenCalled();
    expect(m.fs.stat).not.toHaveBeenCalled();
    expect(m.asyncStorage.getAllKeys).not.toHaveBeenCalled();
    expect(m.track).not.toHaveBeenCalled();
  },
);
it.each(['disabled', 'merging'])(
  'leaves a report suppressed as %s unreported for the next launch',
  async condition => {
    const m = await model();
    const pending = deferred<boolean>();
    m.fs.exists.mockReturnValueOnce(pending.promise);
    const attempt = m.run();
    if (condition === 'disabled') m.config.APP_ANALYTICS_ENABLED = false;
    else m.Analytics.startMergingUser();
    pending.resolve(false);
    await attempt;
    expect(m.track).toHaveBeenCalledTimes(1);
    expect(m.providers[0].track).not.toHaveBeenCalled();
    expect(m.state.APP.vaultMigrationStatusSignature).toBeUndefined();
    m.config.APP_ANALYTICS_ENABLED = true;
    m.Analytics.endMergingUser();
    await m.run();
    expect(m.track).toHaveBeenCalledTimes(2);
    expect(m.providers[0].track).toHaveBeenCalledTimes(1);
    expect(typeof m.state.APP.vaultMigrationStatusSignature).toBe('string');
  },
);

it.each([false, true])(
  'contains a late onComplete dispatch failure even if logging throws: %s',
  async logThrows => {
    const m = await model();
    m.track.mockImplementationOnce(() => () => {});
    await m.run();
    const onComplete = m.track.mock.calls[0][2]!;
    m.dispatch.mockImplementationOnce(() => {
      throw new Error('signature dispatch failure');
    });
    if (logThrows)
      m.log.warn.mockImplementation(() => {
        throw new Error('log failure');
      });
    expect(onComplete).not.toThrow();
    await Promise.resolve();
    expect(m.state.APP.vaultMigrationStatusSignature).toBeUndefined();
    expect(m.log.warn).toHaveBeenCalledWith(
      'Vault migration status telemetry could not be completed',
    );
  },
);
it('contains signature failure inside the real analytics asynchronous guard', async () => {
  const m = await model();
  const dispatch = m.dispatch.getMockImplementation()!;
  m.dispatch.mockImplementation(action => {
    if (action.type === 'APP/SET_VAULT_MIGRATION_STATUS_REPORTED')
      throw new Error('dispatch failure');
    return dispatch(action);
  });
  await expect(m.run()).resolves.toBeUndefined();
  await Promise.resolve();
  expect(m.providers[0].track).toHaveBeenCalledTimes(1);
  expect(m.state.APP.vaultMigrationStatusSignature).toBeUndefined();
});
it.each([
  'state',
  'merging-check',
  'track-creation',
  'track-dispatch',
  'async-dispatch',
  'logging',
])('does not propagate reporter failure at %s', async step => {
  const m = await model();
  const fail = () => {
    throw new Error('private detail');
  };
  if (step === 'state' || step === 'logging')
    m.getState.mockImplementation(fail);
  if (step === 'merging-check')
    jest.spyOn(m.Analytics, 'isMergingUser').mockImplementation(fail);
  if (step === 'track-creation') m.track.mockImplementation(fail);
  if (step === 'track-dispatch') m.dispatch.mockImplementation(fail);
  if (step === 'async-dispatch')
    m.dispatch.mockRejectedValue(new Error('private detail'));
  if (step === 'logging') m.log.warn.mockImplementation(fail);
  await expect(m.run()).resolves.toBeUndefined();
  expect(m.state.APP.vaultMigrationStatusSignature).toBeUndefined();
});

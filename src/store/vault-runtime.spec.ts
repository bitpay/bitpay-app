import crypto from 'crypto';
import isEqual from 'lodash.isequal';

jest.mock('react-native', () => ({
  Platform: {OS: 'android'},
  TurboModuleRegistry: {
    getEnforcing: (name: string) => {
      if (name === 'MmkvCxx')
        return {
          claimLegacyRetirement: () => {
            mockEvents.push('retirement:claim');
            if (mockForbidLegacy) throw new Error('legacy access forbidden');
            return !mockWarm;
          },
        };
      if (name === 'MmkvPlatformContext')
        return {
          getBaseDirectory: () => {
            mockEvents.push('legacy:directory');
            if (mockForbidLegacy) throw new Error('legacy directory forbidden');
            return '/synthetic/mmkv';
          },
        };
      throw new Error('Unexpected module');
    },
  },
}));

const mockStores = new Map<string, Map<string, string>>();
const mockFiles = new Map<string, string | Buffer>();
const mockRows = new Map<string, string>();
const mockCredentials = new Map<string, any>();
const mockEvents: string[] = [];
const mockWarnings: string[] = [];
let mockForbidLegacy = false;
let mockWarm = false;
let mockOldKeyFailure = false;
let mockSetFailure = false;
let mockReadBackFailure = false;
let mockControlFailure = false;
let mockKeyMissing = false;
let mockPrimaryFailures = 0;
let mockPrimaryReads = 0;
let mockSilentPrimaryFailures = 0;
let mockSilentPrimary = false;
let mockBookkeepingFailure: string | undefined;
const mockBookkeepingReads: Array<[string, number, number, string]> = [];
let mockAsyncReadFailure = false;
const mockFileReads: string[] = [];
let mockHashCalls = 0;
let mockLegacyKeysFailure = false;
let mockPartialWritePath: string | undefined;
let mockRejectPartialWrite = true;
const legacyKey = 'synthetic-legacy-fixture-key';
const fixture = require('../../test/vault/fixtures/legacy-14.32.json').cases
  .plain;

jest.mock('react-native-mmkv', () => ({
  MMKV: class {
    values: Map<string, string>;
    id: string;
    constructor(config: any) {
      this.id = config.id;
      mockEvents.push('open:' + this.id);
      if (this.id === 'mmkv.default') {
        if (mockForbidLegacy) throw new Error('legacy open forbidden');
        mockWarm = true;
        mockEvents.push('legacy:readOnly:' + Boolean(config.readOnly));
      }
      if (!mockStores.has(this.id)) mockStores.set(this.id, new Map());
      this.values = mockStores.get(this.id)!;
    }
    getAllKeys() {
      if (this.id === 'mmkv.default' && mockLegacyKeysFailure)
        throw new Error('synthetic key inventory failure');
      if (this.id === 'mmkv.default' && mockSilentPrimary) return [];
      return [...this.values.keys()];
    }
    contains(k: string) {
      if (this.id === 'mmkv.default' && mockSilentPrimary) return false;
      return this.values.has(k);
    }
    getString(k: string) {
      mockEvents.push('read:' + this.id + ':' + k);
      if (this.id === 'mmkv.default' && k === 'persist:root') {
        mockPrimaryReads++;
        mockSilentPrimary = mockSilentPrimaryFailures-- > 0;
        if (mockSilentPrimary) return undefined;
        if (mockPrimaryFailures > 0) {
          mockPrimaryFailures--;
          throw new Error('synthetic primary read failure');
        }
      }
      if (this.id === 'bitpay.wallet.transfer.v2' && mockControlFailure)
        throw new Error('secret native message');
      return this.values.get(k);
    }
    set(k: string, value: string) {
      mockEvents.push('write:' + this.id + ':' + k);
      if (this.id === 'mmkv.default') throw new Error('old writer forbidden');
      if (this.id === 'bitpay.wallet.transfer.v2')
        mockEvents.push('control:' + JSON.parse(value).phase);
      this.values.set(k, value);
    }
  },
}));
jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/cache',
  exists: async (p: string) => {
    const present = mockFiles.has(p);
    mockEvents.push('file:exists:' + p + ':' + present);
    if (mockForbidLegacy && !p.includes('/redux-v2/'))
      throw new Error('legacy existence scan forbidden');
    return present;
  },
  read: async (
    p: string,
    length: number,
    position: number,
    encoding: string,
  ) => {
    mockBookkeepingReads.push([p, length, position, encoding]);
    if (mockForbidLegacy) throw new Error('legacy bounded read forbidden');
    if (p === mockBookkeepingFailure || !mockFiles.has(p))
      throw new Error('synthetic bookkeeping read failure');
    const value = mockFiles.get(p)!;
    return (typeof value === 'string' ? Buffer.from(value) : value)
      .slice(position, position + length)
      .toString('base64');
  },
  readFile: async (p: string) => {
    mockFileReads.push(p);
    if (mockForbidLegacy && !p.includes('/redux-v2/'))
      throw new Error('legacy content read forbidden');
    const value = mockFiles.get(p);
    return Buffer.isBuffer(value)
      ? new (require('util').TextDecoder)('utf-8', {fatal: true}).decode(value)
      : value;
  },
  hash: async (p: string) => {
    mockHashCalls++;
    return require('crypto')
      .createHash('sha256')
      .update(mockFiles.get(p))
      .digest('hex');
  },
  writeFile: async (p: string, value: string) => {
    mockEvents.push('file:write');
    mockFiles.set(p, value);
    if (p === mockPartialWritePath) {
      mockFiles.set(p, Buffer.from([0xc3, 0x28])); // invalid UTF-8, not just truncated JSON
      mockEvents.push('file:partial-write:' + p);
      if (mockRejectPartialWrite) throw new Error('synthetic partial write');
    }
  },
  mkdir: async () => {},
  unlink: async (p: string) => {
    mockEvents.push('file:unlink:' + p);
    if (mockForbidLegacy) throw new Error('legacy unlink forbidden');
    mockFiles.delete(p);
  },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => {
    mockEvents.push('async:read');
    if (mockForbidLegacy) throw new Error('legacy row read forbidden');
    if (mockAsyncReadFailure)
      throw new Error('synthetic required AsyncStorage failure');
    return mockRows.get(key) ?? null;
  },
  getAllKeys: async () => {
    mockEvents.push('async:keys');
    if (mockForbidLegacy) throw new Error('legacy row inventory forbidden');
    return [...mockRows.keys()];
  },
  removeItem: async (key: string) => {
    mockEvents.push('async:remove');
    if (mockForbidLegacy) throw new Error('legacy row removal forbidden');
    mockRows.delete(key);
  },
  multiRemove: () => {
    throw new Error('broad deletion forbidden');
  },
}));
jest.mock('react-native-device-info', () => ({
  ...require('react-native-device-info/jest/react-native-device-info-mock'),
  getUniqueId: () => {
    mockEvents.push('legacy:device-id');
    if (mockForbidLegacy) throw new Error('legacy candidate lookup forbidden');
    return 'synthetic-legacy-fixture-key';
  },
}));
jest.mock('react-native-keychain', () => ({
  getGenericPassword: async ({service}: any) => {
    mockEvents.push('key:read:' + service);
    if (service === 'bitpay-app-encryption-key' && mockForbidLegacy)
      throw new Error('legacy credential lookup forbidden');
    if (service === 'bitpay-app-encryption-key' && mockOldKeyFailure)
      throw new Error('native sensitive error');
    if (service === 'bitpay-app-vault-key-v1' && mockKeyMissing) return false;
    const entry = mockCredentials.get(service);
    return entry && mockReadBackFailure
      ? {...entry, password: 'wrong'}
      : entry ?? false;
  },
  setGenericPassword: async (
    username: string,
    password: string,
    options: any,
  ) => {
    mockEvents.push('key:write:' + options.service);
    if (mockSetFailure) return false;
    mockCredentials.set(options.service, {
      username,
      password,
      storage: options.storage,
    });
    return {storage: options.storage};
  },
  resetGenericPassword: async ({service}: any) => {
    mockEvents.push('key:remove:' + service);
    if (mockForbidLegacy)
      throw new Error('legacy credential removal forbidden');
    mockCredentials.delete(service);
    return true;
  },
  ACCESSIBLE: {AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'local'},
  STORAGE_TYPE: {AES_GCM_NO_AUTH: 'aes-gcm'},
  SECURITY_LEVEL: {SECURE_SOFTWARE: 'software'},
}));
jest.mock('./log/initLogs', () => ({add: jest.fn()}));
jest.mock('./log', () => ({
  LogActions: {
    persistLog: (x: any) => x,
    warn: (message: string) => {
      mockWarnings.push(message);
      return {};
    },
  },
}));

beforeEach(() => {
  jest.resetModules();
  // Preserve the existing enabled-retirement behavioral assertions.
  jest.doMock('./vault-retirement-policy', () => ({
    LEGACY_RETIREMENT_ENABLED: true,
  }));
  mockForbidLegacy = false;
  mockWarnings.length = 0;
  mockStores.clear();
  mockFiles.clear();
  mockRows.clear();
  mockCredentials.clear();
  mockEvents.length = 0;
  mockPrimaryFailures = mockPrimaryReads = mockHashCalls = 0;
  mockSilentPrimaryFailures = 0;
  mockSilentPrimary = false;
  mockBookkeepingFailure = undefined;
  mockBookkeepingReads.length = 0;
  mockAsyncReadFailure = false;
  mockLegacyKeysFailure = false;
  mockPartialWritePath = undefined;
  mockRejectPartialWrite = true;
  mockFileReads.length = 0;
  mockWarm =
    mockOldKeyFailure =
    mockSetFailure =
    mockReadBackFailure =
    mockControlFailure =
    mockKeyMissing =
      false;
});
const start = () => require('./vault-runtime').prepareModernVault();
const expectNoRetirementAfterActivation = () => {
  expect(mockWarnings).toEqual([]);
  expect(mockEvents.slice(mockEvents.indexOf('control:active') + 1)).toEqual([
    'read:bitpay.wallet.transfer.v2:transfer',
  ]);
};
const shippingPolicy = () => {
  jest.dontMock('./vault-retirement-policy');
  jest.resetModules();
};
const modernRoot = () =>
  mockStores.get('bitpay.wallet.v2')?.get('persist:root');
const seed = () => {
  mockStores.set(
    'mmkv.default',
    new Map([
      ['persist:root', fixture.raw],
      ['persist:logs', 'old standalone logs'],
    ]),
  );
  mockFiles.set('/synthetic/mmkv/mmkv.default', 'data');
  mockFiles.set('/synthetic/mmkv/mmkv.default.crc', 'crc');
};

it('uses a whole-snapshot device-ID candidate after old Keychain rejection without writing that service', async () => {
  seed();
  mockOldKeyFailure = true;
  const key = await start();
  expect(key !== legacyKey && Buffer.from(key, 'base64').length === 32).toBe(
    true,
  );
  const {decodeSnapshot} = require('./vault-codec');
  expect(
    isEqual(decodeSnapshot(modernRoot(), key).payload, fixture.state),
  ).toBe(true);
  expect(mockEvents.includes('key:write:bitpay-app-encryption-key')).toBe(
    false,
  );
  expect(mockStores.get('bitpay.wallet.v2')!.has('persist:logs')).toBe(false);
  expect(
    mockStores.get('mmkv.default')!.get('persist:root') === fixture.raw,
  ).toBe(true);
});

it('direct AsyncStorage transfer preserves unrelated provider data and never opens old MMKV', async () => {
  const outer = JSON.parse(fixture.raw);
  outer.APP = JSON.stringify(
    JSON.stringify({...fixture.state.APP, migrationMMKVStorageComplete: false}),
  );
  mockRows.set('persist:root', JSON.stringify(outer));
  mockRows.set('walletconnect', 'retained');
  await start();
  expectNoRetirementAfterActivation();
  expect(mockRows.has('persist:root')).toBe(true);
  expect(transferRecord().phase).toBe('active');
  const initialEvents = [...mockEvents];
  await start(); // Successful preparation is cached, not a second invocation.
  expect(mockEvents).toEqual(initialEvents);
  jest.resetModules();
  await start();
  expect(mockEvents.includes('open:mmkv.default')).toBe(false);
  expect(mockRows.get('walletconnect')).toBe('retained');
  expect(mockRows.has('persist:root')).toBe(false);
});

it.each(['creation', 'read-back'])(
  'stops before ciphertext or control writes on failed modern key %s',
  async kind => {
    seed();
    mockSetFailure = kind === 'creation';
    mockReadBackFailure = kind === 'read-back';
    await fails(() => start(), 'NEW_KEY_VERIFICATION');
    expect(modernRoot() === undefined).toBe(true);
    expect(mockStores.get('bitpay.wallet.transfer.v2')!.size).toBe(0);
    expect(
      mockStores.get('mmkv.default')!.get('persist:root') === fixture.raw,
    ).toBe(true);
    mockSetFailure = mockReadBackFailure = false;
    await start();
    expect(modernRoot() !== undefined).toBe(true);
  },
);

it('never generates a replacement or falls back when an active modern key is missing', async () => {
  seed();
  await start();
  const before = modernRoot();
  jest.resetModules();
  mockKeyMissing = true;
  mockEvents.length = 0;
  await fails(() => start(), 'MODERN_KEY_FAILURE');
  expect(modernRoot() === before).toBe(true);
  expect(mockEvents.some(e => e.startsWith('key:write'))).toBe(false);
  expect(mockEvents.includes('open:mmkv.default')).toBe(false);
});

it('a failed control read stops before source access and never exposes native messages', async () => {
  seed();
  mockControlFailure = true;
  let error: any;
  try {
    await start();
  } catch (e) {
    error = e;
  }
  expect(error?.message.includes('secret')).toBe(false);
  expect(mockEvents.includes('open:mmkv.default')).toBe(false);
  expect(modernRoot() === undefined).toBe(true);
  mockControlFailure = false;
  await start();
  expect(modernRoot() !== undefined).toBe(true);
});

it('preserves a different-key source when the old credential fails', async () => {
  seed();
  const {encodeSnapshot} = require('./vault-codec');
  const raw = encodeSnapshot(fixture.state, 'different-synthetic-key');
  mockStores.get('mmkv.default')!.set('persist:root', raw);
  mockOldKeyFailure = true;
  await fails(() => start(), 'INVALID_LEGACY_INPUT');
  expect(modernRoot() === undefined).toBe(true);
  expect(mockStores.get('mmkv.default')!.get('persist:root') === raw).toBe(
    true,
  );
  expect(mockEvents.some(e => e.startsWith('key:write'))).toBe(false);
});

it('JS reload retains warm retirement deferral; a modeled cold process removes only the old pair', async () => {
  seed();
  await start();
  mockFiles.set('/synthetic/mmkv/other-instance', 'keep');
  mockFiles.set('/synthetic/mmkv/unexpected', 'keep');
  jest.resetModules();
  await start();
  expect(mockFiles.has('/synthetic/mmkv/mmkv.default')).toBe(true);
  jest.resetModules();
  mockWarm = false;
  await start();
  expect(mockFiles.has('/synthetic/mmkv/mmkv.default')).toBe(false);
  expect(mockFiles.has('/synthetic/mmkv/other-instance')).toBe(true);
  expect(mockFiles.has('/synthetic/mmkv/unexpected')).toBe(true);
});

it('reuses an existing valid modern key and rejects an invalid backend', async () => {
  const password = crypto.randomBytes(32).toString('base64');
  mockCredentials.set('bitpay-app-vault-key-v1', {password, storage: 'wrong'});
  await fails(() => start(), 'MODERN_KEY_FAILURE');
  mockCredentials.set('bitpay-app-vault-key-v1', {
    password,
    storage: 'aes-gcm',
  });
  expect((await start()) === password).toBe(true);
  expect(mockEvents.some(e => e.startsWith('key:write'))).toBe(false);
});

// Never let Jest render a resolved key, ciphertext, payload, or source digest.
const fails = async (operation: () => Promise<unknown>, code?: string) => {
  let failed = false;
  try {
    await operation();
  } catch (error) {
    failed =
      code === undefined ||
      (error instanceof Error && error.message.includes(code));
  }
  expect(failed).toBe(true);
};

it('C: rereads a rejected primary once and transfers it instead of an older backup', async () => {
  seed();
  const {encodeSnapshot, decodeSnapshot} = require('./vault-codec');
  mockFiles.set(
    '/cache/bitpay/redux/persist-root.json',
    encodeSnapshot({...fixture.state, OLDER: {value: true}}, legacyKey),
  );
  mockPrimaryFailures = 1;
  const key = await start();
  expect(mockPrimaryReads).toBe(2);
  expect(mockPrimaryFailures).toBe(0);
  expect(
    isEqual(decodeSnapshot(modernRoot(), key).payload, fixture.state),
  ).toBe(true);
});

it.each(['main', 'bak', 'none'])(
  'C: two failed primary reads use %s fallback or stop without opening empty',
  async fallback => {
    seed();
    mockPrimaryFailures = 2;
    if (fallback !== 'none')
      mockFiles.set(
        '/cache/bitpay/redux/persist-root.json' +
          (fallback === 'bak' ? '.bak' : ''),
        fixture.raw,
      );
    if (fallback === 'none') {
      await fails(() => start());
      expect(modernRoot() === undefined).toBe(true);
    } else {
      const key = await start();
      const {decodeSnapshot} = require('./vault-codec');
      expect(
        isEqual(decodeSnapshot(modernRoot(), key).payload, fixture.state),
      ).toBe(true);
      jest.resetModules();
      mockWarm = false;
      await start();
      expect(mockFiles.has('/synthetic/mmkv/mmkv.default')).toBe(true);
      expect(mockFiles.has('/synthetic/mmkv/mmkv.default.crc')).toBe(true);
    }
    expect(mockPrimaryReads).toBe(2);
    expect(mockPrimaryFailures).toBe(0);
  },
);

it('D15 A2: an unreadable AsyncStorage row permits an established primary wallet', async () => {
  shippingPolicy();
  seed();
  mockRows.set('persist:root', 'retained unreadable row');
  mockAsyncReadFailure = true;
  const key = await start();
  const {decodeSnapshot} = require('./vault-codec');
  expect(
    isEqual(decodeSnapshot(modernRoot(), key).payload, fixture.state),
  ).toBe(true);
  expect(transferRecord().phase).toBe('active');
  expect(transferRecord().copies.root).toBe('mmkv');
  expect(transferRecord().release.async).toBe(false);
  expect(mockEvents.filter(event => event === 'async:read')).toHaveLength(1);
  expect(mockEvents).not.toContain('async:remove');
  expect(mockRows.get('persist:root')).toBe('retained unreadable row');
  expect(
    mockStores.get('mmkv.default')!.get('persist:root') === fixture.raw,
  ).toBe(true);
});

it.each([false, undefined])(
  'D15 A2: an unreadable row still stops a primary with import flag %s',
  async flag => {
    shippingPolicy();
    seed();
    const {encodeSnapshot, decodeSnapshot} = require('./vault-codec');
    const payload = {
      ...fixture.state,
      APP: flag === undefined ? {} : {migrationMMKVStorageComplete: flag},
    };
    const raw = encodeSnapshot(payload, legacyKey);
    expect(isEqual(decodeSnapshot(raw, legacyKey).payload, payload)).toBe(true);
    mockStores.get('mmkv.default')!.set('persist:root', raw);
    mockAsyncReadFailure = true;
    const diagnostic = await start().then(
      () => null,
      (error: unknown) => require('./vault-diagnostics').vaultDiagnostic(error),
    );
    expect(diagnostic).toEqual({
      code: 'SOURCE_CONFLICT',
      phase: 'inventory',
      reason: 'SOURCE_READ',
    });
    expect(modernRoot()).toBeUndefined();
    expect(mockStores.get('bitpay.wallet.transfer.v2')!.size).toBe(0);
    expect(mockEvents.some(event => event.startsWith('key:write'))).toBe(false);
    expect(mockEvents).not.toContain('file:write');
    expect(mockEvents).not.toContain('async:remove');
    expect(mockEvents.filter(event => event === 'async:read')).toHaveLength(1);
    expect(mockStores.get('mmkv.default')!.get('persist:root') === raw).toBe(
      true,
    );
  },
);

it('C: fallback does not swallow a separate required AsyncStorage failure', async () => {
  seed();
  mockPrimaryFailures = 2;
  mockAsyncReadFailure = true;
  mockFiles.set('/cache/bitpay/redux/persist-root.json', fixture.raw);
  await fails(() => start());
  expect(mockPrimaryReads).toBe(2);
  expect(modernRoot() === undefined).toBe(true);
  expect(mockEvents.some(e => e.startsWith('key:write'))).toBe(false);
});

it('D policy: permitted old files changed after activation are removed without content reads', async () => {
  seed();
  await start();
  const before = modernRoot();
  mockFiles.set('/synthetic/mmkv/mmkv.default', 'changed after activation');
  mockFiles.set('/synthetic/mmkv/mmkv.default.crc', 'changed metadata');
  mockFileReads.length = 0;
  jest.resetModules();
  mockWarm = false;
  await start();
  expect(mockFiles.has('/synthetic/mmkv/mmkv.default')).toBe(false);
  expect(mockFiles.has('/synthetic/mmkv/mmkv.default.crc')).toBe(false);
  expect(modernRoot() === before).toBe(true);
  expect(mockFileReads.length).toBe(0);
  expect(mockHashCalls).toBe(0);
});

it.each(['unknown entry', 'failed inventory'])(
  'C/D: a recovered primary preserves an old instance with %s',
  async reason => {
    seed();
    mockCredentials.set('bitpay-app-encryption-key', {password: legacyKey});
    if (reason === 'unknown entry')
      mockStores.get('mmkv.default')!.set('unknown', 'retain');
    else mockLegacyKeysFailure = true;
    mockPrimaryFailures = 1;
    await start();
    expect(mockPrimaryReads).toBe(2);
    expect(modernRoot() !== undefined).toBe(true);
    jest.resetModules();
    mockWarm = false;
    await start();
    expect(mockFiles.has('/synthetic/mmkv/mmkv.default')).toBe(true);
    expect(mockFiles.has('/synthetic/mmkv/mmkv.default.crc')).toBe(true);
    expect(mockCredentials.has('bitpay-app-encryption-key')).toBe(true);
  },
);

it.each(['main', 'bak'] as const)(
  'A follow-up: malformed obsolete %s is removed through the real runtime adapter',
  async slot => {
    seed();
    const suffix = slot === 'bak' ? '.bak' : '';
    const oldPath = '/cache/bitpay/redux/persist-root.json' + suffix;
    const modernPath = '/cache/bitpay/redux-v2/persist-root.json' + suffix;
    mockFiles.set(oldPath, fixture.raw);
    mockPartialWritePath = modernPath;
    await fails(() => start(), 'REQUIRED_COPY_FAILURE');
    expect(mockEvents.includes('file:partial-write:' + modernPath)).toBe(true);
    expect(mockFiles.get(oldPath) === fixture.raw).toBe(true);
    expect(
      mockStores.get('mmkv.default')!.get('persist:root') === fixture.raw,
    ).toBe(true);
    expect(mockEvents.some(e => e.startsWith('file:unlink:'))).toBe(false);
    expect(Buffer.isBuffer(mockFiles.get(modernPath))).toBe(true);
    // This proves the boundary really rejects content reads while the bytes exist.
    await fails(() => require('react-native-fs').readFile(modernPath, 'utf8'));
    const key = mockCredentials.get('bitpay-app-vault-key-v1').password;
    mockFiles.delete('/cache/bitpay/redux/persist-root.json');
    mockFiles.delete('/cache/bitpay/redux/persist-root.json.bak');
    mockPartialWritePath = undefined;
    mockFileReads.length = 0;
    const retryStart = mockEvents.length;
    await start();
    const events = mockEvents.slice(retryStart);
    const removed = events.indexOf('file:unlink:' + modernPath);
    const verifiedAbsent = events.indexOf(
      'file:exists:' + modernPath + ':false',
      removed + 1,
    );
    const activated = events.indexOf('control:active');
    expect(
      removed >= 0 && verifiedAbsent > removed && activated > verifiedAbsent,
    ).toBe(true);
    expect(
      events.slice(0, activated).filter(e => e.startsWith('file:unlink:')),
    ).toEqual(['file:unlink:' + modernPath]);
    expect(mockFileReads.includes(modernPath)).toBe(false);
    expect(mockFiles.has(modernPath)).toBe(false);
    expect(
      mockCredentials.get('bitpay-app-vault-key-v1').password === key,
    ).toBe(true);
    expect(
      mockEvents.filter(e => e === 'key:write:bitpay-app-vault-key-v1').length,
    ).toBe(1);
    expect(
      mockStores.get('mmkv.default')!.get('persist:root') === fixture.raw,
    ).toBe(true);
    const {decodeSnapshot} = require('./vault-codec');
    expect(
      isEqual(decodeSnapshot(modernRoot(), key).payload, fixture.state),
    ).toBe(true);
  },
);

it('A follow-up: unreadable required output still fails content verification', async () => {
  seed();
  const modernPath = '/cache/bitpay/redux-v2/persist-root.json';
  mockFiles.set('/cache/bitpay/redux/persist-root.json', fixture.raw);
  mockPartialWritePath = modernPath;
  mockRejectPartialWrite = false; // write resolves, but the required copy is unreadable
  await fails(() => start());
  expect(mockEvents.includes('file:partial-write:' + modernPath)).toBe(true);
  expect(mockFileReads.includes(modernPath)).toBe(true);
  expect(mockEvents.includes('control:active')).toBe(false);
  expect(mockEvents.some(e => e.startsWith('file:unlink:'))).toBe(false);
  expect(
    mockFiles.get('/cache/bitpay/redux/persist-root.json') === fixture.raw,
  ).toBe(true);
  mockPartialWritePath = undefined;
  await start();
  expect(mockEvents.includes('control:active')).toBe(true);
  expect(
    mockEvents.filter(e => e === 'key:write:bitpay-app-vault-key-v1').length,
  ).toBe(1);
});

const oldPair = '/synthetic/mmkv/mmkv.default';
const bookkeep = (
  header: number,
  current: number,
  last: number,
  version = 4,
) => {
  const data = Buffer.alloc(64);
  const metadata = Buffer.alloc(112);
  data.writeUInt32LE(header, 0);
  metadata.writeUInt32LE(version, 4);
  metadata.writeUInt32LE(current, 28);
  metadata.writeUInt32LE(last, 32);
  mockFiles.set(oldPair, data);
  mockFiles.set(oldPair + '.crc', metadata);
};
const transferRecord = () =>
  JSON.parse(mockStores.get('bitpay.wallet.transfer.v2')!.get('transfer')!);

it('D12: real default holds every old source after activation and never touches it on a cold launch', async () => {
  shippingPolicy();
  expect(require('./vault-retirement-policy').LEGACY_RETIREMENT_ENABLED).toBe(
    false,
  );
  seed();
  mockRows.set('persist:root', fixture.raw);
  mockCredentials.set('bitpay-app-encryption-key', {password: legacyKey});
  const {encodeSnapshot, decodeSnapshot} = require('./vault-codec');
  const main = {...fixture.state, SNAPSHOT: {source: 'main'}};
  const bak = {...fixture.state, SNAPSHOT: {source: 'bak'}};
  const oldBase = '/cache/bitpay/redux/persist-root.json';
  mockFiles.set(oldBase, encodeSnapshot(main, legacyKey));
  mockFiles.set(oldBase + '.bak', encodeSnapshot(bak, legacyKey));
  mockFiles.set(oldBase + '.tmp', 'synthetic old writer temp');
  const oldFiles = new Map(mockFiles);
  const key = await start();
  expect(transferRecord().phase).toBe('active');
  expect(Object.values(transferRecord().release).every(Boolean)).toBe(true);
  expect(
    isEqual(decodeSnapshot(modernRoot(), key).payload, fixture.state),
  ).toBe(true);
  for (const [slot, payload] of [
    ['', main],
    ['.bak', bak],
  ] as const) {
    const raw = mockFiles.get(
      '/cache/bitpay/redux-v2/persist-root.json' + slot,
    );
    expect(isEqual(decodeSnapshot(raw, key).payload, payload)).toBe(true);
  }
  for (const [path, bytes] of oldFiles)
    expect(mockFiles.get(path) === bytes).toBe(true);
  expect(mockRows.get('persist:root') === fixture.raw).toBe(true);
  expect(mockStores.get('mmkv.default')!.get('persist:logs')).toBe(
    'old standalone logs',
  );
  expect(mockCredentials.has('bitpay-app-encryption-key')).toBe(true);
  expect(mockEvents.slice(mockEvents.indexOf('control:active') + 1)).toEqual([
    'read:bitpay.wallet.transfer.v2:transfer',
  ]);
  expect(mockWarnings).toEqual([]);
  expect(require('./log/initLogs').add).not.toHaveBeenCalled();
  const record = mockStores.get('bitpay.wallet.transfer.v2')!.get('transfer');
  const root = modernRoot();
  const reads = mockPrimaryReads;
  mockForbidLegacy = true;
  mockWarm = false;
  mockEvents.length = 0;
  mockFileReads.length = 0;
  mockBookkeepingReads.length = 0;
  jest.resetModules();
  expect((await start()) === key).toBe(true);
  expect(mockEvents).toEqual([
    'open:bitpay.wallet.v2',
    'open:bitpay.wallet.transfer.v2',
    'read:bitpay.wallet.transfer.v2:transfer',
    'key:read:bitpay-app-vault-key-v1',
  ]);
  expect(mockPrimaryReads).toBe(reads);
  expect(mockFileReads).toEqual([]);
  expect(mockBookkeepingReads).toEqual([]);
  expect(mockWarnings).toEqual([]);
  expect(require('./log/initLogs').add).not.toHaveBeenCalled();
  expect(
    mockStores.get('bitpay.wallet.transfer.v2')!.get('transfer') === record,
  ).toBe(true);
  const storage = require('./vault-storage');
  expect(storage.isVaultActive()).toBe(true);
  expect(storage.modernStorage.getString('persist:root') === root).toBe(true);
});

it('D12: retained older-build edits and total modern-data loss never replay legacy data', async () => {
  shippingPolicy();
  seed();
  mockCredentials.set('bitpay-app-encryption-key', {password: legacyKey});
  const key = await start();
  const {encodeSnapshot, decodeSnapshot} = require('./vault-codec');
  const modern = {...fixture.state, SNAPSHOT: {source: 'modern-only'}};
  mockStores
    .get('bitpay.wallet.v2')!
    .set('persist:root', encodeSnapshot(modern, key));
  mockStores
    .get('mmkv.default')!
    .set(
      'persist:root',
      encodeSnapshot(
        {...fixture.state, SNAPSHOT: {source: 'legacy-only'}},
        legacyKey,
      ),
    );
  mockForbidLegacy = true;
  mockWarm = false;
  jest.resetModules();
  await start();
  expect(isEqual(decodeSnapshot(modernRoot(), key).payload, modern)).toBe(true);
  mockStores.get('bitpay.wallet.v2')!.delete('persist:root');
  mockFiles.delete('/cache/bitpay/redux-v2/persist-root.json');
  mockFiles.delete('/cache/bitpay/redux-v2/persist-root.json.bak');
  jest.resetModules();
  expect((await start()) === key).toBe(true);
  expect(modernRoot()).toBeUndefined();
  expect(transferRecord().phase).toBe('active');
  expect(mockPrimaryReads).toBe(1);
  mockKeyMissing = true;
  mockEvents.length = 0;
  jest.resetModules();
  await fails(start, 'MODERN_KEY_FAILURE');
  expect(mockEvents.some(e => e.startsWith('key:write'))).toBe(false);
  expect(mockPrimaryReads).toBe(1);
  expect(mockCredentials.has('bitpay-app-encryption-key')).toBe(true);
  expect(mockWarnings).toEqual([]);
});

it('D12: enabled cold build retires saved permitted locations without another source inspection', async () => {
  shippingPolicy();
  seed();
  mockRows.set('persist:root', fixture.raw);
  mockFiles.set('/cache/bitpay/redux/persist-root.json', fixture.raw);
  mockCredentials.set('bitpay-app-encryption-key', {password: legacyKey});
  const key = await start();
  const root = modernRoot();
  const release = transferRecord().release;
  mockFiles.set(
    '/cache/bitpay/redux/persist-root.json',
    'changed permitted backup',
  );
  mockFiles.set(
    '/cache/bitpay/redux/persist-root.json.tmp',
    'late disposable temp',
  );
  mockFileReads.length = 0;
  mockBookkeepingReads.length = 0;
  mockEvents.length = 0;
  mockWarm = false;
  jest.doMock('./vault-retirement-policy', () => ({
    LEGACY_RETIREMENT_ENABLED: true,
  }));
  jest.resetModules();
  expect((await start()) === key).toBe(true);
  expect(transferRecord().phase).toBe('retired');
  expect(transferRecord().release).toEqual(release);
  expect(modernRoot() === root).toBe(true);
  expect(mockPrimaryReads).toBe(1);
  expect(mockEvents.includes('open:mmkv.default')).toBe(false);
  expect(mockFileReads).toEqual([]);
  expect(mockBookkeepingReads).toEqual([]);
  expect(mockRows.has('persist:root')).toBe(false);
  expect(mockFiles.has(oldPair) || mockFiles.has(oldPair + '.crc')).toBe(false);
  expect(mockCredentials.has('bitpay-app-encryption-key')).toBe(false);
  expect(mockWarnings).toEqual([]);
});

it('D12: enabled warm cleanup keeps the existing pending warning', async () => {
  seed();
  await start();
  expectNoRetirementAfterActivation();
  expect(transferRecord().phase).toBe('active');
  jest.resetModules();
  await start();
  expect(mockWarnings).toEqual([
    'Vault migration deferred: CLEANUP_DEFERRED (cleanup)',
  ]);
  expect(transferRecord().phase).toBe('active');
});

it('Native reader: uses ordinary writable open and transfers the healthy primary', async () => {
  seed();
  mockFiles.set('/cache/bitpay/redux/persist-root.json', fixture.raw);
  await start();
  expect(mockEvents.includes('legacy:readOnly:false')).toBe(true);
  expect(transferRecord().copies.root).toBe('mmkv');
  expect(mockBookkeepingReads).toEqual([]);
});

it.each([
  [0, 0, 0, 4, 0],
  [0, 0, 0, 4, 2], // byte-identical files despite failed native loading
  [4, 4, 4, 4, 0], // ordinary recovery to the empty map placeholder
  [1, 2, 3, 4, 2], // bounds, not a whitelist of example sizes
  [4, 900, 900, 2, 2], // pre-actual-size metadata ignores these fields
  [4, 4, 4, 6, 2], // pinned loader normalizes future metadata to version 3
])(
  'Native reader: proves no live entries from sizes %i/%i/%i, version %i, silent failures %i',
  async (header, current, last, version, failures) => {
    bookkeep(header, current, last, version);
    mockSilentPrimaryFailures = failures;
    mockCredentials.set('bitpay-app-encryption-key', {password: legacyKey});
    await start();
    expect(mockPrimaryReads).toBe(1);
    expect(mockBookkeepingReads).toEqual([
      [oldPair, 4, 0, 'base64'],
      [oldPair + '.crc', 36, 0, 'base64'],
    ]);
    expect(transferRecord().copies.root).toBe(null);
    expect(transferRecord().release.data).toBe(true);
    expect(transferRecord().release.crc).toBe(true);
    expect(mockFiles.has(oldPair)).toBe(true);
    jest.resetModules();
    mockWarm = false;
    await start();
    expect(mockFiles.has(oldPair)).toBe(false);
    expect(mockCredentials.has('bitpay-app-encryption-key')).toBe(false);
    expect(mockPrimaryReads).toBe(1);
  },
);

it.each(['main', 'bak', 'none'])(
  'Native reader: unresolved partial-open result uses %s or stops, preserving both files and the credential',
  async fallback => {
    seed();
    bookkeep(0, 5338, 4); // section 7: native reset the header, metadata still recovers the wallet
    mockSilentPrimaryFailures = 2;
    mockCredentials.set('bitpay-app-encryption-key', {password: legacyKey});
    if (fallback !== 'none')
      mockFiles.set(
        '/cache/bitpay/redux/persist-root.json' +
          (fallback === 'bak' ? '.bak' : ''),
        fixture.raw,
      );
    if (fallback === 'none') {
      await fails(start);
      expect(mockEvents.includes('control:active')).toBe(false);
      expect(mockEvents.some(e => e.startsWith('key:write'))).toBe(false);
    } else {
      const key = await start();
      const {decodeSnapshot} = require('./vault-codec');
      expect(
        isEqual(decodeSnapshot(modernRoot(), key).payload, fixture.state),
      ).toBe(true);
      expect(transferRecord().copies.root).toBe(fallback);
      expect(transferRecord().release.data).toBe(false);
      expect(transferRecord().release.crc).toBe(false);
      const reads = mockBookkeepingReads.length;
      jest.resetModules();
      mockWarm = false;
      mockSilentPrimaryFailures = 0; // real access would now recover; activation must not reimport
      await start();
      expect(mockBookkeepingReads.length).toBe(reads);
      expect(transferRecord().phase).toBe('active');
    }
    expect(mockPrimaryReads).toBe(2);
    expect(mockFiles.has(oldPair) && mockFiles.has(oldPair + '.crc')).toBe(
      true,
    );
    expect(mockCredentials.has('bitpay-app-encryption-key')).toBe(true);
    expect(
      mockStores.get('mmkv.default')!.get('persist:root') === fixture.raw,
    ).toBe(true);
    expect(mockEvents.some(e => e.startsWith('file:unlink:' + oldPair))).toBe(
      false,
    );
  },
);

it('Native reader: a silent first failure gets one immediate retry and selects the recovered primary', async () => {
  seed();
  bookkeep(5338, 5338, 4);
  mockSilentPrimaryFailures = 1;
  mockFiles.set('/cache/bitpay/redux/persist-root.json', fixture.raw);
  await start();
  expect(mockPrimaryReads).toBe(2);
  expect(transferRecord().copies.root).toBe('mmkv');
  expect(transferRecord().release.data).toBe(true);
});

it.each([
  [5, 0, 0, 4],
  [0, 5, 0, 4],
  [0, 0, 5, 4],
  [5035, 5035, 4, 4], // legitimate empty journal after deleting its final key: not independently proved
  [0, 5, 0, 3],
  [0, 0, 5, 3],
])(
  'Native reader: cannot certify empty with a recoverable size %i/%i/%i (version %i)',
  async (header, current, last, version) => {
    bookkeep(header, current, last, version);
    await fails(start);
    expect(mockPrimaryReads).toBe(2);
    expect(mockEvents.includes('control:active')).toBe(false);
    expect(mockFiles.has(oldPair) && mockFiles.has(oldPair + '.crc')).toBe(
      true,
    );
  },
);

it.each([
  'data read',
  'crc read',
  'short data',
  'short crc',
  'missing crc',
  'key list',
])('Native reader: %s cannot establish logical emptiness', async kind => {
  bookkeep(0, 0, 0);
  if (kind === 'data read') mockBookkeepingFailure = oldPair;
  if (kind === 'crc read') mockBookkeepingFailure = oldPair + '.crc';
  if (kind === 'short data') mockFiles.set(oldPair, Buffer.alloc(3));
  if (kind === 'short crc') mockFiles.set(oldPair + '.crc', Buffer.alloc(35));
  if (kind === 'missing crc') mockFiles.delete(oldPair + '.crc');
  if (kind === 'key list') mockLegacyKeysFailure = true;
  await fails(start);
  expect(mockEvents.includes('control:active')).toBe(false);
  expect(mockFiles.has(oldPair)).toBe(true);
  expect(mockPrimaryReads).toBe(kind === 'missing crc' ? 0 : 2);
});

it.each(['persist:logs', 'unknown'])(
  'Native reader: an inspected %s entry is not an empty native result',
  async entry => {
    bookkeep(321, 321, 4);
    mockStores.set('mmkv.default', new Map([[entry, 'synthetic value']]));
    await start();
    expect(mockBookkeepingReads).toEqual([]);
    expect(transferRecord().release.data).toBe(entry === 'persist:logs');
  },
);

it('D14: same-process Retry may retire after active-record read-back failed', async () => {
  const outer = JSON.parse(fixture.raw);
  outer.APP = JSON.stringify(
    JSON.stringify({
      ...fixture.state.APP,
      migrationMMKVStorageComplete: false,
    }),
  );
  const source = JSON.stringify(outer);
  mockRows.set('persist:root', source);
  const {MMKV} = require('react-native-mmkv');
  const read = MMKV.prototype.getString;
  let failAcknowledgment = true;
  const spy = jest
    .spyOn(MMKV.prototype, 'getString')
    .mockImplementation(function (this: {id: string}, ...args: unknown[]) {
      const raw = read.apply(this, args);
      if (
        this.id === 'bitpay.wallet.transfer.v2' &&
        failAcknowledgment &&
        typeof raw === 'string' &&
        JSON.parse(raw).phase === 'active'
      ) {
        failAcknowledgment = false;
        throw new Error('synthetic activation acknowledgment failure');
      }
      return raw;
    });
  try {
    await expect(start()).rejects.toThrow('STARTUP_FAILURE');
    expectNoRetirementAfterActivation();
    expect(transferRecord().phase).toBe('active');
    expect(mockRows.get('persist:root') === source).toBe(true);
    const modern = modernRoot();
    const key = mockCredentials.get('bitpay-app-vault-key-v1');
    await start(); // Failure clears the cached promise; no reload or cold reset.
    expect(mockRows.has('persist:root')).toBe(false);
    expect(transferRecord().phase).toBe('retired');
    expect(modernRoot() === modern).toBe(true);
    expect(mockCredentials.get('bitpay-app-vault-key-v1')).toBe(key);
    expect(
      mockEvents.filter(event => event === 'key:write:bitpay-app-vault-key-v1'),
    ).toHaveLength(1);
    expect(mockEvents.includes('open:mmkv.default')).toBe(false);
    expect(mockWarnings).toEqual([]);
  } finally {
    spy.mockRestore();
  }
});

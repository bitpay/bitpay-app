// Native boundaries only: Redux Persist, vault preparation, codecs, transforms,
// reducers and wallet-secrets lifecycle all run their production implementations.
export const createStoreModel = () => {
  jest.resetModules();
  const stores = new Map<string, Map<string, any>>();
  const instances = new Map<string, any>();
  const events: Array<{
    id: string;
    key: string;
    phase?: string;
    modernKeys?: string[];
  }> = [];
  const data = (id: string) => {
    if (!stores.has(id)) stores.set(id, new Map());
    return stores.get(id)!;
  };
  const instance = (id: string) => {
    if (!instances.has(id)) {
      const values = data(id);
      instances.set(id, {
        getString: jest.fn(key =>
          typeof values.get(key) === 'string' ? values.get(key) : undefined,
        ),
        getBoolean: jest.fn(key =>
          typeof values.get(key) === 'boolean' ? values.get(key) : undefined,
        ),
        getAllKeys: jest.fn(() => [...values.keys()]),
        contains: jest.fn(key => values.has(key)),
        set: jest.fn((key, value) => {
          const phase =
            id === 'bitpay.wallet.transfer.v2'
              ? JSON.parse(value).phase
              : undefined;
          events.push({
            id,
            key,
            phase,
            modernKeys: [...data('bitpay.wallet.v2').keys()],
          });
          values.set(key, value);
        }),
        delete: jest.fn(key => values.delete(key)),
      });
    }
    return instances.get(id)!;
  };
  const MMKV = jest.fn((options?: {id?: string}) =>
    instance(options?.id ?? 'mmkv.default'),
  );
  jest.doMock('react-native-mmkv', () => ({MMKV}));
  const files = new Map<string, string>();
  const fs = {
    CachesDirectoryPath: '/cache',
    TemporaryDirectoryPath: '/temporary',
    LibraryDirectoryPath: '/library',
    exists: jest.fn(async (path: string) => files.has(path)),
    mkdir: jest.fn(async () => {}),
    readFile: jest.fn(async (path: string) => {
      if (!files.has(path)) throw new Error('missing file');
      return files.get(path)!;
    }),
    writeFile: jest.fn(async (path: string, value: string) => {
      files.set(path, value);
    }),
    unlink: jest.fn(async (path: string) => {
      files.delete(path);
    }),
    moveFile: jest.fn(async (from: string, to: string) => {
      if (!files.has(from)) throw new Error('missing file');
      files.set(to, files.get(from)!);
      files.delete(from);
    }),
    stat: jest.fn(async (path: string) => ({
      size: Buffer.byteLength(files.get(path)!),
    })),
  };
  jest.doMock('react-native-fs', () => fs);
  const credentials = new Map<string, any>();
  const keychain = {
    getGenericPassword: jest.fn(
      async ({service}: any) => credentials.get(service) ?? false,
    ),
    setGenericPassword: jest.fn(
      async (username: string, password: string, options: any) => {
        credentials.set(options.service, {
          username,
          password,
          storage: options.storage,
        });
        return {storage: options.storage};
      },
    ),
    resetGenericPassword: jest.fn(async ({service}: any) => {
      credentials.delete(service);
      return true;
    }),
    ACCESSIBLE: {AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'local'},
    STORAGE_TYPE: {AES_GCM_NO_AUTH: 'aes-gcm'},
    SECURITY_LEVEL: {SECURE_SOFTWARE: 'software'},
  };
  jest.doMock('react-native-keychain', () => keychain);
  const getUniqueId = jest.fn(() => 'synthetic-device-id');
  jest.doMock('react-native-device-info', () => ({
    ...require('react-native-device-info/jest/react-native-device-info-mock'),
    getUniqueId,
  }));
  jest.doMock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(async () => null),
    getAllKeys: jest.fn(async () => []),
    removeItem: jest.fn(),
  }));
  jest.doMock('@env', () => ({DISABLE_DEVELOPMENT_LOGGING: 'true'}));
  jest.doMock('../../src/constants/config', () => ({
    APP_NAME_UPPERCASE: 'BitPay',
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
  jest.doMock('../../src/utils/helper-methods', () => ({
    getErrorString: String,
  }));
  const bwc = {
    createKey: jest.fn(({seedData}: any) => ({toObj: () => seedData})),
    getClient: jest.fn((raw: string) => ({credentials: JSON.parse(raw)})),
  };
  jest.doMock('../../src/lib/bwc', () => ({
    BwcProvider: {getInstance: () => bwc},
  }));
  jest.doMock('../../src/store/wallet/utils/wallet', () => ({
    checkPrivateKeyEncrypted: () => false,
    buildWalletObj: () => ({}),
  }));
  jest.doMock('../../src/store/portfolio', () => ({
    clearWalletPortfolioDataWithRuntime: jest.fn(),
  }));
  jest.doMock('../../src/managers/LogManager', () => ({
    logManager: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      addLog: jest.fn(),
    },
  }));
  const rn = require('react-native');
  const originalNativeLookup = rn.TurboModuleRegistry.getEnforcing;
  const claim = jest.fn(() => false);
  jest
    .spyOn(rn.TurboModuleRegistry, 'getEnforcing')
    .mockImplementation((name: any) => {
      if (name === 'MmkvPlatformContext')
        return {
          getBaseDirectory: () => '/mmkv',
          getAppGroupDirectory: () => undefined,
        };
      if (name === 'MmkvCxx') return {claimLegacyRetirement: claim};
      return originalNativeLookup(name);
    });
  const rehydrates: any[] = [];
  const persistors: Array<{pause: () => void}> = [];
  const reduxPersist = require('redux-persist');
  const persistStore = reduxPersist.persistStore;
  jest
    .spyOn(reduxPersist, 'persistStore')
    .mockImplementation((store: any, options: any, callback: any) => {
      const dispatch = store.dispatch;
      store.dispatch = (action: any) => {
        if (action.type === 'persist/REHYDRATE') rehydrates.push(action);
        return dispatch(action);
      };
      const persistor = persistStore(store, options, callback);
      persistors.push(persistor);
      return persistor;
    });
  const api: typeof import('../../src/store') = require('../../src/store');
  const active = (key = Buffer.alloc(32, 71).toString('base64')) => {
    data('bitpay.wallet.transfer.v2').set(
      'transfer',
      JSON.stringify({
        version: 3,
        layout: 'bitpay.wallet.v2',
        phase: 'active',
        owned: true,
        copies: {root: 'mmkv', main: null, bak: null},
        release: {
          data: true,
          crc: true,
          async: false,
          main: false,
          bak: false,
          temp: true,
        },
      }),
    );
    credentials.set('bitpay-app-vault-key-v1', {
      password: key,
      storage: 'aes-gcm',
    });
    return key;
  };
  return {
    api,
    stores,
    data,
    instance,
    MMKV,
    events,
    files,
    fs,
    credentials,
    keychain,
    getUniqueId,
    bwc,
    rehydrates,
    active,
    claim,
    stop: () => persistors.forEach(p => p.pause()),
  };
};

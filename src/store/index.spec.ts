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

import * as Keychain from 'react-native-keychain';
import RNFS from 'react-native-fs';
import {encryptTransform} from 'redux-persist-transform-encrypt';
import getStore, {getEncryptionKey, storage} from './index';
import * as backups from './backup/fs-backup';
import {flushPersistor} from './persistor';
import {initialWalletSecretsState} from './wallet-secrets/wallet-secrets.reducer';
import {migrateWalletSecrets} from './wallet-secrets/wallet-secrets.effects';

const readStored = (storage.getString as jest.Mock).getMockImplementation()!;

const getRehydratedStore = async () => {
  const result = await getStore();
  await new Promise<void>(resolve => {
    if (result.persistor.getState().bootstrapped) {
      resolve();
      return;
    }
    const unsubscribe = result.persistor.subscribe(() => {
      if (result.persistor.getState().bootstrapped) {
        unsubscribe();
        resolve();
      }
    });
  });
  return result;
};

const persistedRoot = (pendingOnly: boolean) => {
  const secrets = pendingOnly
    ? {
        ...initialWalletSecretsState,
        pendingJoinerSession: {
          sessionId: 'pending-session',
          partyKey: {xPrivKey: 'private-party-key'},
          createdAt: 1,
        },
      }
    : {
        ...initialWalletSecretsState,
        byKeyId: {key1: {mnemonic: 'private-mnemonic'}},
      };
  const encrypted = encryptTransform({secretKey: 'original-key'}).in(
    secrets,
    'WALLET_SECRETS',
    {},
  );
  return JSON.stringify({
    WALLET: JSON.stringify(
      JSON.stringify({
        secretsMigrated: true,
        keys: pendingOnly ? {} : {key1: {id: 'key1', wallets: []}},
      }),
    ),
    WALLET_SECRETS: JSON.stringify(encrypted),
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (storage.getString as jest.Mock).mockImplementation(readStored);
  (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
    password: 'wrong-key',
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

it('does not replace the encryption key when Keychain retrieval fails', async () => {
  const error = new Error('Keychain unavailable');
  (Keychain.getGenericPassword as jest.Mock).mockRejectedValueOnce(error);

  await expect(getEncryptionKey()).rejects.toBe(error);

  expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
});

it.each([
  ['wrong key with wallets', () => persistedRoot(false)],
  ['wrong key with only a pending session', () => persistedRoot(true)],
  [
    'missing encrypted secrets',
    () => {
      const root = JSON.parse(persistedRoot(true));
      delete root.WALLET_SECRETS;
      return JSON.stringify(root);
    },
  ],
  ['invalid persisted JSON', () => '{invalid-json'],
  ['MMKV read failure without a backup', () => new Error('MMKV read failed')],
] as const)('preserves persisted data after %s', async (_name, buildRoot) => {
  const input = buildRoot();
  const raw = input instanceof Error ? persistedRoot(true) : input;
  storage.set('persist:root', raw);
  (storage.set as jest.Mock).mockClear();
  if (input instanceof Error) {
    (storage.getString as jest.Mock).mockImplementation((key: string) => {
      if (key === 'persist:root') {
        throw input;
      }
      return readStored(key);
    });
    (RNFS.exists as jest.Mock).mockResolvedValue(false);
  }
  const removeBackups = jest.spyOn(backups, 'removePersistRootBackups');
  const {store, persistor} = await getRehydratedStore();

  await expect(flushPersistor()).rejects.toBeInstanceOf(Error);
  await store.dispatch(
    migrateWalletSecrets(
      flushPersistor,
      backups.removePersistRootBackups,
      backups.resumePersistRootBackups,
    ) as any,
  );
  await persistor.flush();

  expect(readStored('persist:root')).toBe(raw);
  expect(
    (storage.set as jest.Mock).mock.calls.filter(
      ([key]) => key === 'persist:root',
    ),
  ).toEqual([]);
  expect(storage.delete).not.toHaveBeenCalled();
  expect(RNFS.writeFile).not.toHaveBeenCalled();
  expect(RNFS.unlink).not.toHaveBeenCalled();
  expect(removeBackups).not.toHaveBeenCalled();
  persistor.pause();
});

it('rehydrates and persists the same encrypted state with the correct key', async () => {
  (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
    password: 'original-key',
  });
  storage.set('persist:root', persistedRoot(true));
  (storage.set as jest.Mock).mockClear();
  const {store, persistor} = await getRehydratedStore();

  expect(store.getState().WALLET.pendingJoinerSession?.partyKey.xPrivKey).toBe(
    'private-party-key',
  );
  await flushPersistor();
  expect(storage.set).toHaveBeenCalledWith('persist:root', expect.any(String));
  persistor.pause();
});

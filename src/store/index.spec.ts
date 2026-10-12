import {createStoreModel} from '../../test/vault/store-model';

let h: ReturnType<typeof createStoreModel>;
let key: string;
beforeEach(() => {
  jest.useFakeTimers();
  h = createStoreModel();
  key = h.active();
});
afterEach(() => {
  h.stop();
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});
const root = (pendingOnly: boolean) => {
  const {encodeSnapshot} = require('./vault-codec');
  return encodeSnapshot(
    {
      WALLET: {
        secretsMigrated: true,
        keys: pendingOnly ? {} : {fixture: {id: 'fixture', wallets: []}},
      },
      WALLET_SECRETS: {
        byKeyId: pendingOnly ? {} : {fixture: {mnemonic: 'synthetic mnemonic'}},
        byKeyIdAndWalletId: {},
        tssSessionByKeyId: {},
        pendingJoinerSession: pendingOnly
          ? {
              sessionId: 'pending',
              partyKey: {xPrivKey: 'synthetic-party-key'},
              createdAt: 1,
            }
          : null,
      },
      _persist: {version: -1, rehydrated: true},
    },
    key,
  );
};

it('does not replace the modern key or use a device ID when Keychain retrieval fails', async () => {
  h.keychain.getGenericPassword.mockRejectedValueOnce(
    new Error('Keychain unavailable'),
  );
  await expect(h.api.getEncryptionKey()).rejects.toThrow('MODERN_KEY_FAILURE');
  expect(h.keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(h.getUniqueId).not.toHaveBeenCalled();
});

it.each([
  'wrong key with wallets',
  'wrong key with only a pending session',
  'missing encrypted secrets',
  'invalid persisted JSON',
  'MMKV read failure without a backup',
])('preserves persisted data and pauses after %s', async name => {
  let raw = root(name !== 'wrong key with wallets');
  if (name.startsWith('wrong key'))
    h.active(Buffer.alloc(32, 72).toString('base64'));
  if (name === 'missing encrypted secrets') {
    const parsed = JSON.parse(raw);
    delete parsed.WALLET_SECRETS;
    raw = JSON.stringify(parsed);
  }
  if (name === 'invalid persisted JSON') raw = '{invalid-json';
  h.data('bitpay.wallet.v2').set('persist:root', raw);
  if (name === 'MMKV read failure without a backup')
    h.instance('bitpay.wallet.v2').getString.mockImplementation(() => {
      throw new Error('synthetic read failure');
    });
  await expect(h.api.default()).rejects.toBeInstanceOf(Error);
  // Native crypto errors can belong to Node's realm rather than Jest's realm.
  await expect(require('./persistor').flushPersistor()).rejects.toHaveProperty(
    'message',
  );
  expect(h.data('bitpay.wallet.v2').get('persist:root')).toBe(raw);
  expect(h.instance('bitpay.wallet.v2').set).not.toHaveBeenCalled();
  expect(h.instance('bitpay.wallet.v2').delete).not.toHaveBeenCalled();
  expect(h.fs.writeFile).not.toHaveBeenCalled();
  expect(h.fs.unlink).not.toHaveBeenCalled();
  expect(h.getUniqueId).not.toHaveBeenCalled();
});

it('drops the removed CARD slice from persisted state', async () => {
  const {encryptPersistValue} = require('./transforms/encrypt');
  const persisted = JSON.parse(root(true));
  persisted.CARD = JSON.stringify(
    encryptPersistValue({cards: {livenet: [{id: 'c1'}]}}, key, 'persist:CARD'),
  );
  h.data('bitpay.wallet.v2').set('persist:root', JSON.stringify(persisted));
  const consoleError = jest.spyOn(console, 'error').mockImplementation();
  const {store} = await h.api.default();

  expect(store.getState()).not.toHaveProperty('CARD');
  await require('./persistor').flushPersistor();
  expect(
    JSON.parse(h.data('bitpay.wallet.v2').get('persist:root')),
  ).not.toHaveProperty('CARD');
  expect(consoleError).not.toHaveBeenCalledWith(
    expect.stringContaining('Unexpected key'),
  );
});

it('rehydrates and persists the same encrypted state with the correct key', async () => {
  h.data('bitpay.wallet.v2').set('persist:root', root(true));
  const {store} = await h.api.default();
  expect(store.getState().WALLET.pendingJoinerSession?.partyKey.xPrivKey).toBe(
    'synthetic-party-key',
  );
  await require('./persistor').flushPersistor();
  expect(h.instance('bitpay.wallet.v2').set).toHaveBeenCalledWith(
    'persist:root',
    expect.any(String),
  );
  expect(h.rehydrates).toHaveLength(1);
  expect(h.rehydrates[0].err).toBeUndefined();
});

it('reports a primary write failure and makes flushPersistor reject', async () => {
  h.data('bitpay.wallet.v2').set('persist:root', root(true));
  const {store} = await h.api.default();
  const error = new Error('synthetic write failure');
  h.instance('bitpay.wallet.v2').set.mockImplementation(() => {
    throw error;
  });
  store.dispatch({type: 'APP/SET_CURRENT_ROUTE', payload: 'test'} as any);
  await expect(require('./persistor').flushPersistor()).rejects.toBe(error);
  expect(require('@sentry/react-native').captureException).toHaveBeenCalledWith(
    error,
    {level: 'error'},
  );
});

it('rejects with the read error when no backup restores, but a clean absence stays empty', async () => {
  await h.api.getEncryptionKey();
  const error = new Error('synthetic primary read failure');
  h.instance('bitpay.wallet.v2').getString.mockImplementationOnce(() => {
    throw error;
  });
  await expect(h.api.reduxStorage.getItem('persist:root')).rejects.toBe(error);
  await expect(h.api.reduxStorage.getItem('persist:root')).resolves.toBeNull();
});

it('restores a readable modern backup after a primary read failure', async () => {
  await h.api.getEncryptionKey();
  const raw = root(true);
  h.files.set('/cache/bitpay/redux-v2/persist-root.json', raw);
  h.instance('bitpay.wallet.v2').getString.mockImplementationOnce(() => {
    throw new Error('read failure');
  });
  await expect(h.api.reduxStorage.getItem('persist:root')).resolves.toBe(raw);
  expect(h.data('bitpay.wallet.v2').get('persist:root')).toBe(raw);
});

it('gates ordinary reads, writes, restore and backup operations before activation', async () => {
  const backup = require('./backup/fs-backup');
  const raw = root(true);
  h.files.set('/cache/bitpay/redux-v2/persist-root.json', raw);
  expect(() => h.api.reduxStorage.getItem('persist:root')).toThrow(
    'not active',
  );
  await expect(h.api.reduxStorage.setItem('persist:root', raw)).rejects.toThrow(
    'not active',
  );
  expect(() => h.api.reduxStorage.removeItem('persist:root')).toThrow(
    'not active',
  );
  expect(() => backup.backupPersistRoot(raw)).toThrow('not active');
  expect(() => backup.removePersistRootBackups()).toThrow('not active');
  expect(() => backup.resumePersistRootBackups()).toThrow('not active');
  await expect(backup.readBackupPersistRoot()).rejects.toThrow('not active');
  expect(h.instance('bitpay.wallet.v2').set).not.toHaveBeenCalled();
  expect(h.fs.readFile).not.toHaveBeenCalled();
  expect(h.fs.writeFile).not.toHaveBeenCalled();
  expect(h.fs.unlink).not.toHaveBeenCalled();
});

it('rejects legacy CBC on the ordinary active reader even with the same valid key', async () => {
  const Aes = require('crypto-js/aes.js');
  const payload = {
    WALLET: {keys: {}},
    _persist: {version: -1, rehydrated: true},
  };
  const raw = JSON.stringify(
    Object.fromEntries(
      Object.entries(payload).map(([name, value]) => [
        name,
        JSON.stringify(Aes.encrypt(JSON.stringify(value), key).toString()),
      ]),
    ),
  );
  h.data('bitpay.wallet.v2').set('persist:root', raw);
  await expect(h.api.default()).rejects.toBeInstanceOf(Error);
  expect(h.data('bitpay.wallet.v2').get('persist:root')).toBe(raw);
  expect(h.instance('bitpay.wallet.v2').set).not.toHaveBeenCalled();
  expect(h.getUniqueId).not.toHaveBeenCalled();
  expect(h.keychain.setGenericPassword).not.toHaveBeenCalled();
});

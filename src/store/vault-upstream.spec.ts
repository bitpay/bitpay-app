import isEqual from 'lodash.isequal';
import type {RootState} from './index';
import {createStoreModel} from '../../test/vault/store-model';

const upstream = require('../../test/vault/fixtures/upstream-6c84-secrets.json');
const historical = require('../../test/vault/fixtures/legacy-14.32.json').cases;
const cases: Array<[string, string, string]> = [
  ...Object.entries(historical).map(
    ([name, value]: [string, any]): [string, string, string] => [
      '14.32 ' + name,
      value.raw,
      'synthetic-legacy-fixture-key',
    ],
  ),
  ['upstream completed', upstream.completed, upstream.oldKey],
  ['upstream intermediate', upstream.intermediate, upstream.oldKey],
];
let h: ReturnType<typeof createStoreModel>;
beforeEach(() => {
  jest.useFakeTimers();
  h = createStoreModel();
});
afterEach(() => {
  h.stop();
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});
const same = (a: unknown, b: unknown) => expect(isEqual(a, b)).toBe(true);
const prepare = async (raw: string, oldKey: string) => {
  h.data('mmkv.default').set('persist:root', raw);
  h.data('mmkv.default').set('persist:logs', 'retained old standalone logs');
  h.files.set('/mmkv/mmkv.default', 'synthetic native data');
  h.files.set('/mmkv/mmkv.default.crc', 'synthetic native metadata');
  h.credentials.set('bitpay-app-encryption-key', {password: oldKey});
  const key = await h.api.getEncryptionKey();
  expect(key).not.toBe(oldKey);
  same([...h.data('bitpay.wallet.v2').keys()], ['persist:root']);
  expect(h.claim).not.toHaveBeenCalled();
  expect(h.fs.unlink).not.toHaveBeenCalled();
  expect(h.data('mmkv.default').get('persist:root')).toBe(raw);
  expect(h.events.find(e => e.phase === 'active')?.modernKeys).toEqual([
    'persist:root',
  ]);
  return key;
};

it.each(cases)(
  '%s: complete decoded source equals converted payload',
  async (_name, raw, oldKey) => {
    const {decodeSnapshot} = require('./vault-codec');
    const before = decodeSnapshot(raw, oldKey).payload;
    const key = await prepare(raw, oldKey);
    const converted = h.data('bitpay.wallet.v2').get('persist:root');
    same(decodeSnapshot(converted, key).payload, before);
    if (before.WALLET_SECRETS) {
      const envelope = JSON.parse(JSON.parse(converted).WALLET_SECRETS);
      expect(envelope.startsWith('persist-aesgcm-v1:')).toBe(true);
      expect(
        require('./transforms/persist-encryption').unencryptedPersistStores.has(
          'WALLET_SECRETS',
        ),
      ).toBe(false);
    }
  },
);

it.each(cases)(
  '%s: real modern reader emits a successful expected REHYDRATE',
  async (_name, raw, oldKey) => {
    const expected = require('./vault-codec').decodeSnapshot(
      raw,
      oldKey,
    ).payload;
    await prepare(raw, oldKey);
    const {store} = await h.api.default();
    expect(h.rehydrates).toHaveLength(1);
    const action = h.rehydrates[0];
    expect(action.key).toBe('root');
    expect(action.err).toBeUndefined();
    expect(action.payload.WALLET.secretsMigrated).toBe(
      expected.WALLET.secretsMigrated,
    );
    same(action.payload.WALLET_SECRETS, expected.WALLET_SECRETS);
    expect(
      (store.getState() as unknown as RootState).WALLET.keys.fixture,
    ).toBeDefined();
    await expect(
      require('./persistor').flushPersistor(),
    ).resolves.toBeUndefined();
    expect(
      require('@sentry/react-native').captureException,
    ).not.toHaveBeenCalled();
  },
);

it.each(cases)(
  '%s: upstream lifecycle restores and migrates every secret category',
  async (name, raw, oldKey) => {
    const decoded = require('./vault-codec').decodeSnapshot(
      raw,
      oldKey,
    ).payload;
    const expectedKey = name.startsWith('upstream')
      ? upstream.key
      : decoded.WALLET.keys.fixture;
    const expectedPending = name.startsWith('upstream')
      ? upstream.pendingJoinerSession
      : null;
    await prepare(raw, oldKey);
    const {store} = await h.api.default();
    const effects = require('./wallet-secrets/wallet-secrets.effects');
    if (!decoded.WALLET.secretsMigrated) {
      const dispatch = jest.fn();
      effects.rehydrateWalletSecrets()(dispatch, store.getState, undefined);
      expect(dispatch).not.toHaveBeenCalled();
      expect(
        (store.getState() as unknown as RootState).WALLET.secretsMigrated,
      ).toBe(false);
    }
    const backup = require('./backup/fs-backup');
    await store.dispatch(
      effects.migrateWalletSecrets(
        require('./persistor').flushPersistor,
        backup.removePersistRootBackups,
        backup.resumePersistRootBackups,
      ),
    );
    const state = store.getState() as unknown as RootState;
    expect(state.WALLET.secretsMigrated).toBe(true);
    const restored = state.WALLET.keys.fixture;
    same(restored.properties, expectedKey.properties);
    same(restored.methods?.toObj(), expectedKey.properties);
    same(state.WALLET_SECRETS.byKeyId.fixture, expectedKey.properties);
    const {
      pickCredentialSecrets,
    } = require('./wallet-secrets/wallet-secrets.reducer');
    for (const wallet of expectedKey.wallets) {
      const loaded = restored.wallets.find(w => w.id === wallet.id)!;
      same(
        pickCredentialSecrets(loaded.credentials),
        pickCredentialSecrets(wallet.credentials),
      );
      same(
        state.WALLET_SECRETS.byKeyIdAndWalletId.fixture[wallet.id] ?? {},
        pickCredentialSecrets(wallet.credentials),
      );
    }
    same(restored.tssSession, expectedKey.tssSession);
    same(
      state.WALLET_SECRETS.tssSessionByKeyId.fixture,
      expectedKey.tssSession,
    );
    same(state.WALLET.pendingJoinerSession, expectedPending);
    same(state.WALLET_SECRETS.pendingJoinerSession, expectedPending);
    expect(h.bwc.createKey).toHaveBeenCalled();
    expect(
      require('@sentry/react-native').captureException,
    ).not.toHaveBeenCalled();
    expect(h.data('mmkv.default').get('persist:root')).toBe(raw);
    expect([...h.data('bitpay.wallet.v2').keys()]).toEqual(['persist:root']);
  },
);

it.each([
  ['completed', upstream.completed],
  ['intermediate', upstream.intermediate],
])(
  'D17: captured upstream %s omits caches in raw output and rehydrates reducer defaults',
  async (_name, raw) => {
    const source = JSON.parse(raw);
    for (const name of ['RATE', 'MARKET_STATS', 'SHOP_CATALOG', 'PORTFOLIO'])
      expect(Object.prototype.hasOwnProperty.call(source, name)).toBe(true);
    const {decodeSnapshot} = require('./vault-codec');
    const retained = decodeSnapshot(raw, upstream.oldKey).payload;
    const key = await prepare(raw, upstream.oldKey);
    const converted = h.data('bitpay.wallet.v2').get('persist:root');
    const output = JSON.parse(converted);
    for (const name of ['RATE', 'MARKET_STATS', 'PORTFOLIO_CHARTS'])
      expect(Object.prototype.hasOwnProperty.call(output, name)).toBe(false);
    for (const name of ['SHOP_CATALOG', 'PORTFOLIO', 'WALLET_SECRETS'])
      expect(Object.prototype.hasOwnProperty.call(output, name)).toBe(true);
    same(decodeSnapshot(converted, key).payload, retained);
    const {store} = await h.api.default();
    expect(h.rehydrates).toHaveLength(1);
    const action = h.rehydrates[0];
    expect(action.err).toBeUndefined();
    for (const name of ['RATE', 'MARKET_STATS', 'PORTFOLIO_CHARTS'])
      expect(Object.prototype.hasOwnProperty.call(action.payload, name)).toBe(
        false,
      );
    const state = store.getState() as unknown as RootState;
    const {rateReducer} = require('./rate/rate.reducer');
    const {marketStatsReducer} = require('./market-stats/market-stats.reducer');
    same(state.RATE, rateReducer(undefined, {type: '@@INIT'}));
    same(state.MARKET_STATS, marketStatsReducer(undefined, {type: '@@INIT'}));
    same(action.payload.SHOP_CATALOG, retained.SHOP_CATALOG);
    same(action.payload.PORTFOLIO, retained.PORTFOLIO);
    await expect(
      require('./persistor').flushPersistor(),
    ).resolves.toBeUndefined();
    expect(
      require('@sentry/react-native').captureException,
    ).not.toHaveBeenCalled();
  },
);

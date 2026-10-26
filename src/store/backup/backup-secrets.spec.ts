import {createStoreModel} from '../../../test/vault/store-model';
import type {RootState} from '../index';

const fixture = require('../../../test/vault/fixtures/upstream-6c84-secrets.json');
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

it('resumes backups after the real flagged flush and accepts a subsequent writer output', async () => {
  const key = h.active();
  const {reencryptSnapshot} = require('../vault-codec');
  h.data('bitpay.wallet.v2').set(
    'persist:root',
    reencryptSnapshot(fixture.intermediate, fixture.oldKey, key),
  );
  const {store} = await h.api.default();
  const backup = require('./fs-backup');
  const {flushPersistor} = require('../persistor');
  const {
    migrateWalletSecrets,
  } = require('../wallet-secrets/wallet-secrets.effects');
  const path = '/cache/bitpay/redux-v2/persist-root.json';
  const stages: string[] = [];
  const writes: string[] = [];
  await store.dispatch(
    migrateWalletSecrets(
      async () => {
        await flushPersistor();
        const raw = h.data('bitpay.wallet.v2').get('persist:root');
        writes.push(raw);
        const persistedWallet = JSON.parse(JSON.parse(JSON.parse(raw).WALLET));
        expect(persistedWallet.secretsMigrated).toBe(writes.length === 2);
        stages.push(writes.length === 1 ? 'first flush' : 'flagged flush');
        await backup.backupPersistRoot(raw);
        if (writes.length === 1) expect(h.files.has(path)).toBe(true);
      },
      async () => {
        await backup.removePersistRootBackups();
        stages.push('removed');
        expect(h.files.has(path)).toBe(false);
      },
      async () => {
        stages.push('resume');
        await backup.resumePersistRootBackups();
      },
    ),
  );
  const resumed = h.files.has(path);
  expect(stages).toEqual(['first flush', 'removed', 'flagged flush', 'resume']);
  expect(
    (store.getState() as unknown as RootState).WALLET.secretsMigrated,
  ).toBe(true);
  store.dispatch({
    type: 'WALLET/UPDATE_KEY_NAME',
    payload: {keyId: 'fixture', name: 'subsequent writer'},
  } as any);
  await flushPersistor();
  const subsequent = h.data('bitpay.wallet.v2').get('persist:root');
  expect(
    JSON.parse(JSON.parse(JSON.parse(subsequent).WALLET)).keys.fixture.keyName,
  ).toBe('subsequent writer');
  await backup.backupPersistRoot(subsequent);
  expect([resumed, h.files.has(path)]).toEqual([true, true]);
  const backedUp = JSON.parse(h.files.get(path)!);
  expect(backedUp.WALLET).toBe(JSON.parse(subsequent).WALLET);
  expect(backedUp.WALLET_SECRETS).toBe(JSON.parse(subsequent).WALLET_SECRETS);
  const healthyBackup = h.files.get(path);
  // The extra parse must not admit unflagged or malformed data after the move.
  await backup.backupPersistRoot(writes[0]);
  await backup.backupPersistRoot('{bad-json');
  expect(h.files.get(path)).toBe(healthyBackup);
});

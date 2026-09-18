import {
  initialWalletSecretsState,
  pickCredentialSecrets,
  walletSecretsReducer,
} from './wallet-secrets.reducer';
import {migrateWalletSecrets} from './wallet-secrets.effects';
import {WalletActionTypes} from '../wallet/wallet.types';

jest.mock('../../managers/LogManager', () => ({
  logManager: {info: jest.fn(), error: jest.fn(), debug: jest.fn()},
}));

const key = {
  id: 'key1',
  properties: {mnemonic: 'abandon abandon about', xPrivKey: 'xprv'},
  wallets: [
    {
      id: 'w1',
      credentials: {
        walletId: 'w1',
        xPubKey: 'xpub-public',
        requestPrivKey: 'request-priv-key',
        walletPrivKey: 'wallet-priv-key',
      },
    },
  ],
};

describe('wallet secrets slice', () => {
  it('picks only the secret credential fields', () => {
    expect(pickCredentialSecrets(key.wallets[0].credentials)).toEqual({
      requestPrivKey: 'request-priv-key',
      walletPrivKey: 'wallet-priv-key',
    });
  });

  it('absorbs the secrets of a newly created key', () => {
    const next = walletSecretsReducer(initialWalletSecretsState, {
      type: WalletActionTypes.SUCCESS_CREATE_KEY,
      payload: {key},
    } as any);

    expect(next.byKeyId.key1).toEqual(key.properties);
    expect(next.byWalletId.w1.requestPrivKey).toBe('request-priv-key');
  });

  it('drops the secrets of a deleted key', () => {
    const withKey = walletSecretsReducer(initialWalletSecretsState, {
      type: WalletActionTypes.SUCCESS_CREATE_KEY,
      payload: {key},
    } as any);
    const next = walletSecretsReducer(withKey, {
      type: WalletActionTypes.DELETE_KEY,
      payload: {keyId: 'key1'},
    } as any);

    expect(next.byKeyId.key1).toBeUndefined();
  });
});

describe('migrateWalletSecrets', () => {
  const runMigration = async (flush: () => Promise<void>) => {
    const dispatched: any[] = [];
    const dispatch = (action: any) =>
      typeof action === 'function'
        ? action(dispatch, getState)
        : dispatched.push(action);
    const getState = () =>
      ({WALLET: {keys: {key1: key}, secretsMigrated: false}} as any);

    await migrateWalletSecrets(flush)(dispatch as any, getState, undefined);
    return dispatched;
  };

  it('only reports success after the secrets reached disk', async () => {
    const order: string[] = [];
    const dispatched = await runMigration(async () => {
      order.push('flush');
    });

    expect(dispatched[0].type).toBe(
      WalletActionTypes.SUCCESS_MIGRATE_WALLET_SECRETS,
    );
    expect(order).toEqual(['flush']);
    expect(dispatched[1].type).toBe(WalletActionTypes.SET_SECRETS_MIGRATED);
  });

  it('leaves the migration pending when the flush fails', async () => {
    const dispatched = await runMigration(async () => {
      throw new Error('disk full');
    });

    expect(
      dispatched.some(a => a.type === WalletActionTypes.SET_SECRETS_MIGRATED),
    ).toBe(false);
  });

  it('does nothing when it already ran', async () => {
    const dispatched: any[] = [];
    await migrateWalletSecrets(async () => {})(
      ((a: any) => dispatched.push(a)) as any,
      (() => ({WALLET: {keys: {}, secretsMigrated: true}})) as any,
      undefined,
    );

    expect(dispatched).toHaveLength(0);
  });
});

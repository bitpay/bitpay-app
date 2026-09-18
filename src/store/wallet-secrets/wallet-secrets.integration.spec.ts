jest.mock('../../managers/LogManager', () => ({
  logManager: {info: jest.fn(), error: jest.fn(), debug: jest.fn()},
}));

import {bindWalletKeys} from '../transforms/transforms';
import {
  initialWalletSecretsState,
  walletSecretsReducer,
} from './wallet-secrets.reducer';
import {migrateWalletSecrets} from './wallet-secrets.effects';
import {walletReducer} from '../wallet/wallet.reducer';

const SECRETS = [
  'abandon abandon about',
  'xprv-plaintext',
  'request-priv-key',
  'wallet-priv-key',
];

const buildKey = () => ({
  id: 'key1',
  properties: {mnemonic: SECRETS[0], xPrivKey: SECRETS[1]},
  wallets: [
    {
      id: 'w1',
      credentials: {
        xPubKey: 'xpub-public',
        requestPrivKey: SECRETS[2],
        walletPrivKey: SECRETS[3],
      },
    },
  ],
});

describe('wallet secrets — full cycle', () => {
  it('keeps the secrets out of the wallet payload once migrated', async () => {
    let wallet: any = {keys: {key1: buildKey()}, secretsMigrated: false};
    let secrets = initialWalletSecretsState;

    const before = JSON.stringify(bindWalletKeys.in!(wallet, 'WALLET', {}));
    SECRETS.forEach(secret => expect(before).toContain(secret));

    const dispatch = (action: any) => {
      secrets = walletSecretsReducer(secrets, action);
      wallet = walletReducer(wallet, action);
      return action;
    };
    await migrateWalletSecrets(async () => {})(
      dispatch as any,
      (() => ({WALLET: wallet})) as any,
      undefined,
    );

    expect(wallet.secretsMigrated).toBe(true);
    expect(secrets.byKeyId.key1).toEqual(buildKey().properties);
    expect(secrets.byWalletId.w1.requestPrivKey).toBe(SECRETS[2]);

    const after = JSON.stringify(bindWalletKeys.in!(wallet, 'WALLET', {}));
    SECRETS.forEach(secret => expect(after).not.toContain(secret));
    expect(after).toContain('xpub-public');

    expect(wallet.keys.key1.properties.mnemonic).toBe(SECRETS[0]);
    expect(wallet.keys.key1.wallets[0].credentials.requestPrivKey).toBe(
      SECRETS[2],
    );
  });

  it('keeps the secrets in the wallet payload when the flush fails', async () => {
    let wallet: any = {keys: {key1: buildKey()}, secretsMigrated: false};
    let secrets = initialWalletSecretsState;
    const dispatch = (action: any) => {
      secrets = walletSecretsReducer(secrets, action);
      wallet = walletReducer(wallet, action);
      return action;
    };

    await migrateWalletSecrets(async () => {
      throw new Error('disk full');
    })(dispatch as any, (() => ({WALLET: wallet})) as any, undefined);

    expect(wallet.secretsMigrated).toBe(false);
    const payload = JSON.stringify(bindWalletKeys.in!(wallet, 'WALLET', {}));
    SECRETS.forEach(secret => expect(payload).toContain(secret));
  });
});

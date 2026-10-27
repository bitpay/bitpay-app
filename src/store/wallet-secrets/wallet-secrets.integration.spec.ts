jest.mock('../../constants/config', () => ({
  BASE_BWS_URL: 'https://example.invalid',
  BLOCKCHAIN_EXPLORERS: Object.fromEntries(
    ['eth', 'matic', 'arb', 'base', 'op', 'sol'].map(chain => [
      chain,
      {livenet: '', testnet: ''},
    ]),
  ),
}));

jest.mock('../../utils/helper-methods', () => ({getErrorString: String}));
jest.mock('../log/initLogs', () => ({add: jest.fn()}));
jest.mock('../wallet/utils/wallet', () => ({
  buildWalletObj: jest.fn(() => ({})),
}));

jest.mock('../../managers/LogManager', () => ({
  logManager: {info: jest.fn(), error: jest.fn(), debug: jest.fn()},
}));
jest.mock('../transforms/transforms', () => {
  const actual = jest.requireActual('../transforms/transforms');
  return {
    ...actual,
    bootstrapKey: jest.fn((key: any) => key),
    bootstrapWallets: jest.fn((wallets: any[]) => wallets),
  };
});

import {bindWalletKeys} from '../transforms/transforms';
import {
  initialWalletSecretsState,
  walletSecretsReducer,
} from './wallet-secrets.reducer';
import {
  migrateWalletSecrets,
  rehydrateWalletSecrets,
} from './wallet-secrets.effects';
import {walletReducer} from '../wallet/wallet.reducer';

const SECRETS = [
  'abandon abandon about',
  'xprv-plaintext',
  '0000000000000000000000000000000000000000000000000000000000000001',
  'wallet-priv-key',
  'personal-encrypting-key',
  'shared-encrypting-key',
  'legacy-wallet-mnemonic',
  'legacy-encrypted-mnemonic',
  'legacy-entropy-source',
  'party-xpriv',
  'session-export',
  'ceremony-password',
  'secret-join-code',
  'pending-party-xpriv',
];

const buildKey = () => ({
  id: 'key1',
  properties: {mnemonic: SECRETS[0], xPrivKey: SECRETS[1]},
  wallets: [
    {
      id: 'w1',
      credentials: {
        xPubKey: 'xpub-public',
        requestPubKey:
          '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        requestPrivKey: SECRETS[2],
        walletPrivKey: SECRETS[3],
        personalEncryptingKey: SECRETS[4],
        sharedEncryptingKey: SECRETS[5],
        mnemonic: SECRETS[6],
        mnemonicEncrypted: SECRETS[7],
        entropySource: SECRETS[8],
      },
    },
  ],
  tssSession: {
    id: 'tss-session',
    partyKey: {xPrivKey: SECRETS[9]},
    sessionExport: SECRETS[10],
    password: SECRETS[11],
    copayers: [{partyId: 1, joinCode: SECRETS[12]}],
    status: 'ceremony_in_progress',
  },
});

const pendingJoinerSession = {
  sessionId: 'pending-session',
  partyKey: {xPrivKey: SECRETS[13]},
  createdAt: 1,
};

describe('wallet secrets — full cycle', () => {
  it('keeps the secrets out of the wallet payload once migrated', async () => {
    let wallet: any = {
      keys: {key1: buildKey()},
      pendingJoinerSession,
      secretsMigrated: false,
    };
    let secrets = initialWalletSecretsState;

    const before = JSON.stringify(bindWalletKeys.in!(wallet, 'WALLET', {}));
    SECRETS.forEach(secret => expect(before).toContain(secret));

    const dispatch = (action: any) => {
      secrets = walletSecretsReducer(secrets, action);
      wallet = walletReducer(wallet, action);
      return action;
    };
    await migrateWalletSecrets(
      async () => {},
      async () => {},
      async () => {},
    )(dispatch as any, (() => ({WALLET: wallet})) as any, undefined);

    expect(wallet.secretsMigrated).toBe(true);
    expect(secrets.byKeyId.key1).toEqual(buildKey().properties);
    expect(secrets.byKeyIdAndWalletId.key1.w1.requestPrivKey).toBe(SECRETS[2]);
    expect(secrets.tssSessionByKeyId.key1).toEqual(buildKey().tssSession);
    expect(secrets.pendingJoinerSession).toEqual(pendingJoinerSession);

    const after = JSON.stringify(bindWalletKeys.in!(wallet, 'WALLET', {}));
    SECRETS.forEach(secret => expect(after).not.toContain(secret));
    expect(after).toContain('xpub-public');

    expect(wallet.keys.key1.properties.mnemonic).toBe(SECRETS[0]);
    expect(wallet.keys.key1.wallets[0].credentials.requestPrivKey).toBe(
      SECRETS[2],
    );
    expect(wallet.keys.key1.tssSession.partyKey.xPrivKey).toBe(SECRETS[9]);
    expect(wallet.pendingJoinerSession.partyKey.xPrivKey).toBe(SECRETS[13]);
  });

  it('keeps the secrets in the wallet payload when the flush fails', async () => {
    let wallet: any = {
      keys: {key1: buildKey()},
      pendingJoinerSession,
      secretsMigrated: false,
    };
    let secrets = initialWalletSecretsState;
    const dispatch = (action: any) => {
      secrets = walletSecretsReducer(secrets, action);
      wallet = walletReducer(wallet, action);
      return action;
    };

    await migrateWalletSecrets(
      async () => {
        throw new Error('disk full');
      },
      async () => {},
      async () => {},
    )(dispatch as any, (() => ({WALLET: wallet})) as any, undefined);

    expect(wallet.secretsMigrated).toBe(false);
    const payload = JSON.stringify(bindWalletKeys.in!(wallet, 'WALLET', {}));
    SECRETS.forEach(secret => expect(payload).toContain(secret));
  });

  it('puts every secret back after a full persist and rehydrate round trip', async () => {
    let wallet: any = {
      keys: {key1: buildKey()},
      pendingJoinerSession,
      secretsMigrated: false,
    };
    let secrets = initialWalletSecretsState;
    const dispatch = (action: any) => {
      secrets = walletSecretsReducer(secrets, action);
      wallet = walletReducer(wallet, action);
      return action;
    };
    const getState = () => ({WALLET: wallet, WALLET_SECRETS: secrets});

    await migrateWalletSecrets(
      async () => {},
      async () => {},
      async () => {},
    )(dispatch as any, getState as any, undefined);

    wallet = bindWalletKeys.out!(
      JSON.parse(JSON.stringify(bindWalletKeys.in!(wallet, 'WALLET', {}))),
      'WALLET',
      {},
    );
    expect(wallet.keys.key1.properties).toBeUndefined();
    expect(wallet.keys.key1.tssSession).toBeUndefined();
    expect(wallet.pendingJoinerSession).toBeNull();

    rehydrateWalletSecrets()(dispatch as any, getState as any, undefined);

    expect(wallet.keys.key1.properties.mnemonic).toBe(SECRETS[0]);
    expect(wallet.keys.key1.wallets[0].credentials.requestPrivKey).toBe(
      SECRETS[2],
    );
    expect(wallet.keys.key1.tssSession.partyKey.xPrivKey).toBe(SECRETS[9]);
    expect(wallet.pendingJoinerSession.partyKey.xPrivKey).toBe(SECRETS[13]);
  });
});

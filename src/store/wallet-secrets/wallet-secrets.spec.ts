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

jest.mock('../transforms/transforms', () => {
  const actual = jest.requireActual('../transforms/transforms');
  return {
    ...actual,
    bootstrapKey: jest.fn((key: any) => key),
    bootstrapWallets: jest.fn((wallets: any[]) =>
      wallets.map(wallet => ({...wallet, clientBound: true})),
    ),
  };
});

import {
  initialWalletSecretsState,
  pickCredentialSecrets,
  walletSecretsReducer,
} from './wallet-secrets.reducer';
import {
  migrateWalletSecrets,
  rehydrateWalletSecrets,
} from './wallet-secrets.effects';
import {WalletActionTypes} from '../wallet/wallet.types';
import {bootstrapKey, bootstrapWallets} from '../transforms/transforms';

jest.mock('../../managers/LogManager', () => ({
  logManager: {info: jest.fn(), error: jest.fn(), debug: jest.fn()},
}));

jest.mock('@sentry/react-native', () => ({captureException: jest.fn()}));

const key = {
  id: 'key1',
  properties: {mnemonic: 'abandon abandon about', xPrivKey: 'xprv'},
  wallets: [
    {
      id: 'w1',
      credentials: {
        walletId: 'w1',
        xPubKey: 'xpub-public',
        xPrivKey: 'legacy-xpriv',
        xPrivKeyEncrypted: 'legacy-encrypted-xpriv',
        requestPrivKey: 'request-priv-key',
        walletPrivKey: 'wallet-priv-key',
        personalEncryptingKey: 'personal-encrypting-key',
        sharedEncryptingKey: 'shared-encrypting-key',
        mnemonic: 'legacy mnemonic',
        mnemonicEncrypted: 'legacy-encrypted-mnemonic',
        entropySource: 'legacy-entropy',
      },
    },
  ],
  tssSession: {
    id: 'tss-session',
    partyKey: {xPrivKey: 'party-xpriv'},
    sessionExport: 'session-export',
    password: 'ceremony-password',
    copayers: [{partyId: 1, joinCode: 'secret-join-code'}],
    status: 'ceremony_in_progress',
  },
};

const rehydrate = (WALLET: any, WALLET_SECRETS: any) => {
  const dispatch = jest.fn();
  rehydrateWalletSecrets()(
    dispatch,
    (() => ({
      WALLET: {secretsMigrated: true, ...WALLET},
      WALLET_SECRETS,
    })) as any,
    undefined,
  );
  return dispatch.mock.calls[0]?.[0];
};

describe('wallet secrets slice', () => {
  it('picks only the secret credential fields', () => {
    expect(pickCredentialSecrets(key.wallets[0].credentials)).toEqual({
      xPrivKey: 'legacy-xpriv',
      xPrivKeyEncrypted: 'legacy-encrypted-xpriv',
      requestPrivKey: 'request-priv-key',
      walletPrivKey: 'wallet-priv-key',
      personalEncryptingKey: 'personal-encrypting-key',
      sharedEncryptingKey: 'shared-encrypting-key',
      mnemonic: 'legacy mnemonic',
      mnemonicEncrypted: 'legacy-encrypted-mnemonic',
      entropySource: 'legacy-entropy',
    });
  });

  it('absorbs the secrets of a newly created key', () => {
    const next = walletSecretsReducer(initialWalletSecretsState, {
      type: WalletActionTypes.SUCCESS_CREATE_KEY,
      payload: {key},
    } as any);

    expect(next.byKeyId.key1).toEqual(key.properties);
    expect(next.byKeyIdAndWalletId.key1.w1.requestPrivKey).toBe(
      'request-priv-key',
    );
    expect(next.tssSessionByKeyId.key1).toEqual(key.tssSession);
  });

  it('drops every secret owned by a deleted key', () => {
    const withKey = walletSecretsReducer(initialWalletSecretsState, {
      type: WalletActionTypes.SUCCESS_CREATE_KEY,
      payload: {key},
    } as any);
    const next = walletSecretsReducer(withKey, {
      type: WalletActionTypes.DELETE_KEY,
      payload: {keyId: 'key1'},
    } as any);

    expect(next.byKeyId.key1).toBeUndefined();
    expect(next.byKeyIdAndWalletId.key1).toBeUndefined();
    expect(next.tssSessionByKeyId.key1).toBeUndefined();
  });

  it('stores and removes the pending joiner party key', () => {
    const withSession = walletSecretsReducer(initialWalletSecretsState, {
      type: WalletActionTypes.SET_PENDING_JOINER_SESSION,
      payload: {
        sessionId: 'joiner-session',
        partyKey: {xPrivKey: 'joiner-xpriv'},
        copayerName: 'Alice',
        createdAt: 1,
      },
    } as any);

    expect(withSession.pendingJoinerSession).toEqual({
      sessionId: 'joiner-session',
      partyKey: {xPrivKey: 'joiner-xpriv'},
      copayerName: 'Alice',
      createdAt: 1,
    });

    expect(
      walletSecretsReducer(withSession, {
        type: WalletActionTypes.REMOVE_PENDING_JOINER_SESSION,
      } as any).pendingJoinerSession,
    ).toBeNull();
  });

  it('isolates secrets for copayers that share a wallet id', () => {
    const firstKey = {
      ...key,
      id: 'key1',
      wallets: [
        {
          id: 'shared-wallet',
          credentials: {requestPrivKey: 'first-copayer-secret'},
        },
      ],
    };
    const secondKey = {
      ...key,
      id: 'key2',
      wallets: [
        {
          id: 'shared-wallet',
          credentials: {requestPrivKey: 'second-copayer-secret'},
        },
      ],
    };
    const withFirst = walletSecretsReducer(initialWalletSecretsState, {
      type: WalletActionTypes.SUCCESS_CREATE_KEY,
      payload: {key: firstKey},
    } as any);
    const withBoth = walletSecretsReducer(withFirst, {
      type: WalletActionTypes.SUCCESS_CREATE_KEY,
      payload: {key: secondKey},
    } as any);

    const action = rehydrate(
      {keys: {key1: firstKey, key2: secondKey}},
      withBoth,
    );
    expect(action.payload.keys.key1.wallets[0].credentials.requestPrivKey).toBe(
      'first-copayer-secret',
    );
    expect(action.payload.keys.key2.wallets[0].credentials.requestPrivKey).toBe(
      'second-copayer-secret',
    );

    const afterFirstDeletion = walletSecretsReducer(withBoth, {
      type: WalletActionTypes.DELETE_KEY,
      payload: {keyId: 'key1'},
    } as any);
    expect(afterFirstDeletion.byKeyIdAndWalletId.key1).toBeUndefined();
    expect(
      afterFirstDeletion.byKeyIdAndWalletId.key2['shared-wallet']
        .requestPrivKey,
    ).toBe('second-copayer-secret');
  });

  it('merges TSS secrets back into their public sessions', () => {
    const secrets = walletSecretsReducer(initialWalletSecretsState, {
      type: WalletActionTypes.SUCCESS_CREATE_KEY,
      payload: {key},
    } as any);
    const publicKey = {
      ...key,
      tssSession: {...key.tssSession},
    } as any;
    delete publicKey.tssSession.partyKey;
    delete publicKey.tssSession.sessionExport;
    delete publicKey.tssSession.password;

    const action = rehydrate(
      {keys: {key1: publicKey}},
      {
        ...secrets,
        pendingJoinerSession: {
          sessionId: 'joiner-session',
          partyKey: {xPrivKey: 'joiner-xpriv'},
          createdAt: 1,
        },
      },
    );

    expect(action.payload.keys.key1.tssSession).toMatchObject(key.tssSession);
    expect(action.payload.pendingJoinerSession).toMatchObject({
      partyKey: {xPrivKey: 'joiner-xpriv'},
    });
  });
});

describe('migrateWalletSecrets', () => {
  const runMigration = async ({
    flush = async () => {},
    removeBackups = async () => {},
    resumeBackups = async () => {},
    walletState = {},
  }: {
    flush?: () => Promise<void>;
    removeBackups?: () => Promise<void>;
    resumeBackups?: (discardDeferred?: boolean) => Promise<void>;
    walletState?: Record<string, any>;
  } = {}) => {
    const dispatched: any[] = [];
    const dispatch = (action: any) =>
      typeof action === 'function'
        ? action(dispatch, getState)
        : dispatched.push(action);
    const getState = () =>
      ({
        WALLET: {
          keys: {key1: key},
          pendingJoinerSession: {
            sessionId: 'joiner-session',
            partyKey: {xPrivKey: 'joiner-xpriv'},
            createdAt: 1,
          },
          secretsMigrated: false,
          ...walletState,
        },
      } as any);

    await migrateWalletSecrets(flush, removeBackups, resumeBackups)(
      dispatch as any,
      getState,
      undefined,
    );
    return dispatched;
  };

  it('only reports success after both persistence phases and backup cleanup', async () => {
    const order: string[] = [];
    const dispatched = await runMigration({
      flush: async () => {
        order.push('flush');
      },
      removeBackups: async () => {
        order.push('removeBackups');
      },
      resumeBackups: async () => {
        order.push('resumeBackups');
      },
    });

    expect(dispatched[0].type).toBe(
      WalletActionTypes.SUCCESS_MIGRATE_WALLET_SECRETS,
    );
    expect(dispatched[0].payload).toMatchObject({
      byKeyIdAndWalletId: {
        key1: {w1: {requestPrivKey: 'request-priv-key'}},
      },
      tssSessionByKeyId: {
        key1: {
          partyKey: {xPrivKey: 'party-xpriv'},
          sessionExport: 'session-export',
          password: 'ceremony-password',
        },
      },
      pendingJoinerSession: {partyKey: {xPrivKey: 'joiner-xpriv'}},
    });
    expect(order).toEqual(['flush', 'removeBackups', 'flush', 'resumeBackups']);
    expect(dispatched[1].type).toBe(WalletActionTypes.SET_SECRETS_MIGRATED);
    expect(dispatched[1].payload).toBe(true);
  });

  it('leaves the migration pending when the flush fails', async () => {
    const removeBackups = jest.fn();
    const dispatched = await runMigration({
      flush: async () => {
        throw new Error('disk full');
      },
      removeBackups,
    });

    expect(
      dispatched.some(a => a.type === WalletActionTypes.SET_SECRETS_MIGRATED),
    ).toBe(false);
    expect(removeBackups).not.toHaveBeenCalled();
  });

  it('does not mark migration complete when backup cleanup fails', async () => {
    const resumeBackups = jest.fn().mockResolvedValue(undefined);
    const dispatched = await runMigration({
      removeBackups: async () => {
        throw new Error('unlink failed');
      },
      resumeBackups,
    });

    expect(
      dispatched.some(a => a.type === WalletActionTypes.SET_SECRETS_MIGRATED),
    ).toBe(false);
    expect(resumeBackups).toHaveBeenCalledWith(true);
  });

  it('rolls the marker back when the second flush fails', async () => {
    let flushCount = 0;
    const resumeBackups = jest.fn().mockResolvedValue(undefined);
    const dispatched = await runMigration({
      flush: async () => {
        flushCount += 1;
        if (flushCount === 2) {
          throw new Error('disk full');
        }
      },
      resumeBackups,
    });
    const markers = dispatched.filter(
      action => action.type === WalletActionTypes.SET_SECRETS_MIGRATED,
    );

    expect(markers).toHaveLength(2);
    expect(markers[1].payload).toBe(false);
    expect(flushCount).toBe(3);
    expect(resumeBackups).toHaveBeenCalledWith(true);
  });

  it('does nothing when it already ran', async () => {
    const dispatched: any[] = [];
    await migrateWalletSecrets(
      async () => {},
      async () => {},
      async () => {},
    )(
      ((a: any) => dispatched.push(a)) as any,
      (() => ({
        WALLET: {keys: {}, secretsMigrated: true},
      })) as any,
      undefined,
    );

    expect(dispatched).toHaveLength(0);
  });
});

describe('rehydrateWalletSecrets', () => {
  it('bootstraps migrated readonly and hardware wallets without key properties', () => {
    const dispatch = jest.fn();
    const readonlyWallet = {id: 'readonly-wallet', credentials: {}};
    const hardwareWallet = {id: 'hardware-wallet', credentials: {}};
    (bootstrapKey as jest.Mock).mockClear();
    (bootstrapWallets as jest.Mock).mockClear();

    rehydrateWalletSecrets()(
      dispatch,
      (() => ({
        WALLET: {
          secretsMigrated: true,
          keys: {
            readonly: {
              id: 'readonly',
              wallets: [readonlyWallet],
            },
            hardware: {
              id: 'hardware',
              hardwareSource: 'ledger',
              wallets: [hardwareWallet],
            },
          },
          pendingJoinerSession: null,
        },
        WALLET_SECRETS: initialWalletSecretsState,
      })) as any,
      undefined,
    );

    const action = dispatch.mock.calls[0][0];
    expect(action.payload.keys.readonly.wallets[0]).toMatchObject({
      id: 'readonly-wallet',
      clientBound: true,
    });
    expect(action.payload.keys.hardware.wallets[0]).toMatchObject({
      id: 'hardware-wallet',
      clientBound: true,
    });
    expect(bootstrapWallets).toHaveBeenCalledTimes(2);
    expect(bootstrapKey).not.toHaveBeenCalled();
  });

  it('restores an encrypted pending joiner session even when there are no keys', () => {
    const pendingJoinerSession = {
      sessionId: 'pending-session',
      partyKey: {xPrivKey: 'pending-party-xpriv'},
      createdAt: 1,
    };
    const dispatch = jest.fn();

    rehydrateWalletSecrets()(
      dispatch,
      (() => ({
        WALLET: {keys: {}, secretsMigrated: true, pendingJoinerSession: null},
        WALLET_SECRETS: {
          ...initialWalletSecretsState,
          pendingJoinerSession,
        },
      })) as any,
      undefined,
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: WalletActionTypes.SUCCESS_REHYDRATE_WALLET_SECRETS,
      payload: {keys: {}, pendingJoinerSession},
    });
  });

  it('does nothing before the migration ran', () => {
    const dispatch = jest.fn();

    rehydrateWalletSecrets()(
      dispatch,
      (() => ({
        WALLET: {keys: {key1: key}, secretsMigrated: false},
        WALLET_SECRETS: initialWalletSecretsState,
      })) as any,
      undefined,
    );

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('still bootstraps wallets when the secrets are unreadable', () => {
    const dispatch = jest.fn();

    rehydrateWalletSecrets()(
      dispatch,
      (() => ({
        WALLET: {
          keys: {key1: {id: 'key1', wallets: [{id: 'w1', credentials: {}}]}},
          secretsMigrated: true,
          pendingJoinerSession: null,
        },
        WALLET_SECRETS: initialWalletSecretsState,
      })) as any,
      undefined,
    );

    expect(bootstrapWallets).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('does nothing when neither keys nor a pending session exist', () => {
    const dispatch = jest.fn();

    rehydrateWalletSecrets()(
      dispatch,
      (() => ({
        WALLET: {keys: {}, secretsMigrated: true, pendingJoinerSession: null},
        WALLET_SECRETS: initialWalletSecretsState,
      })) as any,
      undefined,
    );

    expect(dispatch).not.toHaveBeenCalled();
  });
});

import {decryptWalletStore, encryptWalletStore} from './encrypt';

const secretKey = 'test-secret';

const shareBytes = [1, 2, 3, 250, 251, 252];

const buildWalletState = (privateKeyShare: any) => ({
  keys: {
    key1: {
      id: 'key1',
      properties: {
        id: 'key1',
        mnemonic: 'abandon abandon about',
        xPrivKey: 'xprv-plaintext',
        metadata: {chain: 'btc', network: 'livenet', m: '2', n: '2'},
        keychain: {
          privateKeyShare,
          reducedPrivateKeyShare: {type: 'Buffer', data: [9, 8, 7]},
          commonKeyChain: 'common-key-chain',
        },
      },
      methods: {
        id: 'key1',
        keychain: {
          privateKeyShare,
          reducedPrivateKeyShare: {type: 'Buffer', data: [9, 8, 7]},
          commonKeyChain: 'common-key-chain',
        },
      },
      wallets: [],
    },
  },
});

describe('encryptWalletStore / decryptWalletStore', () => {
  it('round-trips the tss keychain', () => {
    const state = buildWalletState({type: 'Buffer', data: shareBytes});
    const {properties} = decryptWalletStore(
      encryptWalletStore(state, secretKey),
      secretKey,
    ).keys.key1;

    expect(properties.mnemonic).toBe('abandon abandon about');
    expect(properties.keychain.commonKeyChain).toBe('common-key-chain');
    expect(properties.keychain.privateKeyShare).toEqual({
      type: 'Buffer',
      data: shareBytes,
    });
    expect(properties.keychain.reducedPrivateKeyShare).toEqual({
      type: 'Buffer',
      data: [9, 8, 7],
    });
  });

  it('leaves no keychain secret in the persisted payload', () => {
    const state = buildWalletState({type: 'Buffer', data: shareBytes});
    const persisted = JSON.stringify(encryptWalletStore(state, secretKey));

    expect(persisted).not.toContain('common-key-chain');
    expect(persisted).not.toContain('250,251,252');
  });

  it('serializes a raw Buffer share the same way as a rehydrated one', () => {
    const encrypted = encryptWalletStore(
      buildWalletState(Buffer.from(shareBytes)),
      secretKey,
    );
    const decrypted = decryptWalletStore(encrypted, secretKey);

    expect(decrypted.keys.key1.properties.keychain.privateKeyShare).toEqual({
      type: 'Buffer',
      data: shareBytes,
    });
  });

  it('does not double-encrypt on repeated writes', () => {
    const state = buildWalletState({type: 'Buffer', data: shareBytes});
    const once = encryptWalletStore(state, secretKey);

    expect(encryptWalletStore(once, secretKey)).toEqual(once);
  });

  it('leaves legacy plaintext state untouched on decrypt', () => {
    const state = buildWalletState({type: 'Buffer', data: shareBytes});

    expect(decryptWalletStore(state, secretKey)).toEqual(state);
  });

  it('preserves non-secret properties', () => {
    const state = buildWalletState({type: 'Buffer', data: shareBytes});
    const encrypted = encryptWalletStore(state, secretKey);

    expect(encrypted.keys.key1.properties.metadata).toEqual({
      chain: 'btc',
      network: 'livenet',
      m: '2',
      n: '2',
    });
  });

  it('encrypts the keychain duplicated on key.methods', () => {
    const state = buildWalletState({type: 'Buffer', data: shareBytes});
    const encrypted = encryptWalletStore(state, secretKey);
    const {keychain} = encrypted.keys.key1.methods;

    expect(keychain.commonKeyChain).toMatch(/^encrypted:/);
    expect(keychain.privateKeyShare).toMatch(/^encrypted:/);
    expect(keychain.reducedPrivateKeyShare).toMatch(/^encrypted:/);
    expect(decryptWalletStore(encrypted, secretKey).keys.key1.methods).toEqual(
      state.keys.key1.methods,
    );
  });

  it('leaves a key without keychain untouched', () => {
    const state = {
      keys: {key1: {id: 'key1', properties: {mnemonic: 'words'}, wallets: []}},
    };
    const encrypted = encryptWalletStore(state, secretKey);

    expect(encrypted.keys.key1.properties.keychain).toBeUndefined();
    expect(
      decryptWalletStore(encrypted, secretKey).keys.key1.properties,
    ).toEqual({mnemonic: 'words'});
  });
});

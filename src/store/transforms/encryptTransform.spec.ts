import Aes from 'crypto-js/aes.js';
import {encryptTransform} from 'redux-persist-transform-encrypt';

const secretKey = 'test-secret';

const walletState = {
  keys: {
    key1: {
      id: 'key1',
      properties: {
        mnemonic: 'abandon abandon about',
        xPrivKey: 'xprv-plaintext',
        keychain: {
          privateKeyShare: {type: 'Buffer', data: [1, 2, 250, 251]},
          reducedPrivateKeyShare: {type: 'Buffer', data: [9, 8, 7]},
          commonKeyChain: 'common-key-chain',
        },
      },
      methods: {
        keychain: {
          privateKeyShare: {type: 'Buffer', data: [1, 2, 250, 251]},
          commonKeyChain: 'common-key-chain',
        },
      },
      wallets: [
        {
          id: 'w1',
          credentials: {
            requestPrivKey: 'request-priv-key',
            walletPrivKey: 'wallet-priv-key',
            personalEncryptingKey: 'personal-encrypting-key',
            sharedEncryptingKey: 'shared-encrypting-key',
          },
        },
      ],
    },
  },
};

const buildTransform = (onError = jest.fn(), overrides: any = {}) => ({
  transform: encryptTransform({
    secretKey,
    onError,
    plaintextFallbackStores: ['WALLET'],
    ...overrides,
  } as any),
  onError,
});

describe('encryptTransform on the WALLET store', () => {
  it('leaves no secret material in the persisted payload', () => {
    const {transform} = buildTransform();
    const persisted = transform.in(walletState, 'WALLET', {}) as string;

    [
      'abandon abandon about',
      'xprv-plaintext',
      'common-key-chain',
      'request-priv-key',
      'wallet-priv-key',
      'personal-encrypting-key',
      'shared-encrypting-key',
    ].forEach(secret => expect(persisted).not.toContain(secret));
    expect(persisted).not.toContain('250,251');
    expect(persisted.startsWith('U2FsdGVkX1')).toBe(true);
  });

  it('round-trips the store', () => {
    const {transform} = buildTransform();
    const persisted = transform.in(walletState, 'WALLET', {}) as string;

    expect(transform.out(persisted, 'WALLET', {})).toEqual(walletState);
  });

  it('reads plaintext state persisted by a previous version', () => {
    const {transform, onError} = buildTransform();

    expect(transform.out(JSON.stringify(walletState), 'WALLET', {})).toEqual(
      walletState,
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it('never mistakes an encrypted blob for plaintext json', () => {
    const {transform} = buildTransform();
    const persisted = transform.in(walletState, 'WALLET', {}) as string;

    expect(() => JSON.parse(persisted)).toThrow();
  });

  it('stays readable by a build that still lists WALLET as unencrypted', () => {
    const {transform} = buildTransform();
    const persisted = transform.in(walletState, 'WALLET', {}) as string;
    const previousBuild = buildTransform(jest.fn(), {
      unencryptedStores: ['WALLET'],
    });

    expect(previousBuild.transform.out(persisted, 'WALLET', {})).toEqual(
      walletState,
    );
  });

  it('rejects injected plaintext on a store that was already encrypted', () => {
    const {transform, onError} = buildTransform();
    const injected = JSON.stringify({list: [{name: 'injected'}]});

    expect(transform.out(injected, 'CONTACT', {})).toBeUndefined();
    expect(onError).toHaveBeenCalled();
  });

  it('reports an error when decryption yields non-json', () => {
    const onError = jest.fn();
    const transform = encryptTransform({
      secretKey,
      onError,
      plaintextFallbackStores: ['WALLET'],
    } as any);
    const notJson = Aes.encrypt('not json at all', secretKey).toString();

    expect(transform.out(notJson, 'CONTACT', {})).toBeUndefined();
    expect(onError).toHaveBeenCalled();
  });

  it('reports an error instead of returning garbage on a wrong key', () => {
    const {transform} = buildTransform();
    const persisted = transform.in(walletState, 'WALLET', {}) as string;
    const onError = jest.fn();

    expect(
      encryptTransform({secretKey: 'another-secret', onError}).out(
        persisted,
        'WALLET',
        {},
      ),
    ).toBeUndefined();
    expect(onError).toHaveBeenCalled();
  });
});

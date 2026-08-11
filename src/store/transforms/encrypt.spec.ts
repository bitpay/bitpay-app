import crypto from 'crypto';
import Aes from 'crypto-js/aes.js';
import {
  decryptPersistValue,
  deserializePersistValue,
  decryptValue,
  decryptWalletStore,
  encryptPersistValue,
  encryptValue,
  encryptWalletStore,
} from './encrypt';

const secretKey = 'test-device-secret';

describe('encrypted field values', () => {
  it('round-trips with AES-GCM and produces randomized ciphertext', () => {
    const first = encryptValue('mnemonic words', secretKey);
    const second = encryptValue('mnemonic words', secretKey);

    expect(first).toMatch(/^field-aesgcm-v1:/);
    expect(second).not.toBe(first);
    expect(decryptValue(first, secretKey)).toBe('mnemonic words');
  });

  it('rejects tampering and the wrong context', () => {
    const encrypted = encryptValue('private key', secretKey, 'wallet:key-a');
    const tampered = `${encrypted.slice(0, -1)}${
      encrypted.endsWith('A') ? 'B' : 'A'
    }`;

    expect(() => decryptValue(tampered, secretKey, 'wallet:key-a')).toThrow();
    expect(() => decryptValue(encrypted, secretKey, 'wallet:key-b')).toThrow();
  });

  it('reads the legacy CBC field format', () => {
    const legacyCbc = `encrypted:${Aes.encrypt(
      'legacy mnemonic',
      secretKey,
    ).toString()}`;
    expect(decryptValue(legacyCbc, secretKey)).toBe('legacy mnemonic');
  });

  it('binds wallet ciphertext to its persisted field location', () => {
    const state = {
      keys: {
        keyA: {
          properties: {mnemonic: 'alpha', xPrivKey: 'xpriv'},
        },
      },
    };
    const encrypted = encryptWalletStore(state, secretKey);

    expect(encrypted.keys.keyA.properties.mnemonic).toMatch(
      /^field-aesgcm-v1:/,
    );
    expect(decryptWalletStore(encrypted, secretKey)).toEqual(state);

    const swapped = {
      keys: {
        keyA: {
          properties: {
            mnemonic: encrypted.keys.keyA.properties.xPrivKey,
            xPrivKey: encrypted.keys.keyA.properties.mnemonic,
          },
        },
      },
    };
    expect(() => decryptWalletStore(swapped, secretKey)).toThrow();
  });
});

describe('persisted reducer values', () => {
  const state = {token: 'secret', nested: {enabled: true}};
  const context = 'persist:BITPAY_ID';

  it('round-trips with a versioned authenticated envelope', () => {
    const encrypted = encryptPersistValue(state, secretKey, context);

    expect(encrypted).toMatch(/^persist-aesgcm-v1:/);
    expect(decryptPersistValue(encrypted, secretKey, context)).toEqual(state);
  });

  it('rejects the wrong key, context, malformed payloads, and extra segments', () => {
    const encrypted = encryptPersistValue(state, secretKey, context);

    expect(() =>
      decryptPersistValue(encrypted, 'wrong-secret', context),
    ).toThrow();
    expect(() =>
      decryptPersistValue(encrypted, secretKey, 'persist:CARD'),
    ).toThrow();
    expect(() =>
      decryptPersistValue(`${encrypted}.extra`, secretKey, context),
    ).toThrow('Invalid encrypted payload format');
    expect(() =>
      decryptPersistValue(
        'persist-aesgcm-v1:not-base64.x.y',
        secretKey,
        context,
      ),
    ).toThrow();
  });

  it('migrates bare CBC values produced by older releases', () => {
    const legacy = Aes.encrypt(JSON.stringify(state), secretKey).toString();

    expect(decryptPersistValue(legacy, secretKey, context)).toEqual(state);
  });

  it('does not fall back to CBC when GCM encryption fails', () => {
    const randomBytes = jest
      .spyOn(crypto, 'randomBytes')
      .mockImplementationOnce(() => {
        throw new Error('random source unavailable');
      });

    expect(() => encryptPersistValue(state, secretKey, context)).toThrow(
      'random source unavailable',
    );
    randomBytes.mockRestore();
  });

  it.each([false, true])(
    'rejects non-string reducers instead of bypassing decryption (plain JSON: %s)',
    allowPlainJson => {
      expect(() =>
        deserializePersistValue(
          {token: 'injected'},
          secretKey,
          context,
          allowPlainJson,
        ),
      ).toThrow('to be a string');
    },
  );

  it('reads production JSON only for reducers configured as plaintext', () => {
    expect(
      deserializePersistValue(JSON.stringify(state), secretKey, context, true),
    ).toEqual(state);
  });
});

import crypto from 'crypto';
import {
  decryptAppStore,
  decryptPersistValue,
  deserializePersistValue,
  decryptShopStore,
  decryptValue,
  decryptWalletStore,
  encryptAppStore,
  encryptPersistValue,
  encryptShopStore,
  encryptValue,
  encryptWalletStore,
} from './encrypt';

const secretKey = 'test-device-secret';
const cryptoJs319FieldFixture =
  'encrypted:U2FsdGVkX1/EPMhpSvHpnaBttHW7Aqj83wQ6ik7Jgl8=';
const cryptoJs319PersistFixture =
  'U2FsdGVkX19mVHQCu4aZtdIU0+n2LBW8Hor2eiDb8jHd1IeHDH4ydP1GmWptXm4xOXAPbdRgGqMnRjxv7CcIHw==';

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

  it('reads a fixed CBC field produced by CryptoJS 3.1.9-1', () => {
    expect(decryptValue(cryptoJs319FieldFixture, secretKey)).toBe(
      'legacy mnemonic',
    );
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

  type ProtectedStoreCase = {
    name: string;
    fields: string[];
    buildState: (field: string, value: unknown) => any;
    encrypt: (state: any) => any;
    decrypt: (state: any) => any;
    read: (state: any, field: string) => unknown;
    readPublic: (state: any) => unknown;
  };

  const protectedStoreCases: ProtectedStoreCase[] = [
    {
      name: 'WALLET',
      fields: [
        'mnemonic',
        'mnemonicEncrypted',
        'xPrivKey',
        'xPrivKeyEncrypted',
        'xPrivKeyEDDSA',
        'xPrivKeyEDDSAEncrypted',
      ],
      buildState: (field, value) => ({
        keys: {
          keyA: {properties: {[field]: value, fingerPrint: 'public-value'}},
        },
      }),
      encrypt: state => encryptWalletStore(state, secretKey),
      decrypt: state => decryptWalletStore(state, secretKey),
      read: (state, field) => state.keys.keyA.properties[field],
      readPublic: state => state.keys.keyA.properties.fingerPrint,
    },
    {
      name: 'APP',
      fields: ['priv'],
      buildState: (field, value) => ({
        identity: {livenet: {[field]: value, pub: 'public-value'}},
      }),
      encrypt: state => encryptAppStore(state, secretKey),
      decrypt: state => decryptAppStore(state, secretKey),
      read: (state, field) => state.identity.livenet[field],
      readPublic: state => state.identity.livenet.pub,
    },
    {
      name: 'SHOP',
      fields: [
        'accessKey',
        'barcodeData',
        'barcodeImage',
        'claimCode',
        'claimLink',
        'pin',
      ],
      buildState: (field, value) => ({
        giftCards: {
          livenet: [{[field]: value, displayName: 'public-value'}],
        },
      }),
      encrypt: state => encryptShopStore(state, secretKey),
      decrypt: state => decryptShopStore(state, secretKey),
      read: (state, field) => state.giftCards.livenet[0][field],
      readPublic: state => state.giftCards.livenet[0].displayName,
    },
  ];

  describe.each(protectedStoreCases)('$name protected fields', storeCase => {
    const firstField = storeCase.fields[0];

    it.each(storeCase.fields)('rejects plaintext in %s', field => {
      expect(() =>
        storeCase.decrypt(storeCase.buildState(field, 'attacker-controlled')),
      ).toThrow(field);
    });

    it('rejects a non-string value', () => {
      expect(() =>
        storeCase.decrypt(storeCase.buildState(firstField, {injected: true})),
      ).toThrow('Expected encrypted protected value');
    });

    it.each(storeCase.fields)(
      'accepts legacy CBC and modern GCM in %s without changing public fields',
      field => {
        const legacyState = storeCase.decrypt(
          storeCase.buildState(field, cryptoJs319FieldFixture),
        );
        expect(storeCase.read(legacyState, field)).toBe('legacy mnemonic');

        const plaintext = `${storeCase.name}-secret`;
        const modernState = storeCase.encrypt(
          storeCase.buildState(field, plaintext),
        );
        expect(storeCase.read(modernState, field)).toMatch(/^field-aesgcm-v1:/);
        const decrypted = storeCase.decrypt(modernState);
        expect(storeCase.read(decrypted, field)).toBe(plaintext);
        expect(storeCase.readPublic(decrypted)).toBe('public-value');
      },
    );

    it.each([undefined, null, ''])('allows an absent value (%p)', value => {
      const state = storeCase.buildState(firstField, value);
      expect(storeCase.read(storeCase.decrypt(state), firstField)).toBe(value);
    });
  });

  it('does not include rejected plaintext in the error', () => {
    const plaintext = 'attacker-controlled-secret';
    let capturedError: Error | undefined;

    try {
      protectedStoreCases[0].decrypt(
        protectedStoreCases[0].buildState('mnemonic', plaintext),
      );
    } catch (err) {
      capturedError = err as Error;
    }

    expect(capturedError).toBeDefined();
    expect(capturedError!.message).not.toContain(plaintext);
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

  it('migrates a fixed reducer CBC produced by CryptoJS 3.1.9-1', () => {
    expect(
      decryptPersistValue(cryptoJs319PersistFixture, secretKey, context),
    ).toEqual(state);
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

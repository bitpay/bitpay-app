import {createTransform} from 'redux-persist';
import getStoredState from 'redux-persist/lib/getStoredState';
import {decodeSnapshot} from './vault-codec';
import {
  decryptValue,
  deserializeModernPersistValue,
} from './transforms/encrypt';
import {encryptSpecificFields} from './transforms/transforms';
import {unencryptedPersistStores} from './transforms/persist-encryption';

// Captured once with the real e1259f38 writer. Never regenerate on refactored code.
const vector = require('../../test/vault/fixtures/modern-gcm-e1259.json');

it('decodes the fixed e1259f38 ciphertext with the independent codec', () => {
  expect(decodeSnapshot(vector.raw, vector.key).payload).toEqual(
    vector.payload,
  );
});

it('reads the unchanged e1259f38 ciphertext through the modern persistence transforms', async () => {
  const loaded = await getStoredState({
    key: 'root',
    storage: {getItem: async () => vector.raw},
    transforms: [
      encryptSpecificFields(vector.key),
      createTransform(undefined, (value, key) =>
        deserializeModernPersistValue(
          value,
          vector.key,
          String(key),
          unencryptedPersistStores.has(String(key)),
        ),
      ),
    ],
  } as any);
  expect(loaded).toEqual(vector.payload);
});

it('keeps literal protected-field inventories and authenticated contexts, including undefined invoiceId', () => {
  const walletFields = [
    'mnemonic',
    'mnemonicEncrypted',
    'xPrivKey',
    'xPrivKeyEncrypted',
    'xPrivKeyEDDSA',
    'xPrivKeyEDDSAEncrypted',
  ];
  const cardFields = [
    'accessKey',
    'barcodeData',
    'barcodeImage',
    'claimCode',
    'claimLink',
    'pin',
  ];
  const cases = [
    {
      reducer: 'WALLET',
      fields: walletFields,
      contexts: walletFields.map(
        field => `WALLET.keys.keyA.properties.${field}`,
      ),
      read: (state: any) => state.keys.keyA.properties,
    },
    {
      reducer: 'APP',
      fields: ['priv'],
      contexts: ['APP.identity.livenet.priv'],
      read: (state: any) => state.identity.livenet,
    },
    {
      reducer: 'SHOP',
      fields: cardFields,
      contexts: cardFields.map(
        field => `SHOP.giftCards.livenet.invoice-a.${field}`,
      ),
      read: (state: any) => state.giftCards.livenet[0],
    },
    {
      reducer: 'SHOP',
      fields: cardFields,
      contexts: cardFields.map(
        field => `SHOP.giftCards.livenet.undefined.${field}`,
      ),
      read: (state: any) => state.giftCards.livenet[1],
    },
  ];
  expect(cases[0].contexts[0]).toBe('WALLET.keys.keyA.properties.mnemonic');
  expect(cases[2].contexts[3]).toBe(
    'SHOP.giftCards.livenet.invoice-a.claimCode',
  );
  expect(cases[3].contexts[3]).toBe(
    'SHOP.giftCards.livenet.undefined.claimCode',
  );
  expect(vector.payload.SHOP.giftCards.livenet[1]).not.toHaveProperty(
    'invoiceId',
  );
  const outer = JSON.parse(vector.raw);
  const writer = encryptSpecificFields(vector.key);
  for (const {reducer, fields, contexts, read} of cases) {
    const fixed = read(JSON.parse(JSON.parse(outer[reducer])));
    const written = read(writer.in(vector.payload[reducer], reducer, {}));
    for (const [index, field] of fields.entries()) {
      for (const encrypted of [fixed[field], written[field]]) {
        expect(encrypted).toMatch(/^field-aesgcm-v1:/);
        expect(decryptValue(encrypted, vector.key, contexts[index], true)).toBe(
          read(vector.payload[reducer])[field],
        );
      }
    }
  }
});

import Aes from 'crypto-js/aes.js';
import isEqual from 'lodash.isequal';
import {createTransform} from 'redux-persist';
import getStoredState from 'redux-persist/lib/getStoredState';
import {decodeSnapshot, reencryptSnapshot, verifySnapshot} from './vault-codec';
import {
  deserializeModernPersistValue,
  decryptValue,
  encryptPersistValue,
} from './transforms/encrypt';
import {encryptSpecificFields} from './transforms/transforms';
import {unencryptedPersistStores} from './transforms/persist-encryption';

const fixtures = require('../../test/vault/fixtures/legacy-14.32.json').cases;
const oldKey = 'synthetic-legacy-fixture-key';
const newKey = Buffer.alloc(32, 71).toString('base64');
const safeEqual = (actual: unknown, expected: unknown) =>
  expect(isEqual(actual, expected)).toBe(true);

it.each(Object.keys(fixtures))(
  'converts historical %s with complete equality and the actual persistence transforms',
  async name => {
    const {raw, state} = fixtures[name];
    const output = reencryptSnapshot(raw, oldKey, newKey);
    safeEqual(decodeSnapshot(output, newKey).payload, state);
    const loaded = await getStoredState({
      key: 'root',
      storage: {getItem: async () => output},
      transforms: [
        encryptSpecificFields(newKey),
        createTransform(undefined, (value, key) =>
          deserializeModernPersistValue(
            value,
            newKey,
            String(key),
            unencryptedPersistStores.has(String(key)),
          ),
        ),
      ],
    } as any);
    safeEqual(loaded, state);
    expect(() => decodeSnapshot(output, oldKey)).toThrow();
  },
);

it('preserves unknown fields, LOG, caches, order and own __proto__ properties in whole CBC', () => {
  const payload = JSON.parse(JSON.stringify(fixtures.whole.state));
  payload.LOG = {
    logs: ['retain embedded log'],
    extra: [null, false, 5, {nested: 'public'}],
  };
  payload.PORTFOLIO = {
    cache: {
      series: [
        [3, 8],
        [1, 2],
      ],
    },
  };
  Object.defineProperty(payload, '__proto__', {
    value: {unknown: true},
    enumerable: true,
  });
  Object.defineProperty(payload.WALLET, '__proto__', {
    value: {extra: [1, 0]},
    enumerable: true,
  });
  const raw = JSON.stringify(
    Object.fromEntries(
      Object.entries(payload).map(([name, value]) => [
        name,
        JSON.stringify(Aes.encrypt(JSON.stringify(value), oldKey).toString()),
      ]),
    ),
  );
  const output = reencryptSnapshot(raw, oldKey, newKey);
  safeEqual(decodeSnapshot(output, newKey).payload, payload);
});

it('decodes nested legacy field encryption inside a whole CBC reducer', () => {
  const raw = JSON.parse(fixtures.plain.raw);
  raw.WALLET = JSON.stringify(
    Aes.encrypt(JSON.parse(raw.WALLET), oldKey).toString(),
  );
  safeEqual(
    decodeSnapshot(
      reencryptSnapshot(JSON.stringify(raw), oldKey, newKey),
      newKey,
    ).payload,
    fixtures.plain.state,
  );
});

it('rejects a persist envelope in a protected field inside an otherwise valid whole-CBC snapshot', () => {
  const payload = JSON.parse(JSON.stringify(fixtures.whole.state));
  const snapshot = () =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(payload).map(([name, state]) => [
          name,
          JSON.stringify(Aes.encrypt(JSON.stringify(state), oldKey).toString()),
        ]),
      ),
    );
  safeEqual(decodeSnapshot(snapshot(), oldKey).payload, payload);
  payload.WALLET.keys.fixture.properties.mnemonic = encryptPersistValue(
    'synthetic protected value',
    oldKey,
    'persist:WALLET',
  );
  expect(() => decodeSnapshot(snapshot(), oldKey)).toThrow(
    'INVALID_LEGACY_INPUT',
  );
});

it.each(['xPrivKeyEDDSA', 'xPrivKeyEDDSAEncrypted'])(
  'rejects unqualified historical %s and never returns partial output',
  field => {
    const outer = JSON.parse(fixtures.plain.raw);
    const wallet = JSON.parse(JSON.parse(outer.WALLET));
    wallet.keys.fixture.properties[field] = 'not-a-key';
    outer.WALLET = JSON.stringify(JSON.stringify(wallet));
    expect(() =>
      reencryptSnapshot(JSON.stringify(outer), oldKey, newKey),
    ).toThrow('INVALID_LEGACY_INPUT');
  },
);

it('rejects a mixed-key snapshot even when each candidate could decrypt some fields', () => {
  const outer = JSON.parse(fixtures.plain.raw);
  const wallet = JSON.parse(JSON.parse(outer.WALLET));
  wallet.keys.fixture.properties.mnemonic =
    'encrypted:' + Aes.encrypt('synthetic fixture', 'another-key').toString();
  outer.WALLET = JSON.stringify(JSON.stringify(wallet));
  for (const key of [oldKey, 'another-key'])
    expect(() =>
      reencryptSnapshot(JSON.stringify(outer), key, newKey),
    ).toThrow();
});

it('checks exact output bytes and full payload independently', () => {
  const {raw, state} = fixtures.plain;
  const output = reencryptSnapshot(raw, oldKey, newKey);
  expect(() => verifySnapshot(output + ' ', output, state, newKey)).toThrow();
  expect(() =>
    verifySnapshot(output, output, {...state, extra: {}}, newKey),
  ).toThrow();
});

it('ordinary modern reads reject CBC even with the same key', () => {
  const cbc = Aes.encrypt(JSON.stringify({data: 'fixture'}), newKey).toString();
  expect(() =>
    deserializeModernPersistValue(cbc, newKey, 'CONTACT', false),
  ).toThrow();
  expect(() =>
    decryptValue('encrypted:' + cbc, newKey, 'field', true),
  ).toThrow();
});

it.each(['whole', 'fields'])(
  'E: synthetic identity and gift-card values use the real reader in legacy %s layout',
  async layout => {
    const payload = JSON.parse(
      JSON.stringify(fixtures[layout === 'whole' ? 'whole' : 'plain'].state),
    );
    payload.APP.identity = {
      livenet: {priv: 'synthetic-unfunded-identity', retained: true},
    };
    payload.SHOP.giftCards = {
      livenet: [
        {
          invoiceId: 'synthetic-invoice',
          accessKey: 'not-redeemable-access',
          barcodeData: 'not-a-barcode',
          barcodeImage: 'not-an-image',
          claimCode: 'not-redeemable-code',
          claimLink: 'https://example.invalid/synthetic',
          pin: 'synthetic-pin',
          invoice: {unknownField: 'preserve during conversion'},
        },
        {
          claimCode: 'synthetic-without-invoice-id',
          pin: 'not-redeemable-pin',
          unknown: [null, false, 7],
        },
      ],
    };
    let raw: string;
    if (layout === 'whole') {
      raw = JSON.stringify(
        Object.fromEntries(
          Object.entries(payload).map(([name, value]) => [
            name,
            JSON.stringify(
              Aes.encrypt(JSON.stringify(value), oldKey).toString(),
            ),
          ]),
        ),
      );
    } else {
      const outer = JSON.parse(fixtures.plain.raw);
      const protect = (value: string) =>
        'encrypted:' + Aes.encrypt(value, oldKey).toString();
      const app = JSON.parse(JSON.stringify(payload.APP));
      app.identity.livenet.priv = protect(app.identity.livenet.priv);
      const shop = JSON.parse(JSON.stringify(payload.SHOP));
      for (const card of shop.giftCards.livenet) {
        for (const name of [
          'accessKey',
          'barcodeData',
          'barcodeImage',
          'claimCode',
          'claimLink',
          'pin',
        ]) {
          if (card[name] !== undefined) card[name] = protect(card[name]);
        }
      }
      outer.APP = JSON.stringify(JSON.stringify(app));
      outer.SHOP = JSON.stringify(JSON.stringify(shop));
      raw = JSON.stringify(outer);
    }
    const output = reencryptSnapshot(raw, oldKey, newKey);
    safeEqual(decodeSnapshot(output, newKey).payload, payload);
    const loaded = await getStoredState({
      key: 'root',
      storage: {getItem: async () => output},
      transforms: [
        encryptSpecificFields(newKey),
        createTransform(undefined, (value, key) =>
          deserializeModernPersistValue(
            value,
            newKey,
            String(key),
            unencryptedPersistStores.has(String(key)),
          ),
        ),
      ],
    } as any);
    // Ordinary reading deliberately drops the cached invoice; the converter does not.
    const expected = JSON.parse(JSON.stringify(payload));
    expected.SHOP.giftCards.livenet.forEach((card: any) => {
      card.invoice = undefined;
    });
    safeEqual(loaded, expected);
  },
);

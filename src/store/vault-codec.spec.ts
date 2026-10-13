import Aes from 'crypto-js/aes.js';
import isEqual from 'lodash.isequal';
import {decodeDetails, vaultDiagnostic} from './vault-diagnostics';
import * as encryption from './transforms/encrypt';
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

it('rejects this fixed mixed-key snapshot without combining key candidates', () => {
  const outer = JSON.parse(fixtures.plain.raw);
  const wallet = JSON.parse(JSON.parse(outer.WALLET));
  // CryptoJS 4.2.0, 'synthetic fixture' / 'another-key', salt 0000000000000000.
  wallet.keys.fixture.properties.mnemonic =
    'encrypted:U2FsdGVkX18AAAAAAAAAAPHnO9YuESCqG0d1R2Dvr2FCnoe+kYOrA2iCu5wEahC3';
  outer.WALLET = JSON.stringify(JSON.stringify(wallet));
  for (const key of [oldKey, 'another-key'])
    expect(() =>
      reencryptSnapshot(JSON.stringify(outer), key, newKey),
    ).toThrow();
});

it('documents that legacy mixed-key rejection is best-effort', () => {
  // Characterises the pinned decoder, not a requirement that a future,
  // separately authorised decoder must continue accepting this input.
  const ciphertext =
    'encrypted:U2FsdGVkX18AAAAAAAABTY9m00iKjEuHmybKA3MjuhavQmI5emKIIvgj1AuOCtht';
  const original = 'synthetic fixture';
  // Produced once with 'another-key' and fixed salt 000000000000014d.
  expect(decryptValue(ciphertext, 'another-key') === original).toBe(true);
  const outer = JSON.parse(fixtures.plain.raw);
  const wallet = JSON.parse(JSON.parse(outer.WALLET));
  wallet.keys.fixture.properties.mnemonic = ciphertext;
  outer.WALLET = JSON.stringify(JSON.stringify(wallet));
  const output = reencryptSnapshot(JSON.stringify(outer), oldKey, newKey);
  const converted = decodeSnapshot(output, newKey).payload.WALLET.keys.fixture
    .properties.mnemonic;
  // Boolean assertions avoid printing the converted value on a failure.
  expect(typeof converted === 'string').toBe(true);
  expect(converted.length > 0).toBe(true);
  expect(converted !== original).toBe(true);
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

const caughtDecode = (run: () => unknown): Error => {
  try {
    run();
  } catch (error) {
    return error as Error;
  }
  throw new Error('expected synthetic input to be rejected');
};

it('D16: fixes the complete label inventory and its distinct permanent codes', () => {
  expect(decodeDetails).toEqual({
    'invalid protected-field container': 'D01',
    'invalid protected-field value': 'D02',
    'invalid wallet key map': 'D03',
    'invalid wallet key': 'D04',
    'invalid identity map': 'D05',
    'invalid gift card map': 'D06',
    'invalid gift card list': 'D07',
    'invalid gift card': 'D08',
    'expected Redux Persist JSON': 'D09',
    'invalid serialized reducer': 'D10',
    'expected transform output to be a string': 'D11',
    'invalid or mixed-format snapshot': 'D12',
    'unexpected plaintext reducer': 'D13',
    'invalid reducer payload': 'D14',
    'invalid protected-field envelope': 'D15',
    'unexpected plaintext protected field': 'D16',
    'invalid decrypted field': 'D17',
  });
  expect(new Set(Object.values(decodeDetails)).size).toBe(17);
});

it.each([
  ['D01', {WALLET: {keys: {synthetic: {properties: []}}}}],
  ['D02', {WALLET: {keys: {synthetic: {properties: {mnemonic: false}}}}}],
  ['D03', {WALLET: {keys: []}}],
  ['D04', {WALLET: {keys: {synthetic: false}}}],
  ['D05', {APP: {identity: []}}],
  ['D06', {SHOP: {giftCards: []}}],
  ['D07', {SHOP: {giftCards: {livenet: {}}}}],
  ['D08', {SHOP: {giftCards: {livenet: [null]}}}],
  ['D13', {CONTACT: {name: 'synthetic saved name'}}],
  ['D14', {APP: []}],
  [
    'D15',
    {
      WALLET: {
        keys: {
          synthetic: {properties: {mnemonic: 'persist-aesgcm-v1:synthetic'}},
        },
      },
    },
  ],
  [
    'D16',
    {
      WALLET: {
        keys: {synthetic: {properties: {mnemonic: 'synthetic plaintext'}}},
      },
    },
  ],
])(
  'D16: labels the %s rejection in an otherwise valid saved snapshot',
  (detail, reducers) => {
    const outer = JSON.parse(fixtures.plain.raw);
    for (const [name, state] of Object.entries(reducers))
      outer[name] = JSON.stringify(JSON.stringify(state));
    const failure = caughtDecode(() =>
      decodeSnapshot(JSON.stringify(outer), oldKey),
    );
    expect(vaultDiagnostic(failure)).toEqual({
      code: 'INVALID_LEGACY_INPUT',
      phase: 'classify',
      reason: 'SOURCE_INVALID',
      detail,
    });
  },
);

it.each([
  ['D09', '[]'],
  ['D10', JSON.stringify({APP: {}})],
  ['D11', JSON.stringify({APP: JSON.stringify({})})],
  ['D12', '{}'],
])('D16: labels the %s snapshot syntax rejection', (detail, raw) => {
  expect(
    vaultDiagnostic(caughtDecode(() => decodeSnapshot(raw, oldKey))),
  ).toEqual({
    code: 'INVALID_LEGACY_INPUT',
    phase: 'classify',
    reason: 'SOURCE_INVALID',
    detail,
  });
});

it('D16: labels mixed formats and an empty authenticated protected field', () => {
  const mixed = JSON.parse(fixtures.plain.raw);
  mixed.CONTACT = JSON.stringify(
    encryptPersistValue({}, oldKey, 'persist:CONTACT'),
  );
  expect(
    vaultDiagnostic(
      caughtDecode(() => decodeSnapshot(JSON.stringify(mixed), oldKey)),
    )?.detail,
  ).toBe('D12');
  const empty = {
    WALLET: JSON.stringify(
      JSON.stringify({
        keys: {
          synthetic: {
            properties: {
              mnemonic: encryption.encryptValue(
                '',
                oldKey,
                'WALLET.keys.synthetic.properties.mnemonic',
              ),
            },
          },
        },
      }),
    ),
    _persist: JSON.stringify(JSON.stringify({version: -1, rehydrated: true})),
  };
  expect(
    vaultDiagnostic(
      caughtDecode(() => decodeSnapshot(JSON.stringify(empty), oldKey)),
    )?.detail,
  ).toBe('D17');
});

it('D16: a raw decryption failure keeps its identity and supplies no registered detail', () => {
  const raw = Object.assign(new Error('synthetic raw failure'), {
    detail: 'D13',
  });
  const decrypt = jest
    .spyOn(encryption, 'decryptPersistValue')
    .mockImplementationOnce(() => {
      throw raw;
    });
  try {
    const outer = {
      CONTACT: JSON.stringify(
        encryptPersistValue({}, oldKey, 'persist:CONTACT'),
      ),
    };
    const failure = caughtDecode(() =>
      decodeSnapshot(JSON.stringify(outer), oldKey),
    );
    expect(failure).toBe(raw);
    expect(vaultDiagnostic(failure)).toBeUndefined();
  } finally {
    decrypt.mockRestore();
  }
});

it.each([true, false])(
  'D16: conversion preserves its phase with a labelled=%s failure',
  labelled => {
    const raw = labelled
      ? JSON.stringify({
          ...JSON.parse(fixtures.plain.raw),
          CONTACT: JSON.stringify(JSON.stringify({})),
        })
      : 'synthetic invalid JSON';
    const failure = caughtDecode(() => reencryptSnapshot(raw, oldKey, newKey));
    expect(vaultDiagnostic(failure)).toEqual({
      code: 'INVALID_LEGACY_INPUT',
      phase: 'conversion',
      reason: 'SOURCE_INVALID',
      ...(labelled ? {detail: 'D13'} : {}),
    });
  },
);

it('D16: verification continues to discard underlying decode details', () => {
  const failure = caughtDecode(() => verifySnapshot('{}', '{}', {}, newKey));
  expect(vaultDiagnostic(failure)).toEqual({
    code: 'REQUIRED_COPY_FAILURE',
    phase: 'required-copy',
    reason: 'COPY_VERIFICATION',
  });
});

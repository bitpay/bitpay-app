import {Buffer} from 'buffer';
import {decodeFileText, encodeFileText} from './vault-file-codec';

const base64 = require('base-64');
const utf8 = require('utf8');
const referenceRead = (b64: string): string => utf8.decode(base64.decode(b64));
const referenceWrite = (text: string): string =>
  base64.encode(utf8.encode(text));

// Jest uses Node's Buffer, atob and btoa, not buffer 4.9.2 and Hermes on the
// phone. These tests establish logic and the reference contract. Phase 2 covers
// only the measured iOS build; Android remains a release-gate item.
type Outcome = {value: string} | {rejected: true};
const outcome = (call: () => string): Outcome => {
  try {
    return {value: call()};
  } catch {
    return {rejected: true};
  }
};
const valid: Array<[string, string]> = [
  ['empty', ''],
  ['ASCII', 'synthetic text 0123456789'],
  [
    '14.32 serialized state',
    require('../../test/vault/fixtures/legacy-14.32.json').cases.plain.raw,
  ],
  [
    '730000-unit synthetic state',
    JSON.stringify({DATA: 'A'.repeat(730000 - 11)}),
  ],
  ['U+007F', '\u007f'],
  ['U+0080', '\u0080'],
  ['U+07FF', '\u07ff'],
  ['U+0800', '\u0800'],
  ['U+D7FF', '\ud7ff'],
  ['U+E000', '\ue000'],
  ['U+FFFF', '\uffff'],
  ['U+10000', '\u{10000}'],
  ['U+10FFFF', '\u{10ffff}'],
  ['embedded NUL', 'a\0b'],
  ['BOM', '\ufefftext'],
  ['legitimate U+FFFD', 'a\ufffdb'],
  ['valid surrogate pair', '\ud83d\ude00'],
];
const malformedUtf8: Array<[string, number[]]> = [
  ['isolated continuation 80', [0x80]],
  ['isolated continuation BF', [0xbf]],
  ['invalid lead FF', [0xff]],
  ['invalid lead F8', [0xf8, 0x88, 0x80, 0x80, 0x80]],
  ['two-byte overlong C0', [0xc0, 0xaf]],
  ['two-byte overlong C1', [0xc1, 0xbf]],
  ['three-byte overlong', [0xe0, 0x80, 0xaf]],
  ['four-byte overlong', [0xf0, 0x80, 0x80, 0xaf]],
  ['encoded high surrogate', [0xed, 0xa0, 0x80]],
  ['encoded low surrogate', [0xed, 0xbf, 0xbf]],
  ['above U+10FFFF', [0xf4, 0x90, 0x80, 0x80]],
  ['out-of-range F5 lead', [0xf5, 0x80, 0x80, 0x80]],
  ['two-byte prefix 1', [0xc2]],
  ['three-byte prefix 1', [0xe2]],
  ['three-byte prefix 2', [0xe2, 0x82]],
  ['four-byte prefix 1', [0xf0]],
  ['four-byte prefix 2', [0xf0, 0x90]],
  ['four-byte prefix 3', [0xf0, 0x90, 0x80]],
  ['C3 28', [0xc3, 0x28]],
  ['C3 28 amid ASCII', [0x61, 0xc3, 0x28, 0x62]],
  ['bad third byte', [0xe2, 0x82, 0x41]],
  ['bad fourth byte', [0xf0, 0x90, 0x80, 0x41]],
];
const surrogates: Array<[string, string]> = [
  ['lone high surrogate', '\ud800'],
  ['lone low surrogate', '\udc00'],
  ['adjacent high surrogates', '\ud800\ud801'],
  ['valid pair then lone high', '\ud83d\ude00\ud800'],
  ['valid pair then lone low', '\ud83d\ude00\udc00'],
];
const representations: Array<[string, string]> = [
  ['padded one byte', 'Zg=='],
  ['padded two bytes', 'Zm8='],
  ['unpadded one byte', 'Zg'],
  ['unpadded two bytes', 'Zm8'],
  ['complete unpadded group', 'Zm9v'],
  ['space', 'Z g=='],
  ['tab', 'Z\tg=='],
  ['LF', 'Z\ng=='],
  ['FF', 'Z\fg=='],
  ['CR', 'Z\rg=='],
  ['vertical tab', 'Z\vg=='],
  ['invalid ASCII character', 'Z?=='],
  ['invalid non-ASCII character', 'Zé=='],
  ['misplaced padding', 'Z=g='],
  ['excess padding', 'Zg==='],
  ['incomplete padding', 'Zg='],
  ['invalid length', 'Z'],
  ['non-canonical pad bits', 'Zh=='],
];
const malformedReads: Array<[string, string]> = malformedUtf8.map(
  ([name, bytes]) => [name, base64.encode(String.fromCharCode(...bytes))],
);
const reads: Array<[string, string]> = [
  ...valid.map(([name, text]): [string, string] => [
    name,
    referenceWrite(text),
  ]),
  ...malformedReads,
  ...representations,
];

it('uses the conversion package versions shipped by RNFS', () => {
  expect(require('react-native-fs/package.json').version).toBe('2.20.0');
  expect(require('base-64/package.json').version).toBe('0.1.0');
  expect(require('utf8/package.json').version).toBe('3.0.0');
});
it.each(reads)('read: %s agrees with the reference', (_name, b64) => {
  expect(outcome(() => decodeFileText(b64))).toEqual(
    outcome(() => referenceRead(b64)),
  );
});
it.each([...valid, ...surrogates])(
  'write: %s agrees with the reference',
  (_name, text) => {
    expect(outcome(() => encodeFileText(text))).toEqual(
      outcome(() => referenceWrite(text)),
    );
  },
);
it.each(valid)('round trips: %s', (_name, text) => {
  expect(decodeFileText(referenceWrite(text))).toBe(text);
  expect(referenceRead(encodeFileText(text))).toBe(text);
  expect(decodeFileText(encodeFileText(text))).toBe(text);
});

it('malformed UTF-8 exposes the lenient D decoder, with strict agreement', () => {
  const lenient = (b64: string) => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return Buffer.from(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    ).toString('utf8');
  };
  // Base64 representation cases are intentionally not part of this control.
  for (const [, b64] of malformedReads) {
    const expected = outcome(() => referenceRead(b64));
    expect(outcome(() => decodeFileText(b64))).toEqual(expected);
    expect(outcome(() => lenient(b64))).not.toEqual(expected);
  }
});
it('unpaired surrogates expose the unchecked encoder, with strict agreement', () => {
  const unchecked = (text: string) => {
    const bytes = Buffer.from(text, 'utf8');
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
  };
  for (const [, text] of surrogates) {
    const expected = outcome(() => referenceWrite(text));
    expect(outcome(() => encodeFileText(text))).toEqual(expected);
    expect(outcome(() => unchecked(text))).not.toEqual(expected);
  }
});
it('never reaches global TextEncoder or TextDecoder on the valid corpus', () => {
  const names = ['TextEncoder', 'TextDecoder'] as const;
  const originals = names.map(name =>
    Object.getOwnPropertyDescriptor(globalThis, name),
  );
  const forbidden = jest.fn(() => {
    throw new Error('forbidden text API');
  });
  names.forEach(name =>
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: forbidden,
    }),
  );
  try {
    for (const [, text] of valid) {
      expect(encodeFileText(text)).toBe(referenceWrite(text));
      expect(decodeFileText(referenceWrite(text))).toBe(text);
    }
    expect(forbidden).not.toHaveBeenCalled();
  } finally {
    names.forEach((name, i) => {
      const descriptor = originals[i];
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
});

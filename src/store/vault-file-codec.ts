import {Buffer} from 'buffer';

export const decodeFileText = (b64: string): string => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  let remaining = 0;
  let codePoint = 0;
  let minimum = 0;
  for (let i = 0; i < binary.length; i++) {
    const byte = binary.charCodeAt(i);
    bytes[i] = byte;
    if (remaining > 0) {
      if ((byte & 0xc0) !== 0x80) throw new Error('Invalid UTF-8 continuation');
      codePoint = (codePoint << 6) | (byte & 0x3f);
      remaining--;
      if (
        remaining === 0 &&
        (codePoint < minimum ||
          codePoint > 0x10ffff ||
          (codePoint >= 0xd800 && codePoint <= 0xdfff))
      ) {
        throw new Error('Invalid UTF-8 code point');
      }
    } else if (byte <= 0x7f) {
      continue;
    } else if (byte >= 0xc2 && byte <= 0xdf) {
      remaining = 1;
      codePoint = byte & 0x1f;
      minimum = 0x80;
    } else if (byte >= 0xe0 && byte <= 0xef) {
      remaining = 2;
      codePoint = byte & 0x0f;
      minimum = 0x800;
    } else if (byte >= 0xf0 && byte <= 0xf4) {
      remaining = 3;
      codePoint = byte & 0x07;
      minimum = 0x10000;
    } else {
      throw new Error('Invalid UTF-8 lead');
    }
  }
  if (remaining !== 0) throw new Error('Unfinished UTF-8 sequence');
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(
    'utf8',
  );
};

export const encodeFileText = (text: string): string => {
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new Error('Unpaired high surrogate');
      }
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new Error('Unpaired low surrogate');
    }
  }
  const bytes = Buffer.from(text, 'utf8');
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
};

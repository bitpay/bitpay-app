import {isTrustedBitPayPayProUrl} from './decode-uri';

describe('isTrustedBitPayPayProUrl (RN-3074)', () => {
  it.each([
    'https://bitpay.com/i/abc',
    'https://test.bitpay.com/i/abc',
    'https://BitPay.com/i/abc',
    'https://bitpay.com/i/abc?c=u&email=a@b.com',
  ])('accepts %s', url => {
    expect(isTrustedBitPayPayProUrl(url)).toBe(true);
  });

  it.each([
    'http://bitpay.com/i/abc',
    'https://evil.com/i/abc',
    'https://evilbitpay.com/i/abc',
    'https://bitpay.com.evil.com/i/abc',
    // parser differential: polyfill sees bitpay.com, iOS/BWC see evil.com
    'https://bitpay.com\\@evil.com/i/abc',
    'https://bitpay.com@evil.com/i/abc',
    'https://evil.com@bitpay.com/i/abc',
    'https://bitpay.com\t.evil.com/i/abc',
    'not a url',
    '',
  ])('rejects %s', url => {
    expect(isTrustedBitPayPayProUrl(url)).toBe(false);
  });
});

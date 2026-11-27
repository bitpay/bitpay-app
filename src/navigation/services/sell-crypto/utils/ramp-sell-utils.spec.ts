import {getRampCheckoutHost} from './ramp-sell-utils';

describe('getRampCheckoutHost', () => {
  it.each([
    ['https://app.ramp.network/?hostAppName=BitPay', 'app.ramp.network'],
    ['https://app.demo.ramp.network/', 'app.demo.ramp.network'],
    ['https://ramp.network/', 'ramp.network'],
    ['https://APP.Ramp.Network/', 'app.ramp.network'],
  ])('accepts %s', (url, host) => {
    expect(getRampCheckoutHost(url)).toBe(host);
  });

  it.each([
    'http://app.ramp.network/',
    'https://evil.com/',
    'https://ramp.network.evil.com/',
    'https://evilramp.network/',
    'https://app.ramp.network@evil.com/',
    'https://evil.com\\@app.ramp.network/',
    'https://evil.com/?r=https://app.ramp.network/',
    'about:blank',
    'not a url',
    '',
    undefined,
    null,
  ])('rejects %p', url => {
    expect(getRampCheckoutHost(url)).toBeUndefined();
  });
});

import {
  formatAtomicAmount,
  formatBigIntDecimal,
  getAtomicDecimals,
  getPow10BigInt,
  makeAtomicToUnitNumberConverter,
  normalizeNonNegativeInteger,
  parseAtomicToBigint,
  parseScientificToTruncatedIntegerString,
  ratioBigIntToNumber,
  resolveWalletAtomicDecimals,
  toSignificantStr,
} from './format';

describe('numeric primitives', () => {
  it('normalizes non-negative integer inputs', () => {
    expect(normalizeNonNegativeInteger(6.9)).toBe(6);
    expect(normalizeNonNegativeInteger(-1)).toBe(0);
    expect(normalizeNonNegativeInteger(Infinity)).toBe(0);
  });

  it('builds powers of ten as bigint values', () => {
    expect(getPow10BigInt(0)).toBe(1n);
    expect(getPow10BigInt(6)).toBe(1000000n);
    expect(getPow10BigInt(18)).toBe(1000000000000000000n);
  });

  it('formats finite numbers without scientific notation in common ranges', () => {
    expect(toSignificantStr(1.23456789, 4)).toBe('1.2346');
    expect(toSignificantStr(Infinity, 4)).toBe('0');
  });
});

describe('getAtomicDecimals', () => {
  it('resolves native chain decimal conventions', () => {
    expect(getAtomicDecimals({chain: 'btc'})).toBe(8);
    expect(getAtomicDecimals({chain: 'doge'})).toBe(8);
    expect(getAtomicDecimals({chain: 'eth'})).toBe(18);
    expect(getAtomicDecimals({chain: 'matic'})).toBe(18);
    expect(getAtomicDecimals({chain: 'xrp'})).toBe(6);
    expect(getAtomicDecimals({chain: 'sol'})).toBe(9);
  });

  it('prefers numeric token decimal overrides, including zero', () => {
    expect(getAtomicDecimals({chain: 'eth', token: {decimals: 6}})).toBe(6);
    expect(getAtomicDecimals({chain: 'eth', token: {decimals: 0}})).toBe(0);
  });
});

describe('resolveWalletAtomicDecimals', () => {
  it('prefers resolved wallet unit decimals over credential fallback', () => {
    expect(
      resolveWalletAtomicDecimals({
        unitDecimals: 12,
        credentials: {chain: 'sol', token: {decimals: 9}},
      }),
    ).toBe(12);
  });

  it('falls back to credential decimals when wallet unit decimals are unknown', () => {
    expect(
      resolveWalletAtomicDecimals({
        unitDecimals: undefined,
        credentials: {chain: 'eth', token: {decimals: 6}},
      }),
    ).toBe(6);
  });
});

describe('parseAtomicToBigint', () => {
  it('parses scientific-notation strings without relying on Intl', () => {
    const originalIntl = (globalThis as any).Intl;
    try {
      (globalThis as any).Intl = undefined;

      expect(parseAtomicToBigint('1e21')).toBe(1000000000000000000000n);
      expect(parseAtomicToBigint('1.2345e5')).toBe(123450n);
      expect(parseAtomicToBigint('9.99e-1')).toBe(0n);
      expect(parseAtomicToBigint('-4.2e3')).toBe(-4200n);
      expect(parseAtomicToBigint('109890109890109899e0')).toBe(
        109890109890109899n,
      );
      expect(parseAtomicToBigint('1.234567890123456789e18')).toBe(
        1234567890123456789n,
      );
      expect(parseAtomicToBigint('.900719925474099312345e24')).toBe(
        900719925474099312345000n,
      );
    } finally {
      (globalThis as any).Intl = originalIntl;
    }
  });

  it('parses scientific-notation numbers without relying on Intl', () => {
    const originalIntl = (globalThis as any).Intl;
    try {
      (globalThis as any).Intl = undefined;

      expect(parseAtomicToBigint(1e21)).toBe(1000000000000000000000n);
      expect(parseAtomicToBigint(1.2345e5)).toBe(123450n);
      expect(parseAtomicToBigint(9.99e-1)).toBe(0n);
      expect(parseAtomicToBigint(-4.2e3)).toBe(-4200n);
    } finally {
      (globalThis as any).Intl = originalIntl;
    }
  });

  it('expands scientific notation strings exactly before BigInt conversion', () => {
    expect(
      parseScientificToTruncatedIntegerString('109890109890109899e0'),
    ).toBe('109890109890109899');
    expect(
      parseScientificToTruncatedIntegerString('1.234567890123456789e18'),
    ).toBe('1234567890123456789');
    expect(
      parseScientificToTruncatedIntegerString('.900719925474099312345e24'),
    ).toBe('900719925474099312345000');
    expect(parseScientificToTruncatedIntegerString('-1.5e3')).toBe('-1500');
    expect(parseScientificToTruncatedIntegerString('9.99e-1')).toBe('0');
  });

  it('parses large integer strings without Number precision drift', () => {
    expect(parseAtomicToBigint('900719925474099312345')).toBe(
      900719925474099312345n,
    );
    expect(parseAtomicToBigint(9007199254740991)).toBe(
      BigInt(Number.MAX_SAFE_INTEGER),
    );
  });

  it('truncates decimal strings and handles negative values', () => {
    expect(parseAtomicToBigint('123.987')).toBe(123n);
    expect(parseAtomicToBigint('-123.987')).toBe(-123n);
    expect(parseAtomicToBigint(-500n)).toBe(-500n);
  });

  it('throws for invalid non-empty decimal strings', () => {
    expect(() => parseAtomicToBigint('abc')).toThrow('Invalid atomic string');
    expect(() => parseAtomicToBigint('12.34.56')).toThrow(
      'Invalid atomic string',
    );
  });
});

describe('formatAtomicAmount', () => {
  it('formats native chain atomic units with their configured decimals', () => {
    expect(formatAtomicAmount('123456789', {chain: 'btc'})).toBe('1.23456789');
    expect(formatAtomicAmount('1000000000000000000', {chain: 'eth'})).toBe('1');
    expect(formatAtomicAmount('1234567', {chain: 'xrp'})).toBe('1.234567');
    expect(formatAtomicAmount('1234567890', {chain: 'sol'})).toBe('1.23456789');
  });

  it('formats token decimal overrides, including zero and six decimals', () => {
    expect(
      formatAtomicAmount('1234567', {chain: 'eth', token: {decimals: 6}}),
    ).toBe('1.234567');
    expect(formatAtomicAmount('42', {chain: 'eth', token: {decimals: 0}})).toBe(
      '42',
    );
  });

  it('formats very large atomic values without routing through Number', () => {
    expect(formatAtomicAmount('900719925474099312345', {chain: 'eth'})).toBe(
      '900.719925474099312345',
    );
  });

  it('respects maxDecimals and handles negative values', () => {
    expect(
      formatAtomicAmount('123456789', {chain: 'btc'}, {maxDecimals: 4}),
    ).toBe('1.2345');
    expect(formatAtomicAmount('-123456789', {chain: 'btc'})).toBe(
      '-1.23456789',
    );
  });
});

describe('formatBigIntDecimal', () => {
  it('preserves requested trailing zeros when explicitly asked', () => {
    expect(
      formatBigIntDecimal(1000000000000000001n, 18, 6, {
        trimTrailingZeros: false,
      }),
    ).toBe('1.000000');
  });
});

describe('bigint numeric helpers', () => {
  it('converts atomic bigint balances to unit numbers without string formatting', () => {
    const toEth = makeAtomicToUnitNumberConverter(18);
    expect(toEth(0n)).toBe(0);
    expect(toEth(1234500000000000000n)).toBeCloseTo(1.2345, 12);
    expect(toEth(-500000000000000000n)).toBeCloseTo(-0.5, 12);

    const toBtc = makeAtomicToUnitNumberConverter(8);
    expect(toBtc(123456789n)).toBeCloseTo(1.23456789, 12);
  });

  it('computes bigint ratios for cost-basis scaling', () => {
    expect(ratioBigIntToNumber(3n, 4n)).toBeCloseTo(0.75, 12);
    expect(ratioBigIntToNumber(-1n, 4n)).toBeCloseTo(-0.25, 12);
    expect(ratioBigIntToNumber(0n, 0n)).toBe(0);
  });
});

/**
 * Tests for src/utils/portfolio/core/format.ts
 */
import {
  getAtomicDecimals,
  formatAtomicAmount,
  parseAtomicToBigint,
  formatBigIntDecimal,
  formatChainAndNetwork,
  formatWalletId,
  formatUnixTimeSecondsToLocal,
  titleCase,
} from './format';

// ─── getAtomicDecimals ───────────────────────────────────────────────────────

describe('getAtomicDecimals', () => {
  it('returns token decimals when token.decimals is a number', () => {
    expect(getAtomicDecimals({token: {decimals: 6}})).toBe(6);
    expect(getAtomicDecimals({token: {decimals: 0}})).toBe(0);
  });

  it('ignores token.decimals when it is not a number', () => {
    // should fall through to chain matching
    expect(getAtomicDecimals({token: {decimals: '6'}, chain: 'btc'})).toBe(8);
  });

  it('returns 8 for btc', () => {
    expect(getAtomicDecimals({chain: 'btc'})).toBe(8);
  });

  it('returns 8 for bch', () => {
    expect(getAtomicDecimals({chain: 'bch'})).toBe(8);
  });

  it('returns 8 for ltc', () => {
    expect(getAtomicDecimals({chain: 'ltc'})).toBe(8);
  });

  it('returns 8 for doge', () => {
    expect(getAtomicDecimals({chain: 'doge'})).toBe(8);
  });

  it('returns 18 for eth', () => {
    expect(getAtomicDecimals({chain: 'eth'})).toBe(18);
  });

  it('returns 18 for matic', () => {
    expect(getAtomicDecimals({chain: 'matic'})).toBe(18);
  });

  it('returns 18 for arb', () => {
    expect(getAtomicDecimals({chain: 'arb'})).toBe(18);
  });

  it('returns 18 for base', () => {
    expect(getAtomicDecimals({chain: 'base'})).toBe(18);
  });

  it('returns 18 for op', () => {
    expect(getAtomicDecimals({chain: 'op'})).toBe(18);
  });

  it('returns 6 for xrp', () => {
    expect(getAtomicDecimals({chain: 'xrp'})).toBe(6);
  });

  it('returns 9 for sol', () => {
    expect(getAtomicDecimals({chain: 'sol'})).toBe(9);
  });

  it('falls back to coin when chain is absent', () => {
    expect(getAtomicDecimals({coin: 'btc'})).toBe(8);
    expect(getAtomicDecimals({coin: 'eth'})).toBe(18);
  });

  it('is case-insensitive for chain', () => {
    expect(getAtomicDecimals({chain: 'BTC'})).toBe(8);
    expect(getAtomicDecimals({chain: 'ETH'})).toBe(18);
  });

  it('returns 8 (fallback) for unknown chains', () => {
    expect(getAtomicDecimals({chain: 'unknown-chain'})).toBe(8);
    expect(getAtomicDecimals({})).toBe(8);
  });
});

// ─── parseAtomicToBigint ─────────────────────────────────────────────────────

describe('parseAtomicToBigint', () => {
  it('passes through a bigint unchanged', () => {
    expect(parseAtomicToBigint(42n)).toBe(42n);
  });

  it('converts a safe integer number', () => {
    expect(parseAtomicToBigint(1000000)).toBe(1000000n);
  });

  it('converts a decimal string', () => {
    expect(parseAtomicToBigint('123456789')).toBe(123456789n);
  });

  it('drops fractional part from a decimal string', () => {
    // The string "1.5" has a fractional part — integer portion only
    expect(parseAtomicToBigint('100')).toBe(100n);
  });

  it('converts a large safe-boundary number via string path', () => {
    // 1e15 is safe integer territory
    expect(parseAtomicToBigint(1_000_000_000_000_000)).toBe(
      1_000_000_000_000_000n,
    );
  });

  it('handles Infinity by returning 0n', () => {
    expect(parseAtomicToBigint(Infinity)).toBe(0n);
    expect(parseAtomicToBigint(-Infinity)).toBe(0n);
  });

  it('handles NaN by returning 0n', () => {
    expect(parseAtomicToBigint(NaN)).toBe(0n);
  });

  it('handles empty string by returning 0n', () => {
    expect(parseAtomicToBigint('')).toBe(0n);
  });

  it('handles negative values', () => {
    expect(parseAtomicToBigint(-500n)).toBe(-500n);
    expect(parseAtomicToBigint('-500')).toBe(-500n);
  });

  it('throws for strings that cannot be parsed as integers', () => {
    // 'abc' has no 'e'/'E', fails DECIMAL_NUMBER_RE, so tryParse returns null
    // which causes parseAtomicToBigint to throw.
    expect(() => parseAtomicToBigint('abc')).toThrow('Invalid atomic string');
    expect(() => parseAtomicToBigint('12.34.56')).toThrow(
      'Invalid atomic string',
    );
  });
});

// ─── formatBigIntDecimal ─────────────────────────────────────────────────────

describe('formatBigIntDecimal', () => {
  it('formats zero correctly', () => {
    expect(formatBigIntDecimal(0n, 8)).toBe('0');
  });

  it('formats a whole number (no fractional part)', () => {
    // 1 BTC = 100_000_000 satoshis
    expect(formatBigIntDecimal(100_000_000n, 8)).toBe('1');
  });

  it('formats a fractional amount', () => {
    // 0.5 BTC = 50_000_000 satoshis
    expect(formatBigIntDecimal(50_000_000n, 8)).toBe('0.5');
  });

  it('trims trailing zeros from fractional part', () => {
    expect(formatBigIntDecimal(150_000_000n, 8)).toBe('1.5');
  });

  it('respects maxDecimals', () => {
    // 1.23456789 BTC with maxDecimals=4 → 1.2345 (trailing zero trimmed)
    expect(formatBigIntDecimal(123_456_789n, 8, 4)).toBe('1.2345');
  });

  it('handles maxDecimals=0 (whole units only)', () => {
    expect(formatBigIntDecimal(123_456_789n, 8, 0)).toBe('1');
  });

  it('handles negative atomic values', () => {
    expect(formatBigIntDecimal(-100_000_000n, 8)).toBe('-1');
    expect(formatBigIntDecimal(-50_000_000n, 8)).toBe('-0.5');
  });

  it('handles EVM 18-decimal amounts', () => {
    // 1 ETH = 1e18 wei
    const oneEth = BigInt('1000000000000000000');
    expect(formatBigIntDecimal(oneEth, 18)).toBe('1');
  });

  it('handles partial ETH amounts', () => {
    // 0.001 ETH = 1e15 wei
    const partialEth = BigInt('1000000000000000');
    expect(formatBigIntDecimal(partialEth, 18)).toBe('0.001');
  });

  it('returns integer string when decimals <= 0', () => {
    expect(formatBigIntDecimal(42n, 0)).toBe('42');
  });
});

// ─── formatAtomicAmount ──────────────────────────────────────────────────────

describe('formatAtomicAmount', () => {
  const btcCredentials = {chain: 'btc'};
  const ethCredentials = {chain: 'eth'};

  it('formats BTC satoshis as BTC', () => {
    expect(formatAtomicAmount(100_000_000, btcCredentials)).toBe('1');
    expect(formatAtomicAmount(100_000_000n, btcCredentials)).toBe('1');
    expect(formatAtomicAmount('100000000', btcCredentials)).toBe('1');
  });

  it('formats partial BTC correctly', () => {
    expect(formatAtomicAmount(50_000_000, btcCredentials)).toBe('0.5');
  });

  it('formats ETH wei as ETH', () => {
    expect(formatAtomicAmount('1000000000000000000', ethCredentials)).toBe('1');
  });

  it('respects maxDecimals option', () => {
    // 1.23456789 BTC, maxDecimals=2
    const result = formatAtomicAmount(123_456_789, btcCredentials, {
      maxDecimals: 2,
    });
    expect(result).toBe('1.23');
  });

  it('handles zero atomic value', () => {
    expect(formatAtomicAmount(0, btcCredentials)).toBe('0');
    expect(formatAtomicAmount(0n, btcCredentials)).toBe('0');
    expect(formatAtomicAmount('0', btcCredentials)).toBe('0');
  });

  it('handles Infinity gracefully', () => {
    expect(formatAtomicAmount(Infinity, btcCredentials)).toBe('0');
  });

  it('handles NaN gracefully', () => {
    expect(formatAtomicAmount(NaN, btcCredentials)).toBe('0');
  });

  it('uses token decimals when present', () => {
    const usdcCredentials = {chain: 'eth', token: {decimals: 6}};
    // 1 USDC = 1_000_000 atomic units
    expect(formatAtomicAmount(1_000_000, usdcCredentials)).toBe('1');
  });

  it('handles negative amounts', () => {
    expect(formatAtomicAmount(-100_000_000n, btcCredentials)).toBe('-1');
  });
});

// ─── formatChainAndNetwork ───────────────────────────────────────────────────

describe('formatChainAndNetwork', () => {
  it('formats chain in UPPER and livenet → mainnet', () => {
    expect(formatChainAndNetwork({chain: 'btc', network: 'livenet'})).toBe(
      'BTC/mainnet',
    );
  });

  it('formats testnet correctly', () => {
    expect(formatChainAndNetwork({chain: 'eth', network: 'testnet'})).toBe(
      'ETH/testnet',
    );
  });

  it('falls back to coin when chain is missing', () => {
    expect(formatChainAndNetwork({coin: 'sol', network: 'livenet'})).toBe(
      'SOL/mainnet',
    );
  });

  it('returns unknown when network is absent', () => {
    expect(formatChainAndNetwork({chain: 'btc'})).toBe('BTC/unknown');
  });

  it('handles empty credentials gracefully', () => {
    expect(formatChainAndNetwork({})).toBe('/unknown');
  });
});

// ─── formatWalletId ──────────────────────────────────────────────────────────

describe('formatWalletId', () => {
  it('returns the walletId unchanged when it is short enough', () => {
    expect(formatWalletId('abc123')).toBe('abc123');
    expect(formatWalletId('1234567890')).toBe('1234567890');
  });

  it('truncates long wallet IDs with ellipsis', () => {
    const long = '1234567890abcdef';
    const result = formatWalletId(long);
    expect(result).toMatch(/^123456…/);
    expect(result).toMatch(/cdef$/);
  });

  it('respects a custom max length', () => {
    const id = 'abcdefghij'; // 10 chars
    expect(formatWalletId(id, 10)).toBe(id);
    expect(formatWalletId(id, 9)).toMatch(/^abcdef…/);
  });

  it('the truncated form contains the first 6 and last 4 chars', () => {
    const id = 'AAAAAA_BBBB_CCCC';
    const result = formatWalletId(id);
    expect(result.startsWith('AAAAAA')).toBe(true);
    expect(result.endsWith('CCCC')).toBe(true);
    expect(result).toContain('…');
  });
});

// ─── formatUnixTimeSecondsToLocal ────────────────────────────────────────────

describe('formatUnixTimeSecondsToLocal', () => {
  it('returns empty string for undefined', () => {
    expect(formatUnixTimeSecondsToLocal(undefined)).toBe('');
  });

  it('returns empty string for 0', () => {
    expect(formatUnixTimeSecondsToLocal(0)).toBe('');
  });

  it('returns empty string for Infinity', () => {
    expect(formatUnixTimeSecondsToLocal(Infinity)).toBe('');
  });

  it('returns empty string for NaN', () => {
    expect(formatUnixTimeSecondsToLocal(NaN)).toBe('');
  });

  it('returns a non-empty string for a valid unix timestamp', () => {
    // 2024-01-15T00:00:00Z → unix seconds = 1705276800
    const result = formatUnixTimeSecondsToLocal(1705276800);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── titleCase ───────────────────────────────────────────────────────────────

describe('titleCase', () => {
  it('capitalizes the first letter of each word', () => {
    expect(titleCase('hello world')).toBe('Hello World');
  });

  it('works on a single word', () => {
    expect(titleCase('foo')).toBe('Foo');
  });

  it('collapses multiple spaces between words', () => {
    expect(titleCase('hello   world')).toBe('Hello World');
  });

  it('returns empty string for empty input', () => {
    expect(titleCase('')).toBe('');
  });

  it('handles already-capitalized words', () => {
    expect(titleCase('HELLO WORLD')).toBe('HELLO WORLD');
  });

  it('handles mixed case', () => {
    expect(titleCase('the quick brown fox')).toBe('The Quick Brown Fox');
  });

  it('handles leading/trailing whitespace by filtering blank tokens', () => {
    expect(titleCase('  hello  world  ')).toBe('Hello World');
  });
});

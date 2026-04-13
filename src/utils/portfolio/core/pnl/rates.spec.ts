/**
 * Tests for src/utils/portfolio/core/pnl/rates.ts
 *
 * Covers normalizeFiatRateSeriesCoin and createFiatRateLookup with
 * concrete numeric inputs to catch regressions in rate-lookup math.
 */
import {normalizeFiatRateSeriesCoin, createFiatRateLookup} from './rates';
import type {FiatRateSeriesCache} from '../fiatRateSeries';
import {getFiatRateSeriesCacheKey} from '../fiatRateSeries';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

/** Build a FiatRateSeriesCache with a single coin/interval series. */
function makeCache(
  quoteCurrency: string,
  coin: string,
  interval: '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL',
  points: {ts: number; rate: number}[],
): FiatRateSeriesCache {
  const key = getFiatRateSeriesCacheKey(quoteCurrency, coin, interval);
  return {[key]: {fetchedOn: Date.now(), points}};
}

/** Merge multiple caches into one. */
function mergeCaches(...caches: FiatRateSeriesCache[]): FiatRateSeriesCache {
  return Object.assign({}, ...caches);
}

/** Build evenly-spaced points from startTs to endTs. */
function makePoints(
  startTs: number,
  endTs: number,
  startRate: number,
  endRate: number,
  count = 50,
): {ts: number; rate: number}[] {
  const pts: {ts: number; rate: number}[] = [];
  for (let i = 0; i < count; i++) {
    const frac = count === 1 ? 0 : i / (count - 1);
    pts.push({
      ts: Math.round(startTs + (endTs - startTs) * frac),
      rate: startRate + (endRate - startRate) * frac,
    });
  }
  return pts;
}

/** Build a flat (constant-rate) series. */
function flatPoints(
  startTs: number,
  endTs: number,
  rate: number,
  count = 50,
): {ts: number; rate: number}[] {
  return makePoints(startTs, endTs, rate, rate, count);
}

// ─── normalizeFiatRateSeriesCoin ──────────────────────────────────────────────

describe('normalizeFiatRateSeriesCoin', () => {
  it('returns "pol" for "matic"', () => {
    expect(normalizeFiatRateSeriesCoin('matic')).toBe('pol');
  });

  it('returns "pol" for "MATIC" (case-insensitive)', () => {
    expect(normalizeFiatRateSeriesCoin('MATIC')).toBe('pol');
  });

  it('returns "pol" for "pol"', () => {
    expect(normalizeFiatRateSeriesCoin('pol')).toBe('pol');
  });

  it('returns "pol" for "POL" (case-insensitive)', () => {
    expect(normalizeFiatRateSeriesCoin('POL')).toBe('pol');
  });

  it('lowercases btc', () => {
    expect(normalizeFiatRateSeriesCoin('BTC')).toBe('btc');
  });

  it('lowercases eth', () => {
    expect(normalizeFiatRateSeriesCoin('ETH')).toBe('eth');
  });

  it('lowercases arbitrary uppercase coin', () => {
    expect(normalizeFiatRateSeriesCoin('SOL')).toBe('sol');
  });

  it('handles already-lowercase coin', () => {
    expect(normalizeFiatRateSeriesCoin('sol')).toBe('sol');
  });

  it('returns empty string for undefined', () => {
    expect(normalizeFiatRateSeriesCoin(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(normalizeFiatRateSeriesCoin('')).toBe('');
  });

  it('does not alter non-matic coins', () => {
    expect(normalizeFiatRateSeriesCoin('usdc')).toBe('usdc');
    expect(normalizeFiatRateSeriesCoin('xrp')).toBe('xrp');
  });
});

// ─── createFiatRateLookup — basic rate resolution ────────────────────────────

describe('createFiatRateLookup — basic nearest-rate lookup', () => {
  const nowMs = 1_000 * MS_PER_DAY; // arbitrary epoch anchor

  it('returns the exact rate when the target ts matches a point exactly', () => {
    const ts = nowMs - MS_PER_HOUR; // 1-hour-old → age ≤ 1D → prefers 1D
    const cache = makeCache('USD', 'btc', '1D', [{ts, rate: 50000}]);
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(ts)).toBe(50000);
  });

  it('picks the nearest point when no exact match exists', () => {
    const base = nowMs - 2 * MS_PER_HOUR;
    const cache = makeCache('USD', 'btc', '1D', [
      {ts: base, rate: 40000},
      {ts: base + MS_PER_HOUR, rate: 45000},
      {ts: base + 2 * MS_PER_HOUR, rate: 50000},
    ]);
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    // target is 15 min after second point — closer to second than third
    const target = base + MS_PER_HOUR + 15 * 60 * 1000;
    expect(lookup.getNearestRate(target)).toBe(45000);
  });

  it('returns undefined when cache is empty', () => {
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache: {},
      nowMs,
    });
    expect(lookup.getNearestRate(nowMs - MS_PER_HOUR)).toBeUndefined();
  });

  it('returns undefined for a non-finite target timestamp', () => {
    const cache = makeCache('USD', 'btc', '1D', [
      {ts: nowMs - MS_PER_HOUR, rate: 50000},
    ]);
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(NaN)).toBeUndefined();
    expect(lookup.getNearestRate(Infinity)).toBeUndefined();
    expect(lookup.getNearestRate(-Infinity)).toBeUndefined();
  });

  it('resolves rate from 1W series when age is between 1D and 7D', () => {
    const ts = nowMs - 3 * MS_PER_DAY; // age = 3 days → prefers 1W
    const cache = makeCache(
      'USD',
      'btc',
      '1W',
      flatPoints(nowMs - 7 * MS_PER_DAY, nowMs, 30000),
    );
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    const rate = lookup.getNearestRate(ts);
    expect(typeof rate).toBe('number');
    expect(rate).toBeCloseTo(30000, 0);
  });

  it('resolves rate from ALL series for very old timestamps (> 5Y)', () => {
    const veryOldTs = nowMs - 2000 * MS_PER_DAY; // ~5.5 years ago
    const cache = makeCache('USD', 'btc', 'ALL', [
      {ts: veryOldTs - MS_PER_DAY, rate: 5000},
      {ts: veryOldTs, rate: 6000},
      {ts: veryOldTs + MS_PER_DAY, rate: 7000},
    ]);
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(veryOldTs)).toBe(6000);
  });

  it('falls back to a lower-priority interval when preferred is absent', () => {
    // Age = 2 hours → prefers 1D, but 1D is empty; 1W is populated
    const ts = nowMs - 2 * MS_PER_HOUR;
    const cache = makeCache('USD', 'btc', '1W', [
      {ts: ts - MS_PER_HOUR, rate: 20000},
      {ts, rate: 21000},
    ]);
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    const rate = lookup.getNearestRate(ts);
    expect(rate).toBe(21000);
  });

  it('skips points with non-finite rates and falls back to next interval', () => {
    const ts = nowMs - MS_PER_HOUR;
    // 1D has NaN rate, 1W has a valid rate
    const cache = mergeCaches(
      makeCache('USD', 'btc', '1D', [{ts, rate: NaN}]),
      makeCache('USD', 'btc', '1W', [{ts: ts - 60000, rate: 99999}]),
    );
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(ts)).toBe(99999);
  });

  it('handles out-of-order points by sorting them', () => {
    // Points deliberately unsorted
    const ts = nowMs - MS_PER_HOUR;
    const cache = makeCache('USD', 'btc', '1D', [
      {ts: ts + 30 * 60 * 1000, rate: 52000},
      {ts: ts - 30 * 60 * 1000, rate: 48000},
      {ts, rate: 50000},
    ]);
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    // Target equals the middle point exactly
    expect(lookup.getNearestRate(ts)).toBe(50000);
  });

  it('handles monotonically increasing queries efficiently (fast path)', () => {
    const start = nowMs - MS_PER_HOUR;
    const pts = flatPoints(start, nowMs, 1000, 10);
    const cache = makeCache('USD', 'btc', '1D', pts);
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    // Query each point in ascending order
    for (const p of pts) {
      expect(lookup.getNearestRate(p.ts)).toBe(1000);
    }
  });

  it('handles non-monotonic (backward) queries via binary search', () => {
    const start = nowMs - 10 * MS_PER_HOUR;
    const pts = makePoints(start, nowMs, 100, 200, 20);
    const cache = makeCache('USD', 'btc', '1D', pts);
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    // Query newest first, then oldest
    const newestRate = lookup.getNearestRate(nowMs);
    const oldestRate = lookup.getNearestRate(start);
    expect(typeof newestRate).toBe('number');
    expect(typeof oldestRate).toBe('number');
    expect(newestRate).toBeGreaterThan(oldestRate!);
  });

  it('returns the single point when array has exactly one element', () => {
    const ts = nowMs - MS_PER_HOUR;
    const cache = makeCache('USD', 'btc', '1D', [{ts, rate: 77777}]);
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(ts)).toBe(77777);
    // Target before the only point → still returns it (clamped)
    expect(lookup.getNearestRate(ts - MS_PER_HOUR)).toBe(77777);
    // Target after the only point → still returns it (no right neighbor)
    expect(lookup.getNearestRate(ts + MS_PER_HOUR)).toBe(77777);
  });
});

// ─── createFiatRateLookup — BTC-bridge fallback ──────────────────────────────

describe('createFiatRateLookup — BTC-bridge currency conversion', () => {
  const nowMs = 2_000 * MS_PER_DAY;
  const ts = nowMs - MS_PER_HOUR;

  /**
   * Helper: build a cache with:
   *   coin@bridge = bridgeCoinRate
   *   BTC@bridge  = bridgeBtcRate
   *   BTC@source  = sourceBtcRate
   *
   * Expected synthesized coin@source = bridgeCoinRate * (sourceBtcRate / bridgeBtcRate)
   */
  function makeBridgeCache(args: {
    coin: string;
    bridgeQuoteCurrency: string;
    sourceQuoteCurrency: string;
    bridgeCoinRate: number;
    bridgeBtcRate: number;
    sourceBtcRate: number;
  }): FiatRateSeriesCache {
    const pt = (rate: number) => [{ts, rate}];
    return mergeCaches(
      makeCache(
        args.bridgeQuoteCurrency,
        args.coin,
        '1D',
        pt(args.bridgeCoinRate),
      ),
      makeCache(args.bridgeQuoteCurrency, 'btc', '1D', pt(args.bridgeBtcRate)),
      makeCache(args.sourceQuoteCurrency, 'btc', '1D', pt(args.sourceBtcRate)),
    );
  }

  it('synthesizes coin@source = bridgeCoinRate * (sourceBtcRate / bridgeBtcRate)', () => {
    // ETH in EUR, bridge via USD:
    //   ETH@USD = 3000, BTC@USD = 60000, BTC@EUR = 50000
    //   ETH@EUR ≈ 3000 * (50000 / 60000) = 2500
    const cache = makeBridgeCache({
      coin: 'eth',
      bridgeQuoteCurrency: 'USD',
      sourceQuoteCurrency: 'EUR',
      bridgeCoinRate: 3000,
      bridgeBtcRate: 60000,
      sourceBtcRate: 50000,
    });
    const lookup = createFiatRateLookup({
      quoteCurrency: 'EUR',
      coin: 'eth',
      cache,
      nowMs,
      bridgeQuoteCurrency: 'USD',
    });
    const rate = lookup.getNearestRate(ts);
    expect(rate).toBeCloseTo(2500, 5);
  });

  it('returns undefined from bridge when bridgeCoinRate is zero', () => {
    const cache = makeBridgeCache({
      coin: 'eth',
      bridgeQuoteCurrency: 'USD',
      sourceQuoteCurrency: 'EUR',
      bridgeCoinRate: 0,
      bridgeBtcRate: 60000,
      sourceBtcRate: 50000,
    });
    const lookup = createFiatRateLookup({
      quoteCurrency: 'EUR',
      coin: 'eth',
      cache,
      nowMs,
      bridgeQuoteCurrency: 'USD',
    });
    expect(lookup.getNearestRate(ts)).toBeUndefined();
  });

  it('returns undefined from bridge when bridgeBtcRate is zero', () => {
    const cache = makeBridgeCache({
      coin: 'eth',
      bridgeQuoteCurrency: 'USD',
      sourceQuoteCurrency: 'EUR',
      bridgeCoinRate: 3000,
      bridgeBtcRate: 0,
      sourceBtcRate: 50000,
    });
    const lookup = createFiatRateLookup({
      quoteCurrency: 'EUR',
      coin: 'eth',
      cache,
      nowMs,
      bridgeQuoteCurrency: 'USD',
    });
    expect(lookup.getNearestRate(ts)).toBeUndefined();
  });

  it('returns undefined from bridge when sourceBtcRate is zero', () => {
    const cache = makeBridgeCache({
      coin: 'eth',
      bridgeQuoteCurrency: 'USD',
      sourceQuoteCurrency: 'EUR',
      bridgeCoinRate: 3000,
      bridgeBtcRate: 60000,
      sourceBtcRate: 0,
    });
    const lookup = createFiatRateLookup({
      quoteCurrency: 'EUR',
      coin: 'eth',
      cache,
      nowMs,
      bridgeQuoteCurrency: 'USD',
    });
    expect(lookup.getNearestRate(ts)).toBeUndefined();
  });

  it('does NOT use bridge for BTC (coin === btc) — resolves EUR:btc directly if present', () => {
    // canBridge is always false when coin === 'btc', regardless of bridgeQuoteCurrency.
    // If EUR:btc IS in the cache, it should be returned from the direct series.
    const directTs = ts;
    const cache = makeCache('EUR', 'btc', '1D', [{ts: directTs, rate: 50000}]);
    const lookup = createFiatRateLookup({
      quoteCurrency: 'EUR',
      coin: 'btc',
      cache,
      nowMs,
      bridgeQuoteCurrency: 'USD',
    });
    // Direct EUR:btc series is present — returns rate without bridging
    expect(lookup.getNearestRate(directTs)).toBe(50000);
  });

  it('does NOT use bridge for BTC when direct EUR:btc series is absent', () => {
    // No EUR:btc series at all — bridge is disabled for btc, so returns undefined
    const cache = mergeCaches(
      makeCache('USD', 'btc', '1D', [{ts, rate: 60000}]),
    );
    const lookup = createFiatRateLookup({
      quoteCurrency: 'EUR',
      coin: 'btc',
      cache,
      nowMs,
      bridgeQuoteCurrency: 'USD',
    });
    expect(lookup.getNearestRate(ts)).toBeUndefined();
  });

  it('does NOT use bridge when bridgeQuoteCurrency equals quoteCurrency', () => {
    const cache = makeBridgeCache({
      coin: 'eth',
      bridgeQuoteCurrency: 'USD',
      sourceQuoteCurrency: 'USD',
      bridgeCoinRate: 3000,
      bridgeBtcRate: 60000,
      sourceBtcRate: 60000,
    });
    // The direct USD:eth:1D series IS in the cache, so it should resolve from there
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'eth',
      cache,
      nowMs,
      bridgeQuoteCurrency: 'USD', // same as source — bridge disabled
    });
    expect(lookup.getNearestRate(ts)).toBe(3000);
  });

  it('returns undefined when no bridge quote currency is provided and direct series is missing', () => {
    const lookup = createFiatRateLookup({
      quoteCurrency: 'EUR',
      coin: 'eth',
      cache: {},
      nowMs,
    });
    expect(lookup.getNearestRate(ts)).toBeUndefined();
  });

  it('uses bridge lazily — bridge lookups are only created when needed', () => {
    // Direct USD:eth:1D series present — bridge should NOT be consulted
    const cache = mergeCaches(
      makeCache('USD', 'eth', '1D', [{ts, rate: 3000}]),
    );
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'eth',
      cache,
      nowMs,
      bridgeQuoteCurrency: 'EUR',
    });
    // Should resolve directly without needing any bridge series
    expect(lookup.getNearestRate(ts)).toBe(3000);
  });

  it('bridge result is positive and finite for valid inputs', () => {
    const cache = makeBridgeCache({
      coin: 'sol',
      bridgeQuoteCurrency: 'USD',
      sourceQuoteCurrency: 'GBP',
      bridgeCoinRate: 150,
      bridgeBtcRate: 60000,
      sourceBtcRate: 48000,
    });
    const lookup = createFiatRateLookup({
      quoteCurrency: 'GBP',
      coin: 'sol',
      cache,
      nowMs,
      bridgeQuoteCurrency: 'USD',
    });
    const rate = lookup.getNearestRate(ts);
    // sol@GBP = 150 * (48000 / 60000) = 120
    expect(rate).toBeCloseTo(120, 5);
    expect(rate).toBeGreaterThan(0);
    expect(Number.isFinite(rate)).toBe(true);
  });
});

// ─── createFiatRateLookup — interval preference by age ───────────────────────

describe('createFiatRateLookup — interval preference by transaction age', () => {
  const nowMs = 3_000 * MS_PER_DAY;

  const makeSimpleCache = (
    interval: '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL',
    ts: number,
    rate: number,
  ) => makeCache('USD', 'btc', interval, [{ts, rate}]);

  it('prefers 1D series for timestamps within the last day', () => {
    const ts = nowMs - 12 * MS_PER_HOUR;
    const cache = mergeCaches(
      makeSimpleCache('1D', ts, 11111),
      makeSimpleCache('1W', ts, 22222),
    );
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(ts)).toBe(11111);
  });

  it('prefers 1W series for timestamps 1–7 days old', () => {
    const ts = nowMs - 4 * MS_PER_DAY;
    const cache = mergeCaches(
      makeSimpleCache('1W', ts, 33333),
      makeSimpleCache('1M', ts, 44444),
    );
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(ts)).toBe(33333);
  });

  it('prefers 1M series for timestamps 7–30 days old', () => {
    const ts = nowMs - 15 * MS_PER_DAY;
    const cache = mergeCaches(
      makeSimpleCache('1M', ts, 55555),
      makeSimpleCache('3M', ts, 66666),
    );
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(ts)).toBe(55555);
  });

  it('prefers 3M series for timestamps 30–90 days old', () => {
    const ts = nowMs - 60 * MS_PER_DAY;
    const cache = mergeCaches(
      makeSimpleCache('3M', ts, 77777),
      makeSimpleCache('1Y', ts, 88888),
    );
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(ts)).toBe(77777);
  });

  it('prefers 1Y series for timestamps 90–365 days old', () => {
    const ts = nowMs - 200 * MS_PER_DAY;
    const cache = mergeCaches(
      makeSimpleCache('1Y', ts, 12345),
      makeSimpleCache('5Y', ts, 99999),
    );
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(ts)).toBe(12345);
  });

  it('prefers 5Y series for timestamps 365–1825 days old', () => {
    const ts = nowMs - 700 * MS_PER_DAY;
    const cache = mergeCaches(
      makeSimpleCache('5Y', ts, 8888),
      makeSimpleCache('ALL', ts, 1111),
    );
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(ts)).toBe(8888);
  });

  it('prefers ALL series for timestamps > 1825 days old', () => {
    const ts = nowMs - 2000 * MS_PER_DAY;
    const cache = makeSimpleCache('ALL', ts, 4444);
    const lookup = createFiatRateLookup({
      quoteCurrency: 'USD',
      coin: 'btc',
      cache,
      nowMs,
    });
    expect(lookup.getNearestRate(ts)).toBe(4444);
  });
});

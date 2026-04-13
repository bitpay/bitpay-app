/**
 * Tests for src/utils/portfolio/rate.ts
 */
import {
  getFiatRateFromSeriesCacheAtTimestamp,
  getWindowMsForFiatRateTimeframe,
  getFiatRateBaselineTsForTimeframe,
  getFiatRateSeriesIntervalForTimeframe,
  getFiatRateTimeframeConfig,
  getFiatRateChangeForTimeframe,
  alignTimestamps,
  downsampleSeries,
  downsampleTimestamps,
  trimTimestamps,
} from './rate';
import type {
  RatePoint,
  RatesByCoin,
  AlignedRatesByCoin,
  FiatRateTimeframeConfig,
  FiatRateChangeForTimeframe,
} from './rate';
import type {
  FiatRateSeriesCache,
  FiatRateInterval,
  FiatRatePoint,
} from '../../store/rate/rate.models';
import {getFiatRateSeriesCacheKey} from '../../store/rate/rate.models';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Build a FiatRateSeriesCache with a simple ascending rate series. */
function makeCache(
  fiatCode: string,
  coin: string,
  interval: FiatRateInterval,
  points: FiatRatePoint[],
): FiatRateSeriesCache {
  const key = getFiatRateSeriesCacheKey(fiatCode, coin, interval);
  return {[key]: {fetchedOn: Date.now(), points}};
}

/** Build N evenly spaced rate points starting from baseTs with a given step. */
function makePoints(
  n: number,
  baseTs: number,
  stepMs: number,
  startRate: number = 100,
  rateStep: number = 1,
): FiatRatePoint[] {
  return Array.from({length: n}, (_, i) => ({
    ts: baseTs + i * stepMs,
    rate: startRate + i * rateStep,
  }));
}

/** Build RatePoint[] (ts + rate) for alignTimestamps tests. */
function makeRatePoints(
  n: number,
  baseTs: number,
  stepMs: number,
  startRate: number = 1,
): RatePoint[] {
  return Array.from({length: n}, (_, i) => ({
    ts: baseTs + i * stepMs,
    rate: startRate + i,
  }));
}

// ─── getWindowMsForFiatRateTimeframe ─────────────────────────────────────────

describe('getWindowMsForFiatRateTimeframe', () => {
  it('returns 1 day for 1D', () => {
    expect(getWindowMsForFiatRateTimeframe('1D')).toBe(1 * MS_PER_DAY);
  });

  it('returns 7 days for 1W', () => {
    expect(getWindowMsForFiatRateTimeframe('1W')).toBe(7 * MS_PER_DAY);
  });

  it('returns 30 days for 1M', () => {
    expect(getWindowMsForFiatRateTimeframe('1M')).toBe(30 * MS_PER_DAY);
  });

  it('returns 90 days for 3M', () => {
    expect(getWindowMsForFiatRateTimeframe('3M')).toBe(90 * MS_PER_DAY);
  });

  it('returns 365 days for 1Y', () => {
    expect(getWindowMsForFiatRateTimeframe('1Y')).toBe(365 * MS_PER_DAY);
  });

  it('returns 1825 days for 5Y', () => {
    expect(getWindowMsForFiatRateTimeframe('5Y')).toBe(1825 * MS_PER_DAY);
  });

  it('returns 0 for ALL (no fixed window)', () => {
    expect(getWindowMsForFiatRateTimeframe('ALL')).toBe(0);
  });
});

// ─── getFiatRateSeriesIntervalForTimeframe ────────────────────────────────────

describe('getFiatRateSeriesIntervalForTimeframe', () => {
  it('maps 3M to ALL (uses full series)', () => {
    expect(getFiatRateSeriesIntervalForTimeframe('3M')).toBe('ALL');
  });

  it('maps 1Y to ALL', () => {
    expect(getFiatRateSeriesIntervalForTimeframe('1Y')).toBe('ALL');
  });

  it('maps 5Y to ALL', () => {
    expect(getFiatRateSeriesIntervalForTimeframe('5Y')).toBe('ALL');
  });

  it('returns 1D for 1D', () => {
    expect(getFiatRateSeriesIntervalForTimeframe('1D')).toBe('1D');
  });

  it('returns 1W for 1W', () => {
    expect(getFiatRateSeriesIntervalForTimeframe('1W')).toBe('1W');
  });

  it('returns 1M for 1M', () => {
    expect(getFiatRateSeriesIntervalForTimeframe('1M')).toBe('1M');
  });

  it('returns ALL for ALL', () => {
    expect(getFiatRateSeriesIntervalForTimeframe('ALL')).toBe('ALL');
  });
});

// ─── getFiatRateBaselineTsForTimeframe ────────────────────────────────────────

describe('getFiatRateBaselineTsForTimeframe', () => {
  const nowMs = new Date('2024-06-15T12:30:00Z').getTime();

  it('returns undefined for ALL timeframe', () => {
    expect(
      getFiatRateBaselineTsForTimeframe({timeframe: 'ALL', nowMs}),
    ).toBeUndefined();
  });

  it('returns 24h ago (rounded down to hour) for 1D', () => {
    const result = getFiatRateBaselineTsForTimeframe({
      timeframe: '1D',
      nowMs,
    });
    // Must be exactly 24h behind nowMs, truncated to the hour
    const lastDay = nowMs - MS_PER_DAY;
    const expected = Math.floor(lastDay / MS_PER_HOUR) * MS_PER_HOUR;
    expect(result).toBe(expected);
  });

  it('returns 7 days ago (rounded down to hour) for 1W', () => {
    const result = getFiatRateBaselineTsForTimeframe({
      timeframe: '1W',
      nowMs,
    });
    const windowMs = 7 * MS_PER_DAY;
    const expected = Math.floor((nowMs - windowMs) / MS_PER_HOUR) * MS_PER_HOUR;
    expect(result).toBe(expected);
  });

  it('returns 30 days ago for 1M', () => {
    const result = getFiatRateBaselineTsForTimeframe({
      timeframe: '1M',
      nowMs,
    });
    const windowMs = 30 * MS_PER_DAY;
    const expected = Math.floor((nowMs - windowMs) / MS_PER_HOUR) * MS_PER_HOUR;
    expect(result).toBe(expected);
  });

  it('returns 90 days ago for 3M', () => {
    const result = getFiatRateBaselineTsForTimeframe({
      timeframe: '3M',
      nowMs,
    });
    const windowMs = 90 * MS_PER_DAY;
    const expected = Math.floor((nowMs - windowMs) / MS_PER_HOUR) * MS_PER_HOUR;
    expect(result).toBe(expected);
  });

  it('uses Date.now() when nowMs is omitted', () => {
    const before = Date.now();
    const result = getFiatRateBaselineTsForTimeframe({timeframe: '1W'});
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(
      Math.floor((before - 7 * MS_PER_DAY) / MS_PER_HOUR) * MS_PER_HOUR,
    );
    expect(result).toBeLessThanOrEqual(
      Math.floor((after - 7 * MS_PER_DAY) / MS_PER_HOUR) * MS_PER_HOUR +
        MS_PER_HOUR,
    );
  });
});

// ─── getFiatRateTimeframeConfig ───────────────────────────────────────────────

describe('getFiatRateTimeframeConfig', () => {
  const nowMs = new Date('2024-01-01T00:00:00Z').getTime();

  it('returns correct windowMs for 1D', () => {
    const cfg = getFiatRateTimeframeConfig({timeframe: '1D', nowMs});
    expect(cfg.windowMs).toBe(MS_PER_DAY);
    expect(cfg.seriesInterval).toBe('1D');
    expect(typeof cfg.baselineTimestampMs).toBe('number');
  });

  it('returns windowMs 0 for ALL and undefined baseline', () => {
    const cfg = getFiatRateTimeframeConfig({timeframe: 'ALL', nowMs});
    expect(cfg.windowMs).toBe(0);
    expect(cfg.baselineTimestampMs).toBeUndefined();
    expect(cfg.seriesInterval).toBe('ALL');
  });

  it('maps 3M seriesInterval to ALL', () => {
    const cfg = getFiatRateTimeframeConfig({timeframe: '3M', nowMs});
    expect(cfg.seriesInterval).toBe('ALL');
    expect(cfg.windowMs).toBe(90 * MS_PER_DAY);
  });

  it('uses Date.now() when nowMs is not provided', () => {
    const cfg = getFiatRateTimeframeConfig({timeframe: '1W'});
    expect(cfg.windowMs).toBe(7 * MS_PER_DAY);
    expect(cfg.baselineTimestampMs).toBeDefined();
  });
});

// ─── getFiatRateFromSeriesCacheAtTimestamp ────────────────────────────────────

describe('getFiatRateFromSeriesCacheAtTimestamp', () => {
  const baseTs = 1_000_000;
  const stepMs = 60_000; // 1 min intervals
  const points = makePoints(10, baseTs, stepMs, 100, 10);
  // rates: 100,110,120,...190 at baseTs, baseTs+1min, ...

  const cache = makeCache('USD', 'BTC', '1D', points);

  it('returns undefined when cache is undefined', () => {
    const result = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: undefined,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      interval: '1D',
      timestampMs: baseTs,
    });
    expect(result).toBeUndefined();
  });

  it('returns nearest rate by default (no method specified)', () => {
    const result = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      interval: '1D',
      timestampMs: baseTs,
    });
    expect(result).toBe(100);
  });

  it('returns exact rate when ts matches exactly (nearest)', () => {
    const result = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      interval: '1D',
      timestampMs: baseTs + 2 * stepMs,
    });
    expect(result).toBe(120);
  });

  it('returns nearest point when ts is between two points (nearest)', () => {
    // ts = baseTs + 1.4 * stepMs → closer to index 1 (110) than index 2 (120)
    const result = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      interval: '1D',
      timestampMs: baseTs + Math.floor(1.4 * stepMs),
    });
    expect(result).toBe(110);
  });

  it('returns linearly interpolated rate when method is linear', () => {
    // midpoint between index 0 (100) and index 1 (110) → expect 105
    const midTs = baseTs + Math.floor(0.5 * stepMs);
    const result = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      interval: '1D',
      timestampMs: midTs,
      method: 'linear',
    });
    expect(result).toBeCloseTo(105, 0);
  });

  it('returns undefined for a cache key that does not exist', () => {
    const result = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: cache,
      fiatCode: 'EUR', // wrong fiat
      currencyAbbreviation: 'BTC',
      interval: '1D',
      timestampMs: baseTs,
    });
    expect(result).toBeUndefined();
  });

  it('returns first rate when ts is before all points (nearest)', () => {
    const result = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      interval: '1D',
      timestampMs: baseTs - 99999,
    });
    expect(result).toBe(100);
  });

  it('returns last rate when ts is after all points (nearest)', () => {
    const result = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      interval: '1D',
      timestampMs: baseTs + 100 * stepMs,
    });
    expect(result).toBe(190);
  });

  it('handles MATIC coin normalization (MATIC → POL)', () => {
    const maticPoints = makePoints(5, baseTs, stepMs, 200, 5);
    // normalizeFiatRateSeriesCoin maps 'matic' → 'pol'
    const maticCacheKey = getFiatRateSeriesCacheKey('USD', 'pol', '1D');
    const maticCache: FiatRateSeriesCache = {
      [maticCacheKey]: {fetchedOn: Date.now(), points: maticPoints},
    };
    const result = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: maticCache,
      fiatCode: 'USD',
      currencyAbbreviation: 'MATIC',
      interval: '1D',
      timestampMs: baseTs,
    });
    expect(result).toBe(200);
  });
});

// ─── getFiatRateChangeForTimeframe ────────────────────────────────────────────

describe('getFiatRateChangeForTimeframe', () => {
  const nowMs = 10_000_000;
  // Create a simple series covering the full window for 1W
  const windowMs = 7 * MS_PER_DAY;
  // baseline is nowMs - windowMs (rounded to hour)
  const baselineMs = Math.floor((nowMs - windowMs) / MS_PER_HOUR) * MS_PER_HOUR;
  // Build points: one at baselineMs (rate=100) and one at nowMs (rate=150)
  const points: FiatRatePoint[] = [
    {ts: baselineMs, rate: 100},
    {ts: nowMs, rate: 150},
  ];
  const cache = makeCache('USD', 'BTC', '1W', points);

  it('returns undefined when cache is undefined', () => {
    const result = getFiatRateChangeForTimeframe({
      fiatRateSeriesCache: undefined,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      timeframe: '1W',
      nowMs,
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined when points are not in cache', () => {
    // cache has 1W but we ask for EUR
    const result = getFiatRateChangeForTimeframe({
      fiatRateSeriesCache: cache,
      fiatCode: 'EUR',
      currencyAbbreviation: 'BTC',
      timeframe: '1W',
      nowMs,
    });
    expect(result).toBeUndefined();
  });

  it('computes correct priceChange and percentChange for 1W', () => {
    const result = getFiatRateChangeForTimeframe({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      timeframe: '1W',
      nowMs,
      currentRate: 150,
    });
    expect(result).not.toBeUndefined();
    expect(result!.priceChange).toBeCloseTo(50, 5);
    expect(result!.percentChange).toBeCloseTo(50, 1);
    expect(result!.percentRatio).toBeCloseTo(0.5, 5);
    expect(result!.baselineRate).toBe(100);
    expect(result!.currentRate).toBe(150);
    expect(result!.timeframe).toBe('1W');
  });

  it('uses provided currentRate instead of computing from series', () => {
    const result = getFiatRateChangeForTimeframe({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      timeframe: '1W',
      nowMs,
      currentRate: 200,
    });
    expect(result!.currentRate).toBe(200);
    expect(result!.priceChange).toBeCloseTo(100, 5);
  });

  it('falls back to series for currentRate when not provided', () => {
    // points at nowMs has rate=150
    const result = getFiatRateChangeForTimeframe({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      timeframe: '1W',
      nowMs,
    });
    expect(result).not.toBeUndefined();
    // nearest rate at nowMs is 150
    expect(result!.currentRate).toBe(150);
  });

  it('uses first point as baseline for ALL timeframe', () => {
    const allPoints: FiatRatePoint[] = [
      {ts: 1000, rate: 50},
      {ts: 2000, rate: 100},
      {ts: nowMs, rate: 150},
    ];
    const allCache = makeCache('USD', 'BTC', 'ALL', allPoints);
    const result = getFiatRateChangeForTimeframe({
      fiatRateSeriesCache: allCache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      timeframe: 'ALL',
      nowMs,
      currentRate: 150,
    });
    expect(result).not.toBeUndefined();
    expect(result!.baselineRate).toBe(50);
    expect(result!.baselineTimestampMs).toBe(1000);
    expect(result!.priceChange).toBeCloseTo(100, 5);
    expect(result!.percentChange).toBeCloseTo(200, 1);
  });

  it('returns undefined for ALL when first point rate is 0', () => {
    const badPoints: FiatRatePoint[] = [
      {ts: 1000, rate: 0}, // invalid — rate must be > 0
      {ts: 2000, rate: 100},
    ];
    const badCache = makeCache('USD', 'BTC', 'ALL', badPoints);
    const result = getFiatRateChangeForTimeframe({
      fiatRateSeriesCache: badCache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      timeframe: 'ALL',
      nowMs,
      currentRate: 100,
    });
    expect(result).toBeUndefined();
  });

  it('falls back to series lookup when currentRate is Infinity (not treated as valid)', () => {
    // When currentRate is Infinity, Number.isFinite check fails → falls back to
    // looking up currentRate from the series. The series has a point at nowMs=150,
    // so a valid result is returned.
    const result = getFiatRateChangeForTimeframe({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      timeframe: '1W',
      nowMs,
      currentRate: Infinity,
    });
    // Falls back to nearest point at nowMs → 150
    expect(result).not.toBeUndefined();
    expect(result!.currentRate).toBe(150);
  });

  it('uses linear method by default', () => {
    // With only 2 points, linear interpolation at baseline equals first point exactly
    const result = getFiatRateChangeForTimeframe({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      timeframe: '1W',
      nowMs,
      currentRate: 150,
    });
    expect(result).not.toBeUndefined();
    // baseline at baselineMs → exactly rate=100 (linear returns left.rate at exact point)
    expect(result!.baselineRate).toBeCloseTo(100, 5);
  });

  it('supports nearest method via options', () => {
    const result = getFiatRateChangeForTimeframe({
      fiatRateSeriesCache: cache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      timeframe: '1W',
      nowMs,
      currentRate: 150,
      method: 'nearest',
    });
    expect(result).not.toBeUndefined();
    expect(result!.baselineRate).toBe(100);
  });

  it('handles 3M which uses ALL series interval internally', () => {
    const allPoints: FiatRatePoint[] = [
      {ts: 1000, rate: 80},
      {ts: nowMs, rate: 160},
    ];
    const allCache = makeCache('USD', 'BTC', 'ALL', allPoints);
    const result = getFiatRateChangeForTimeframe({
      fiatRateSeriesCache: allCache,
      fiatCode: 'USD',
      currencyAbbreviation: 'BTC',
      timeframe: '3M',
      nowMs,
      currentRate: 160,
    });
    expect(result).not.toBeUndefined();
    expect(result!.timeframe).toBe('3M');
  });
});

// ─── alignTimestamps ──────────────────────────────────────────────────────────

describe('alignTimestamps', () => {
  it('returns empty object for empty input', () => {
    expect(alignTimestamps({})).toEqual({});
  });

  it('returns empty arrays for coins with no points', () => {
    const result = alignTimestamps({BTC: [], ETH: []});
    expect(result.BTC).toEqual([]);
    expect(result.ETH).toEqual([]);
  });

  it('aligns single coin — output equals input', () => {
    const pts = makeRatePoints(5, 0, 1000);
    const result = alignTimestamps({BTC: pts});
    expect(result.BTC).toHaveLength(5);
    // All non-null
    result.BTC.forEach(p => expect(p).not.toBeNull());
  });

  it('aligns two coins of equal length with identical timestamps', () => {
    const pts1 = makeRatePoints(5, 1000, 1000);
    const pts2 = makeRatePoints(5, 1000, 1000, 10);
    const result = alignTimestamps({BTC: pts1, ETH: pts2});
    expect(result.BTC).toHaveLength(result.ETH!.length);
  });

  it('pads shorter series with nulls when timestamps differ slightly', () => {
    // BTC has 5 points, ETH has 4 — offset by 1 step
    const pts1 = makeRatePoints(5, 1000, 1000);
    const pts2 = makeRatePoints(4, 2000, 1000); // starts 1 step later
    const result = alignTimestamps({BTC: pts1, ETH: pts2});
    // Both outputs should have the same length
    expect(result.BTC!.length).toBe(result.ETH!.length);
  });

  it('returns null-filled arrays when coins have 0 points but others have points', () => {
    const pts = makeRatePoints(3, 0, 1000);
    const result = alignTimestamps({BTC: pts, ETH: []});
    // ETH should have some nulls since it contributes no data
    expect(result.ETH!.every(p => p === null)).toBe(true);
    expect(result.BTC!.length).toBe(result.ETH!.length);
  });
});

// ─── downsampleTimestamps ─────────────────────────────────────────────────────

describe('downsampleTimestamps', () => {
  it('returns empty object for empty input', () => {
    expect(downsampleTimestamps({}, 5)).toEqual({});
  });

  it('throws for empty arrays', () => {
    expect(() => downsampleTimestamps({BTC: []}, 1)).toThrow(
      'cannot downsample empty arrays',
    );
  });

  it('throws when arrays have different lengths', () => {
    const a = [null, null, null] as any[];
    const b = [null, null] as any[];
    expect(() => downsampleTimestamps({BTC: a, ETH: b}, 2)).toThrow(
      'all aligned arrays must have the same length',
    );
  });

  it('downsamples evenly with strategy=even (default)', () => {
    const pts = makeRatePoints(10, 0, 1000);
    const aligned: AlignedRatesByCoin = {BTC: pts};
    const result = downsampleTimestamps(aligned, 5);
    expect(result.BTC).toHaveLength(5);
  });

  it('keeps first and last point with even downsampling', () => {
    const pts = makeRatePoints(10, 0, 1000);
    const aligned: AlignedRatesByCoin = {BTC: pts};
    const result = downsampleTimestamps(aligned, 5);
    const arr = result.BTC!;
    expect(arr[0]).toEqual(pts[0]);
    expect(arr[arr.length - 1]).toEqual(pts[9]);
  });

  it('downsamples with strategy=lttb', () => {
    const pts = makeRatePoints(10, 0, 1000);
    const aligned: AlignedRatesByCoin = {BTC: pts};
    const result = downsampleTimestamps(aligned, 5, {strategy: 'lttb'});
    expect(result.BTC).toHaveLength(5);
  });

  it('applies shared indices to all coins by default (mode=shared)', () => {
    const pts1 = makeRatePoints(10, 0, 1000);
    const pts2 = makeRatePoints(10, 0, 1000, 50);
    const aligned: AlignedRatesByCoin = {BTC: pts1, ETH: pts2};
    const result = downsampleTimestamps(aligned, 4);
    expect(result.BTC).toHaveLength(4);
    expect(result.ETH).toHaveLength(4);
    // Shared: indices are the same so timestamps match
    result.BTC!.forEach((p, i) => {
      const ep = result.ETH![i];
      if (p && ep) {
        expect(p.ts).toBe(ep.ts);
      }
    });
  });

  it('applies per-coin indices with mode=per_coin', () => {
    const pts1 = makeRatePoints(10, 0, 1000);
    const pts2 = makeRatePoints(10, 0, 1000, 50);
    const aligned: AlignedRatesByCoin = {BTC: pts1, ETH: pts2};
    const result = downsampleTimestamps(aligned, 4, {mode: 'per_coin'});
    expect(result.BTC).toHaveLength(4);
    expect(result.ETH).toHaveLength(4);
  });

  it('throws for unsupported strategy', () => {
    const pts = makeRatePoints(10, 0, 1000);
    const aligned: AlignedRatesByCoin = {BTC: pts};
    expect(() =>
      downsampleTimestamps(aligned, 4, {strategy: 'bogus' as any}),
    ).toThrow('unsupported strategy');
  });

  it('throws for unsupported mode', () => {
    const pts = makeRatePoints(10, 0, 1000);
    const aligned: AlignedRatesByCoin = {BTC: pts};
    expect(() =>
      downsampleTimestamps(aligned, 4, {mode: 'unknown' as any}),
    ).toThrow('unsupported mode');
  });

  it('with targetLen === len returns the same points in all coins', () => {
    const pts = makeRatePoints(5, 0, 1000);
    const aligned: AlignedRatesByCoin = {BTC: pts};
    const result = downsampleTimestamps(aligned, 5);
    expect(result.BTC).toHaveLength(5);
    result.BTC!.forEach((p, i) => {
      expect(p).toEqual(pts[i]);
    });
  });

  it('respects driverCoin option in shared mode with lttb', () => {
    const pts1 = makeRatePoints(10, 0, 1000); // BTC
    const pts2 = makeRatePoints(10, 0, 1000, 50); // ETH
    // some nulls in BTC to make ETH have more non-null
    const withNulls: AlignedRatesByCoin = {
      BTC: [null, null, ...pts1.slice(2)],
      ETH: pts2,
    };
    const result = downsampleTimestamps(withNulls, 4, {
      strategy: 'lttb',
      mode: 'shared',
      driverCoin: 'ETH',
    });
    expect(result.BTC).toHaveLength(4);
    expect(result.ETH).toHaveLength(4);
  });
});

// ─── downsampleSeries ─────────────────────────────────────────────────────────

describe('downsampleSeries', () => {
  it('returns empty array for empty input', () => {
    expect(downsampleSeries([], 5)).toEqual([]);
  });

  it('passes through series when length <= targetLen', () => {
    const pts = makeRatePoints(3, 0, 1000);
    const result = downsampleSeries(pts, 10);
    // Filters nulls and returns all points
    expect(result).toHaveLength(3);
  });

  it('downsamples when length > targetLen', () => {
    const pts = makeRatePoints(20, 0, 1000);
    const result = downsampleSeries(pts, 5);
    expect(result).toHaveLength(5);
  });

  it('filters out null points from result', () => {
    const pts: Array<RatePoint | null> = [
      null,
      {ts: 1000, rate: 10},
      null,
      {ts: 3000, rate: 30},
    ];
    const result = downsampleSeries(pts, 4);
    // All nulls filtered
    expect(result.every(p => p !== null)).toBe(true);
  });

  it('filters nulls after downsampling', () => {
    const pts: Array<RatePoint | null> = [
      null,
      ...makeRatePoints(10, 1000, 1000),
    ];
    const result = downsampleSeries(pts, 5);
    expect(result.every(p => p !== null && p.ts !== undefined)).toBe(true);
  });
});

// ─── trimTimestamps ───────────────────────────────────────────────────────────

describe('trimTimestamps', () => {
  it('returns empty object for empty input', () => {
    expect(trimTimestamps({})).toEqual({});
  });

  it('returns empty arrays for coins with 0 points', () => {
    const result = trimTimestamps({BTC: [], ETH: []});
    expect(result.BTC).toEqual([]);
    expect(result.ETH).toEqual([]);
  });

  it('throws when arrays have different lengths', () => {
    const a = [null, null, null] as any[];
    const b = [null, null] as any[];
    expect(() => trimTimestamps({BTC: a, ETH: b})).toThrow(
      'all aligned arrays must have the same length',
    );
  });

  it('does not trim when all coins have data at every position', () => {
    const pts1 = makeRatePoints(5, 0, 1000);
    const pts2 = makeRatePoints(5, 0, 1000, 50);
    const input: AlignedRatesByCoin = {BTC: pts1, ETH: pts2};
    const result = trimTimestamps(input);
    expect(result.BTC).toHaveLength(5);
    expect(result.ETH).toHaveLength(5);
  });

  it('trims leading nulls when one coin starts later (≤2 missing)', () => {
    // ETH starts 1 position later so first slot is null
    const btc = makeRatePoints(5, 0, 1000);
    const eth: Array<RatePoint | null> = [
      null,
      ...makeRatePoints(4, 1000, 1000),
    ];
    const input: AlignedRatesByCoin = {BTC: btc, ETH: eth};
    const result = trimTimestamps(input);
    // Leading null gets trimmed (only 1 coin missing, ≤2)
    expect(result.BTC!.length).toBeLessThan(5);
    expect(result.BTC!.length).toBe(result.ETH!.length);
  });

  it('does NOT trim leading nulls when a single coin has >2 nulls in the trim window', () => {
    // BTC has 3 leading nulls, ETH has 3 leading nulls → allHaveRateAt fails for
    // positions 0,1,2 so trimStart=3. countMissingOnStart(BTC, 3)=3 > 2 → no trim.
    const btc: Array<RatePoint | null> = [
      null,
      null,
      null,
      ...makeRatePoints(2, 3000, 1000),
    ];
    const eth: Array<RatePoint | null> = [
      null,
      null,
      null,
      ...makeRatePoints(2, 3000, 1000, 20),
    ];
    const input: AlignedRatesByCoin = {BTC: btc, ETH: eth};
    const result = trimTimestamps(input);
    // maxMissing = 3 > 2 → trimStart reset to 0 → full length preserved
    expect(result.BTC).toHaveLength(5);
    expect(result.ETH).toHaveLength(5);
  });

  it('trims trailing nulls when one coin ends earlier (≤2 missing)', () => {
    const btc = makeRatePoints(5, 0, 1000);
    const eth: Array<RatePoint | null> = [...makeRatePoints(4, 0, 1000), null];
    const input: AlignedRatesByCoin = {BTC: btc, ETH: eth};
    const result = trimTimestamps(input);
    expect(result.BTC!.length).toBeLessThan(5);
    expect(result.BTC!.length).toBe(result.ETH!.length);
  });

  it('does NOT trim trailing nulls when a single coin has >2 nulls at the end', () => {
    // Both BTC and ETH have 3 trailing nulls → trimEnd=3, countMissingOnEnd(BTC,3)=3 > 2 → no trim
    const btc: Array<RatePoint | null> = [
      ...makeRatePoints(2, 0, 1000),
      null,
      null,
      null,
    ];
    const eth: Array<RatePoint | null> = [
      ...makeRatePoints(2, 0, 1000, 20),
      null,
      null,
      null,
    ];
    const input: AlignedRatesByCoin = {BTC: btc, ETH: eth};
    const result = trimTimestamps(input);
    // maxMissing = 3 > 2 → trimEnd reset to 0 → full length preserved
    expect(result.BTC).toHaveLength(5);
    expect(result.ETH).toHaveLength(5);
  });

  it('preserves all data when all points are non-null', () => {
    const pts = makeRatePoints(4, 0, 1000);
    const result = trimTimestamps({ONLY: pts});
    expect(result.ONLY).toHaveLength(4);
    result.ONLY!.forEach(p => expect(p).not.toBeNull());
  });
});

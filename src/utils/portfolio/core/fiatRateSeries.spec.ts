/**
 * Tests for src/utils/portfolio/core/fiatRateSeries.ts
 */
import {
  getFiatRateSeriesCacheKey,
  getFiatRateSeriesReduxCacheKey,
  upsertFiatRateSeriesCache,
} from './fiatRateSeries';
import type {FiatRateSeries, FiatRateSeriesCache} from './fiatRateSeries';

// ─── getFiatRateSeriesCacheKey ────────────────────────────────────────────────

describe('getFiatRateSeriesCacheKey', () => {
  it('returns a colon-separated key with uppercase fiatCode and lowercase coin', () => {
    expect(getFiatRateSeriesCacheKey('USD', 'BTC', '1D')).toBe('USD:btc:1D');
  });

  it('normalises fiatCode to uppercase and coin to lowercase', () => {
    expect(getFiatRateSeriesCacheKey('eur', 'ETH', '1W')).toBe('EUR:eth:1W');
  });

  it('handles empty fiatCode and coin gracefully', () => {
    // fiatCode '' → '' (toUpperCase), coin '' → '' (toLowerCase), interval '1M'
    expect(getFiatRateSeriesCacheKey('', '', '1M')).toBe(':' + ':1M');
  });

  it('produces different keys for different intervals', () => {
    const key1D = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const key1Y = getFiatRateSeriesCacheKey('USD', 'btc', '1Y');
    expect(key1D).not.toBe(key1Y);
  });

  it('produces different keys for different fiat codes', () => {
    const usd = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const eur = getFiatRateSeriesCacheKey('EUR', 'btc', '1D');
    expect(usd).not.toBe(eur);
  });

  it('produces different keys for different coins', () => {
    const btc = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const eth = getFiatRateSeriesCacheKey('USD', 'eth', '1D');
    expect(btc).not.toBe(eth);
  });

  it('uses the runtime cache-key shape for token series', () => {
    expect(
      getFiatRateSeriesCacheKey('USD', 'USDC', '1D', {
        chain: 'ETH',
        tokenAddress: '0xABCDef',
      }),
    ).toBe('USD:usdc:1D:eth:0xabcdef');
  });

  it('keeps the legacy Redux key shape available explicitly', () => {
    expect(
      getFiatRateSeriesReduxCacheKey('USD', 'USDC', '1D', {
        chain: 'ETH',
        tokenAddress: '0xABCDef',
      }),
    ).toBe('USD:usdc|eth|0xabcdef:1D');
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSeries(fetchedOn: number): FiatRateSeries {
  return {fetchedOn, points: [{ts: fetchedOn, rate: 1.23}]};
}

// ─── upsertFiatRateSeriesCache ────────────────────────────────────────────────

describe('upsertFiatRateSeriesCache', () => {
  it('returns an empty object when both current and updates are empty', () => {
    const result = upsertFiatRateSeriesCache({}, {});
    expect(result).toEqual({});
  });

  it('merges an update into an empty current cache', () => {
    const key = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const series = makeSeries(1000);

    const result = upsertFiatRateSeriesCache({}, {[key]: series});

    expect(result[key]).toEqual(series);
  });

  it('overwrites an existing entry with the same key', () => {
    const key = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const oldSeries = makeSeries(1000);
    const newSeries = makeSeries(2000);

    const result = upsertFiatRateSeriesCache(
      {[key]: oldSeries},
      {[key]: newSeries},
    );

    expect(result[key]).toEqual(newSeries);
  });

  // ── maxFiatsPersisted = 1 (default) ────────────────────────────────────────

  describe('maxFiatsPersisted = 1 (default)', () => {
    it('keeps only the most-recently-fetched fiat when two fiats are present', () => {
      const usdKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
      const eurKey = getFiatRateSeriesCacheKey('EUR', 'btc', '1D');

      const usdSeries = makeSeries(1000); // older
      const eurSeries = makeSeries(2000); // more recent

      const result = upsertFiatRateSeriesCache(
        {[usdKey]: usdSeries},
        {[eurKey]: eurSeries},
      );

      // EUR was fetched most recently, so USD should be pruned
      expect(result[eurKey]).toEqual(eurSeries);
      expect(result[usdKey]).toBeUndefined();
    });

    it('keeps all intervals for the winning fiat, prunes losing fiat', () => {
      const usd1D = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
      const usd1W = getFiatRateSeriesCacheKey('USD', 'btc', '1W');
      const eurKey = getFiatRateSeriesCacheKey('EUR', 'btc', '1D');

      const currentCache: FiatRateSeriesCache = {
        [usd1D]: makeSeries(3000),
        [usd1W]: makeSeries(3000),
      };

      // EUR is older than USD
      const result = upsertFiatRateSeriesCache(currentCache, {
        [eurKey]: makeSeries(1000),
      });

      expect(result[usd1D]).toBeDefined();
      expect(result[usd1W]).toBeDefined();
      expect(result[eurKey]).toBeUndefined();
    });

    it('keeps the single fiat when only one fiat is in the cache', () => {
      const key = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
      const series = makeSeries(1000);

      const result = upsertFiatRateSeriesCache({}, {[key]: series});

      expect(result[key]).toEqual(series);
    });
  });

  // ── maxFiatsPersisted > 1 ─────────────────────────────────────────────────

  describe('maxFiatsPersisted = 2', () => {
    it('keeps two most-recently-fetched fiats and prunes the oldest', () => {
      const usdKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
      const eurKey = getFiatRateSeriesCacheKey('EUR', 'btc', '1D');
      const gbpKey = getFiatRateSeriesCacheKey('GBP', 'btc', '1D');

      const cache: FiatRateSeriesCache = {
        [usdKey]: makeSeries(3000), // most recent
        [eurKey]: makeSeries(2000), // second
        [gbpKey]: makeSeries(1000), // oldest — should be pruned
      };

      const result = upsertFiatRateSeriesCache({}, cache, {
        maxFiatsPersisted: 2,
      });

      expect(result[usdKey]).toBeDefined();
      expect(result[eurKey]).toBeDefined();
      expect(result[gbpKey]).toBeUndefined();
    });

    it('keeps all fiats when count does not exceed maxFiatsPersisted', () => {
      const usdKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
      const eurKey = getFiatRateSeriesCacheKey('EUR', 'btc', '1D');

      const cache: FiatRateSeriesCache = {
        [usdKey]: makeSeries(2000),
        [eurKey]: makeSeries(1000),
      };

      const result = upsertFiatRateSeriesCache({}, cache, {
        maxFiatsPersisted: 3,
      });

      expect(result[usdKey]).toBeDefined();
      expect(result[eurKey]).toBeDefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles cache entries with non-number fetchedOn gracefully (skipped in ranking)', () => {
      const validKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
      const invalidKey = 'USD:bad-series';

      const result = upsertFiatRateSeriesCache(
        {
          [validKey]: makeSeries(1000),
          [invalidKey]: {fetchedOn: 'not-a-number', points: []} as any,
        },
        {},
      );

      // The valid USD entry is kept; the invalid entry has no fiat code at
      // index 0 (key starts with 'USD') but fetchedOn is not a number so it's
      // not counted in ranking — it should still be kept because its fiat code
      // matches the kept set from the valid entry.
      expect(result[validKey]).toBeDefined();
    });

    it('keeps entries whose cacheKey has no valid fiatCode (no colon)', () => {
      const malformedKey = 'nocolon';
      const validKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');

      const result = upsertFiatRateSeriesCache(
        {[malformedKey]: makeSeries(9999)},
        {[validKey]: makeSeries(1000)},
      );

      // Malformed keys (no fiatCode) are always kept per the pruning logic
      expect(result[malformedKey]).toBeDefined();
      expect(result[validKey]).toBeDefined();
    });

    it('does not mutate the input caches', () => {
      const key = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
      const current: FiatRateSeriesCache = {};
      const updates: FiatRateSeriesCache = {[key]: makeSeries(1000)};

      upsertFiatRateSeriesCache(current, updates);

      expect(current).toEqual({});
      expect(Object.keys(updates)).toHaveLength(1);
    });

    it('respects maxFiatsPersisted minimum of 1 even when 0 is passed', () => {
      const usdKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
      const eurKey = getFiatRateSeriesCacheKey('EUR', 'btc', '1D');

      const cache: FiatRateSeriesCache = {
        [usdKey]: makeSeries(2000),
        [eurKey]: makeSeries(1000),
      };

      // maxFiatsPersisted: 0 → clamped to 1
      const result = upsertFiatRateSeriesCache({}, cache, {
        maxFiatsPersisted: 0,
      });

      // Only one fiat should remain
      const definedEntries = Object.values(result).filter(Boolean);
      const definedFiatCodes = new Set(
        Object.keys(result)
          .filter(k => result[k] !== undefined)
          .map(k => k.split(':')[0]),
      );
      expect(definedFiatCodes.size).toBe(1);
    });
  });
});

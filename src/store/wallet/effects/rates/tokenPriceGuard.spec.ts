import {
  TOKEN_PRICE_REFERENCE_MAX_AGE_MS,
  getCachedTokenPriceReference,
  getTokenPriceReferenceFromSeries,
  guardTokenUsdPrice,
  loadTokenPriceReferences,
  refreshTokenPriceReferences,
  resetTokenPriceReferenceCacheForTests,
} from './tokenPriceGuard';
import {getFiatRateSeriesCacheKey} from '../../../../portfolio/core/fiatRatesShared';

describe('tokenPriceGuard', () => {
  const now = 1_800_000_000_000;
  const aUsdc = {
    chain: 'arb',
    tokenAddress: '0x724dc807b04555b71ed48a6896b6f41593b8c637',
    symbol: 'aUSDC',
  };
  const series = (rates: number[], lastTs = now - 60_000) => ({
    fetchedOn: now,
    points: rates.map((rate, i) => ({
      ts: lastTs - (rates.length - 1 - i) * 300_000,
      rate,
    })),
  });

  describe('guardTokenUsdPrice', () => {
    it('uses the reference when the live price is far from it', () => {
      expect(
        guardTokenUsdPrice({
          usdPrice: 0.616498,
          percentChange: -38,
          reference: {usdPrice: 0.99985554, percentChange: 0.01},
        }),
      ).toEqual({usdPrice: 0.99985554, percentChange: 0.01, replaced: true});
    });

    it('keeps the live price within the allowed deviation', () => {
      expect(
        guardTokenUsdPrice({
          usdPrice: 1.15,
          percentChange: 3,
          reference: {usdPrice: 1},
        }),
      ).toEqual({usdPrice: 1.15, percentChange: 3, replaced: false});
    });

    it('keeps the live price when there is no reference', () => {
      expect(
        guardTokenUsdPrice({usdPrice: 0.6, percentChange: -1}),
      ).toMatchObject({usdPrice: 0.6, replaced: false});
    });
  });

  describe('getTokenPriceReferenceFromSeries', () => {
    it('takes the latest point and the change across the series', () => {
      const reference = getTokenPriceReferenceFromSeries(
        series([1, 1.02]),
        now,
      );
      expect(reference?.usdPrice).toBe(1.02);
      expect(reference?.percentChange).toBeCloseTo(2);
    });

    it('ignores a stale series', () => {
      expect(
        getTokenPriceReferenceFromSeries(
          series([1], now - TOKEN_PRICE_REFERENCE_MAX_AGE_MS - 1),
          now,
        ),
      ).toBeUndefined();
    });

    it('ignores empty and non-positive points', () => {
      expect(
        getTokenPriceReferenceFromSeries(series([0]), now),
      ).toBeUndefined();
      expect(getTokenPriceReferenceFromSeries(undefined, now)).toBeUndefined();
    });
  });

  describe('loadTokenPriceReferences', () => {
    it('reads each token from the 1D USD series cache', async () => {
      const key = getFiatRateSeriesCacheKey('USD', aUsdc.symbol, '1D', {
        chain: aUsdc.chain,
        tokenAddress: aUsdc.tokenAddress,
      });
      const loadSeries = jest.fn().mockResolvedValue({[key]: series([1])});

      const references = await loadTokenPriceReferences({
        tokens: [aUsdc],
        loadSeries,
        nowMs: () => now,
      });

      expect(loadSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          quoteCurrency: 'USD',
          requests: [
            {
              coin: 'aUSDC',
              chain: 'arb',
              tokenAddress: aUsdc.tokenAddress,
              intervals: ['1D'],
            },
          ],
        }),
      );
      expect(references.get(aUsdc)?.usdPrice).toBe(1);
    });

    it('resolves empty when loading fails or takes too long', async () => {
      await expect(
        loadTokenPriceReferences({
          tokens: [aUsdc],
          loadSeries: jest.fn().mockRejectedValue(new Error('offline')),
        }),
      ).resolves.toEqual(new Map());

      await expect(
        loadTokenPriceReferences({
          tokens: [aUsdc],
          loadSeries: () => new Promise(() => {}),
          timeoutMs: 5,
        }),
      ).resolves.toEqual(new Map());
    });

    it('does not load anything for no tokens', async () => {
      const loadSeries = jest.fn();
      await loadTokenPriceReferences({tokens: [], loadSeries});
      expect(loadSeries).not.toHaveBeenCalled();
    });
  });

  describe('reference cache', () => {
    const cacheKey = getFiatRateSeriesCacheKey('USD', aUsdc.symbol, '1D', {
      chain: aUsdc.chain,
      tokenAddress: aUsdc.tokenAddress,
    });
    beforeEach(() => resetTokenPriceReferenceCacheForTests());

    it('serves a refreshed reference and treats an old one as absent', async () => {
      await refreshTokenPriceReferences({
        tokens: [aUsdc],
        loadSeries: jest.fn().mockResolvedValue({[cacheKey]: series([1])}),
        nowMs: () => now,
      });
      expect(getCachedTokenPriceReference(aUsdc, now)?.usdPrice).toBe(1);
      expect(
        getCachedTokenPriceReference(
          aUsdc,
          now + TOKEN_PRICE_REFERENCE_MAX_AGE_MS + 1,
        ),
      ).toBeUndefined();
    });

    it('keeps a cached reference when a later refresh finds nothing', async () => {
      await refreshTokenPriceReferences({
        tokens: [aUsdc],
        loadSeries: jest.fn().mockResolvedValue({[cacheKey]: series([1])}),
        nowMs: () => now,
      });
      // A later refresh that times out must not drop what is already cached —
      // the all-or-nothing the batched load has on its own is absorbed here.
      await refreshTokenPriceReferences({
        tokens: [aUsdc],
        loadSeries: () => new Promise(() => {}),
        timeoutMs: 5,
        nowMs: () => now,
      });
      expect(getCachedTokenPriceReference(aUsdc, now)?.usdPrice).toBe(1);
    });
  });
});

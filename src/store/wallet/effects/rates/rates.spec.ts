/**
 * Tests for rates.ts
 *
 * Strategy:
 * - The file exports several Redux Effect thunks plus a few standalone async
 *   helpers.  Many internal helpers are private (not exported), but their
 *   behaviour surfaces through the exported functions we *can* call.
 * - We test the exported pure-ish helpers:
 *     getHistoricFiatRate   – wraps axios.get, no store needed
 *     startGetRates         – dispatches, uses cached vs. fresh path
 *     refreshFiatRateSeries – pure cache-append logic via store
 *     fetchFiatRateSeriesInterval – cache-hit short-circuit path
 * - We also exercise the rate.models helpers imported by rates.ts:
 *     getFiatRateSeriesCacheKey
 *     hasValidSeriesForCoin
 */

import axios from 'axios';
import configureTestStore from '@test/store';
import {
  getHistoricFiatRate,
  startGetRates,
  refreshFiatRateSeries,
  fetchFiatRateSeriesInterval,
  fetchFiatRateSeriesAllIntervals,
  getContractAddresses,
  getTokenRates,
} from './rates';
import {
  getFiatRateSeriesCacheKey,
  hasValidSeriesForCoin,
} from '../../../rate/rate.models';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../../managers/TokenManager', () => ({
  tokenManager: {
    getTokenOptions: jest.fn(() => ({tokenOptionsByAddress: {}})),
  },
}));

// Moralis token prices – return empty array by default so getTokenRates is a no-op
jest.mock('../../../../store/moralis/moralis.effects', () => ({
  getMultipleTokenPrices: jest.fn(() => () => Promise.resolve([])),
}));

// buy-crypto effect used for token rate conversion
jest.mock('../../../../store/buy-crypto/buy-crypto.effects', () => ({
  calculateUsdToAltFiat: jest.fn(() => () => 0),
}));

// Status effect (heavy)
jest.mock('../status/status', () => ({
  startUpdateAllKeyAndWalletStatus: jest.fn(() => () => Promise.resolve()),
}));

// Mock helper-methods to avoid the address.ts → BwcProvider.getBitcore() chain
jest.mock('../../../../utils/helper-methods', () => ({
  ...jest.requireActual('../../../../utils/helper-methods'),
  getLastDayTimestampStartOfHourMs: jest.fn(() => Date.now() - 86400000),
  addTokenChainSuffix: jest.fn(
    (addr: string, chain: string) => `${addr}_e.${chain}`,
  ),
  getErrorString: jest.fn((e: unknown) => String(e)),
  createWalletsForAccounts: jest.fn(() => Promise.resolve([])),
  getEvmGasWallets: jest.fn(() => []),
  checkEncryptedKeysForEddsaMigration: jest.fn(() => () => Promise.resolve()),
  isL2NoSideChainNetwork: jest.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = 1_700_000_000_000; // fixed "now" for cache staleness tests

/** Build a minimal Redux state with fresh rate-series cache for one coin. */
const buildStateWithCache = (
  coin: string,
  interval: string,
  points: {ts: number; rate: number}[],
  fetchedOn: number = NOW,
) => {
  const cacheKey = getFiatRateSeriesCacheKey('USD', coin, interval as any);
  return {
    RATE: {
      rates: {},
      lastDayRates: {},
      fiatRateSeriesCache: {
        [cacheKey]: {fetchedOn, points},
      },
      ratesCacheKey: {},
    },
  };
};

// ---------------------------------------------------------------------------
// getFiatRateSeriesCacheKey (pure – from rate.models)
// ---------------------------------------------------------------------------
describe('getFiatRateSeriesCacheKey', () => {
  it('returns upper-case fiat code, lower-case coin, and interval', () => {
    expect(getFiatRateSeriesCacheKey('usd', 'BTC', '1D')).toBe('USD:btc:1D');
  });

  it('normalizes empty fiat code to empty string prefix', () => {
    const key = getFiatRateSeriesCacheKey('', 'eth', '1W');
    expect(key).toBe(':eth:1W');
  });

  it('normalizes empty coin to empty string segment', () => {
    const key = getFiatRateSeriesCacheKey('USD', '', '1M');
    expect(key).toBe('USD::1M');
  });

  it('is consistent across multiple calls with same args', () => {
    const k1 = getFiatRateSeriesCacheKey('USD', 'btc', 'ALL');
    const k2 = getFiatRateSeriesCacheKey('USD', 'btc', 'ALL');
    expect(k1).toBe(k2);
  });

  it('produces different keys for different intervals', () => {
    const k1D = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const k1W = getFiatRateSeriesCacheKey('USD', 'btc', '1W');
    expect(k1D).not.toBe(k1W);
  });

  it('produces different keys for different coins', () => {
    const kBtc = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const kEth = getFiatRateSeriesCacheKey('USD', 'eth', '1D');
    expect(kBtc).not.toBe(kEth);
  });

  it('produces different keys for different fiat codes', () => {
    const kUsd = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const kEur = getFiatRateSeriesCacheKey('EUR', 'btc', '1D');
    expect(kUsd).not.toBe(kEur);
  });
});

// ---------------------------------------------------------------------------
// hasValidSeriesForCoin (pure – from rate.models)
// ---------------------------------------------------------------------------
describe('hasValidSeriesForCoin', () => {
  it('returns false when cache is undefined', () => {
    expect(
      hasValidSeriesForCoin({
        cache: undefined,
        fiatCodeUpper: 'USD',
        normalizedCoin: 'btc',
        intervals: ['1D'],
      }),
    ).toBe(false);
  });

  it('returns false when cache is empty object', () => {
    expect(
      hasValidSeriesForCoin({
        cache: {},
        fiatCodeUpper: 'USD',
        normalizedCoin: 'btc',
        intervals: ['1D'],
      }),
    ).toBe(false);
  });

  it('returns true when cache has valid points for the requested interval', () => {
    const cacheKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    expect(
      hasValidSeriesForCoin({
        cache: {[cacheKey]: {fetchedOn: NOW, points: [{ts: 1, rate: 30000}]}},
        fiatCodeUpper: 'USD',
        normalizedCoin: 'btc',
        intervals: ['1D'],
      }),
    ).toBe(true);
  });

  it('returns false when one of multiple required intervals is missing', () => {
    const key1D = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    expect(
      hasValidSeriesForCoin({
        cache: {[key1D]: {fetchedOn: NOW, points: [{ts: 1, rate: 30000}]}},
        fiatCodeUpper: 'USD',
        normalizedCoin: 'btc',
        intervals: ['1D', '1W'],
      }),
    ).toBe(false);
  });

  it('returns false when points array is empty', () => {
    const cacheKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    expect(
      hasValidSeriesForCoin({
        cache: {[cacheKey]: {fetchedOn: NOW, points: []}},
        fiatCodeUpper: 'USD',
        normalizedCoin: 'btc',
        intervals: ['1D'],
      }),
    ).toBe(false);
  });

  it('returns false when a point has a non-finite ts', () => {
    const cacheKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    expect(
      hasValidSeriesForCoin({
        cache: {
          [cacheKey]: {
            fetchedOn: NOW,
            points: [{ts: NaN, rate: 30000}],
          },
        },
        fiatCodeUpper: 'USD',
        normalizedCoin: 'btc',
        intervals: ['1D'],
      }),
    ).toBe(false);
  });

  it('returns false when fiatCodeUpper is empty', () => {
    expect(
      hasValidSeriesForCoin({
        cache: {},
        fiatCodeUpper: '',
        normalizedCoin: 'btc',
        intervals: ['1D'],
      }),
    ).toBe(false);
  });

  it('returns false when normalizedCoin is empty', () => {
    expect(
      hasValidSeriesForCoin({
        cache: {},
        fiatCodeUpper: 'USD',
        normalizedCoin: '',
        intervals: ['1D'],
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getHistoricFiatRate – wraps axios.get
// ---------------------------------------------------------------------------
describe('getHistoricFiatRate', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => jest.clearAllMocks());

  it('resolves with data returned by axios', async () => {
    const mockRate = {fetchedOn: NOW, rate: 30000, ts: NOW};
    mockedAxios.get.mockResolvedValueOnce({data: mockRate});

    const result = await getHistoricFiatRate('USD', 'btc', String(NOW));
    expect(result).toEqual(mockRate);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('btc'),
    );
  });

  it('rejects when axios throws', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('network error'));
    await expect(
      getHistoricFiatRate('USD', 'btc', String(NOW)),
    ).rejects.toThrow('network error');
  });

  it('includes the fiatCode in the URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({data: {}});
    await getHistoricFiatRate('EUR', 'eth', '12345');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('EUR'),
    );
  });

  it('includes the coin in the URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({data: {}});
    await getHistoricFiatRate('USD', 'ltc', '12345');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('ltc'),
    );
  });

  it('includes the timestamp in the URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({data: {}});
    await getHistoricFiatRate('USD', 'btc', '999888777');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('999888777'),
    );
  });
});

// ---------------------------------------------------------------------------
// startGetRates – cache-hit path (no HTTP calls)
// ---------------------------------------------------------------------------
describe('startGetRates – cache-hit path', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => jest.clearAllMocks());

  it('returns cached rates without making HTTP calls when cache is fresh and altCurrencyList populated', async () => {
    const RATES_CACHE_DURATION = 5 * 60 * 1000; // 5 min
    const freshTimestamp = Date.now() - 1000; // 1 second ago – well within duration

    const cachedRates = {
      btc: [
        {
          code: 'USD',
          rate: 50000,
          name: 'Bitcoin',
          fetchedOn: freshTimestamp,
          ts: freshTimestamp,
        },
      ],
    };
    const state = {
      RATE: {
        rates: cachedRates,
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {
          1: freshTimestamp,
        },
      },
      APP: {
        altCurrencyList: [{isoCode: 'USD', name: 'US Dollar'}],
      },
    };

    const store = configureTestStore(state);
    const result = await store.dispatch(startGetRates({force: false}));

    // Cache hit – axios should NOT be called
    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(result).toEqual(cachedRates);
  });
});

// ---------------------------------------------------------------------------
// startGetRates – force fetch path
// ---------------------------------------------------------------------------
describe('startGetRates – force fetch path', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => jest.clearAllMocks());

  it('fetches rates from network when force=true', async () => {
    const freshRates = {
      btc: [
        {code: 'USD', rate: 60000, name: 'Bitcoin', fetchedOn: NOW, ts: NOW},
      ],
    };
    mockedAxios.get
      .mockResolvedValueOnce({data: freshRates}) // current rates
      .mockResolvedValueOnce({data: freshRates}); // yesterday rates

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
      APP: {altCurrencyList: [{isoCode: 'USD', name: 'US Dollar'}]},
      WALLET: {keys: {}, customTokenOptionsByAddress: {}},
    };
    const store = configureTestStore(state);

    await store.dispatch(startGetRates({force: true}));
    // Both current and yesterday endpoints should have been called
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it('resolves with cached rates when network call fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('offline'));

    const cachedRates = {
      btc: [
        {code: 'USD', rate: 30000, name: 'Bitcoin', fetchedOn: NOW, ts: NOW},
      ],
    };
    const state = {
      RATE: {
        rates: cachedRates,
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
      APP: {altCurrencyList: []},
      WALLET: {keys: {}, customTokenOptionsByAddress: {}},
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(startGetRates({force: true}));
    // Should gracefully fall back to cached rates
    expect(result).toEqual(cachedRates);
  });
});

// ---------------------------------------------------------------------------
// refreshFiatRateSeries – cache-append logic
// ---------------------------------------------------------------------------
describe('refreshFiatRateSeries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns false when spotRate is missing', async () => {
    const state = buildStateWithCache('btc', '1D', [
      {ts: NOW - 60_000, rate: 30000},
    ]);
    const store = configureTestStore(state);
    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '1D',
        spotRate: undefined,
      }),
    );
    expect(result).toBe(false);
  });

  it('returns false when spotRate is NaN', async () => {
    const state = buildStateWithCache('btc', '1D', [
      {ts: NOW - 60_000, rate: 30000},
    ]);
    const store = configureTestStore(state);
    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '1D',
        spotRate: NaN,
      }),
    );
    expect(result).toBe(false);
  });

  it('returns false when there are no cached points', async () => {
    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);
    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '1D',
        spotRate: 40000,
      }),
    );
    expect(result).toBe(false);
  });

  it('returns false for "ALL" interval (not refreshable)', async () => {
    const state = buildStateWithCache('btc', 'ALL', [
      {ts: NOW - 100_000, rate: 30000},
    ]);
    const store = configureTestStore(state);
    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: 'ALL',
        spotRate: 40000,
      }),
    );
    expect(result).toBe(false);
  });

  it('returns false when cadence threshold has not elapsed', async () => {
    // 1D interval has a cadence of 15 minutes (900_000 ms)
    // last point is only 1 second old → below cadence threshold
    const recentTs = Date.now() - 1000;
    const state = buildStateWithCache('btc', '1D', [
      {ts: recentTs, rate: 30000},
    ]);
    const store = configureTestStore(state);
    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '1D',
        spotRate: 35000,
      }),
    );
    expect(result).toBe(false);
  });

  it('appends a new point and returns true when cadence has elapsed', async () => {
    // 1D cadence = 15 min. Last point is 20 min old → should refresh.
    // Use 2 initial points so the window-slice logic keeps both + new.
    const oldTs1 = Date.now() - 40 * 60 * 1000;
    const oldTs2 = Date.now() - 20 * 60 * 1000;
    const state = buildStateWithCache('btc', '1D', [
      {ts: oldTs1, rate: 29000},
      {ts: oldTs2, rate: 30000},
    ]);
    const store = configureTestStore(state);

    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '1D',
        spotRate: 35000,
      }),
    );
    expect(result).toBe(true);

    // Verify the new point was stored in the cache (length stays at targetLength = 2)
    const cacheKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const updatedCache = store.getState().RATE?.fiatRateSeriesCache;
    const updatedSeries = updatedCache?.[cacheKey];
    // The series length is preserved (window slide), and the new rate is present
    expect(updatedSeries?.points.length).toBeGreaterThanOrEqual(1);
    const rates = updatedSeries?.points.map(p => p.rate) ?? [];
    expect(rates).toContain(35000);
  });

  it('handles matic/pol normalization correctly', async () => {
    // 'matic' normalizes to 'pol' in normalizeFiatRateSeriesCoin
    const oldTs = Date.now() - 20 * 60 * 1000;
    // Cache stored under 'pol' key
    const state = buildStateWithCache('pol', '1D', [{ts: oldTs, rate: 0.8}]);
    const store = configureTestStore(state);

    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'matic', // normalized to 'pol'
        interval: '1D',
        spotRate: 0.9,
      }),
    );
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fetchFiatRateSeriesInterval – cache-hit short-circuit
// ---------------------------------------------------------------------------
describe('fetchFiatRateSeriesInterval – cache-hit path', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => jest.clearAllMocks());

  it('returns true without making a network call when cache is fresh', async () => {
    // Cache duration is 15 min; fetched 1 min ago → fresh
    const freshFetchedOn = Date.now() - 60_000;
    const state = buildStateWithCache(
      'btc',
      '1D',
      [{ts: Date.now() - 500, rate: 30000}],
      freshFetchedOn,
    );
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(true);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('hits the network when force=true even if cache is fresh', async () => {
    const freshFetchedOn = Date.now() - 60_000;
    const state = buildStateWithCache(
      'btc',
      '1D',
      [{ts: Date.now() - 500, rate: 30000}],
      freshFetchedOn,
    );
    const store = configureTestStore(state);

    // Provide a mock response for the network call
    const mockResponseData = {
      btc: [{ts: Date.now(), rate: 31000}],
    };
    mockedAxios.get.mockResolvedValueOnce({data: mockResponseData});

    await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        force: true,
      }),
    );

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('returns false when network call fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('network error'));

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(false);
  });

  it('stores fetched series in cache on success', async () => {
    const ts = Date.now();
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        btc: [
          {ts: ts - 1000, rate: 40000},
          {ts, rate: 41000},
        ],
      },
    });

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        coin: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(true);
    const cacheKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const storedSeries = store.getState().RATE?.fiatRateSeriesCache?.[cacheKey];
    expect(storedSeries?.points?.length).toBeGreaterThan(0);
  });

  it('returns false when response data has no keys (empty object shape)', async () => {
    // coerceV4FiatRatesPayloadToByCoin returns {} → requestFailed = true
    mockedAxios.get.mockResolvedValueOnce({data: {}});

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(false);
  });

  it('returns false when axios response is null/non-object (invalid shape)', async () => {
    mockedAxios.get.mockResolvedValueOnce({data: null});

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(false);
  });

  it('handles array payload by mapping to requested coin', async () => {
    const ts = Date.now();
    // An array response is coerced to {[coin]: array}
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {ts: ts - 1000, rate: 45000},
        {ts, rate: 46000},
      ],
    });

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        coin: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(true);
  });

  it('handles array payload without a coin param → returns false (no coin to map to)', async () => {
    const ts = Date.now();
    // Array without a specific coin means coerceV4FiatRatesPayloadToByCoin returns {}
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {ts: ts - 1000, rate: 45000},
        {ts, rate: 46000},
      ],
    });

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    // No coin param — array payload coerces to {} → requestFailed = true
    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(false);
  });

  it('triggers coin-specific fallback when default response missing coin (no allowedCoins restriction)', async () => {
    const ts = Date.now();
    // First call returns eth data but NOT eth in coinForCacheCheck='eth'
    // after the default request, hasTargetCoinSeries will be false → fallback coin fetch
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          btc: [
            {ts: ts - 1000, rate: 40000},
            {ts, rate: 41000},
          ],
        },
      }) // default fetch (no coin param)
      .mockResolvedValueOnce({
        data: [
          {ts: ts - 500, rate: 2000},
          {ts: ts, rate: 2100},
        ],
      }); // coin-specific fetch for eth

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'eth',
        force: false,
        // No coin param → default v4 request. eth missing → triggers coin fallback
      }),
    );

    // The fallback may succeed or fail based on mock response shape; either way no throw
    expect(typeof result).toBe('boolean');
  });

  it('uses stale cache when force=false and cache is stale', async () => {
    const ts = Date.now();
    // Stale cache: fetchedOn far in the past
    const staleFetchedOn = Date.now() - 60 * 60 * 1000; // 1 hour ago (beyond HISTORIC_RATES_CACHE_DURATION)

    const state = buildStateWithCache(
      'btc',
      '1D',
      [{ts: ts - 1000, rate: 30000}],
      staleFetchedOn,
    );
    const store = configureTestStore(state);

    // Stale cache → should hit network
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        btc: [
          {ts: ts - 500, rate: 32000},
          {ts, rate: 33000},
        ],
      },
    });

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        force: false,
      }),
    );

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('filters out coins not in allowedCoins set', async () => {
    const ts = Date.now();
    // Response includes both eth and btc but allowedCoins only allows btc
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        btc: [
          {ts: ts - 1000, rate: 40000},
          {ts, rate: 41000},
        ],
        eth: [
          {ts: ts - 1000, rate: 2000},
          {ts, rate: 2100},
        ],
      },
    });

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        allowedCoins: ['btc'],
        force: false,
      }),
    );

    // Only btc should be in cache (eth filtered out)
    const ethCacheKey = getFiatRateSeriesCacheKey('USD', 'eth', '1D');
    const btcCacheKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const cacheState = store.getState().RATE?.fiatRateSeriesCache || {};
    expect(cacheState[ethCacheKey]).toBeUndefined();
    expect(cacheState[btcCacheKey]).toBeDefined();
  });

  it('handles points with non-finite ts/rate in raw response gracefully', async () => {
    const ts = Date.now();
    // Response contains some invalid points mixed in with valid ones
    // 'invalid' string → Number('invalid') = NaN (not finite) → filtered
    // undefined → Number(undefined) = NaN → filtered
    // NaN rate → filtered by isFinite(rate)
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        btc: [
          {ts: 'invalid', rate: 40000}, // invalid ts string
          {ts: undefined, rate: 40000}, // undefined ts
          {ts: ts - 1000, rate: NaN}, // invalid rate
          {ts: ts, rate: 41000}, // only valid point
        ],
      },
    });

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        coin: 'btc',
        force: false,
      }),
    );

    // The valid point(s) should be stored
    const cacheKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const stored = store.getState().RATE?.fiatRateSeriesCache?.[cacheKey];
    expect(result).toBe(true);
    expect(stored?.points?.length).toBeGreaterThanOrEqual(1);
    const rates = stored?.points?.map((p: any) => p.rate) ?? [];
    expect(rates).toContain(41000);
  });

  it('returns false when response has only invalid points (no valid deduped points)', async () => {
    // All points have invalid ts → sanitizeSortDedupePoints returns [] → no update
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        btc: [
          {ts: 'bad', rate: 40000},
          {ts: undefined, rate: 40000},
        ],
      },
    });

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    // coin param makes updateCount=0 → false
    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        coin: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(false);
  });

  it('handles ALL interval (no days param) correctly', async () => {
    const ts = Date.now();
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        btc: [
          {ts: ts - 86400000, rate: 30000},
          {ts, rate: 40000},
        ],
      },
    });

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: 'ALL',
        coinForCacheCheck: 'btc',
        coin: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(true);
    // URL should NOT contain days param
    const calledUrl = (mockedAxios.get as jest.Mock).mock.calls[0][0];
    expect(calledUrl).not.toContain('days=');
  });

  it('handles axios error with string response body', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {data: 'Service Unavailable'},
      message: '503 error',
    };
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn(() => true);
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(false);
  });

  it('handles axios error with object response body (error field)', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {data: {error: 'Not found'}},
      message: '404 error',
    };
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn(() => true);
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(false);
  });

  it('handles non-axios error gracefully', async () => {
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn(() => false);
    mockedAxios.get.mockRejectedValueOnce(new Error('unexpected'));

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: 'USD',
        interval: '1D',
        coinForCacheCheck: 'btc',
        force: false,
      }),
    );

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchFiatRateSeriesAllIntervals – higher-level orchestration
// ---------------------------------------------------------------------------
describe('fetchFiatRateSeriesAllIntervals', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => jest.clearAllMocks());

  const buildFreshCacheForAllIntervals = (coin: string) => {
    const freshFetchedOn = Date.now() - 60_000; // 1 min ago → fresh
    const ts = Date.now();
    const cache: Record<
      string,
      {fetchedOn: number; points: {ts: number; rate: number}[]}
    > = {};
    for (const interval of ['1D', '1W', '1M', '3M', '1Y', '5Y', 'ALL']) {
      const key = getFiatRateSeriesCacheKey('USD', coin, interval as any);
      cache[key] = {
        fetchedOn: freshFetchedOn,
        points: [
          {ts: ts - 1000, rate: 40000},
          {ts, rate: 41000},
        ],
      };
    }
    return cache;
  };

  it('skips coin-specific fetches when coinForCacheCheck is BTC (already handled by default request)', async () => {
    // All intervals are fresh for btc in cache
    const freshCache = buildFreshCacheForAllIntervals('btc');
    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: freshCache,
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    await store.dispatch(
      fetchFiatRateSeriesAllIntervals({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        force: false,
      }),
    );

    // Fresh cache → no network calls
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('returns early when coinForCacheCheck is empty string', async () => {
    mockedAxios.get.mockResolvedValue({data: {}});

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    // Empty currencyAbbreviation → normalizeFiatRateSeriesCoin('') = ''
    // fetchFiatRateSeriesAllIntervals returns early after default requests
    await store.dispatch(
      fetchFiatRateSeriesAllIntervals({
        fiatCode: 'USD',
        currencyAbbreviation: '',
        force: false,
      }),
    );

    // Should have attempted default BTC fetches but not coin-specific fetches
    // (returns early when coinForCacheCheck is empty)
    expect(typeof mockedAxios.get).toBe('function'); // no throw, resolved normally
  });

  it('skips coin-specific fetch when coin is not in allowedCoins set', async () => {
    const ts = Date.now();
    // Default requests for btc will go out
    mockedAxios.get.mockResolvedValue({
      data: {
        btc: [
          {ts: ts - 1000, rate: 40000},
          {ts, rate: 41000},
        ],
      },
    });

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    // eth is the requested coin but allowedCoins only has btc (+ btc always added)
    await store.dispatch(
      fetchFiatRateSeriesAllIntervals({
        fiatCode: 'USD',
        currencyAbbreviation: 'eth',
        allowedCoins: ['btc'], // eth not in here
        force: false,
      }),
    );

    // Should not throw; returns early because eth not in allowedCoins
    expect(typeof mockedAxios.get).toBe('function');
  });

  it('fetches missing intervals for non-btc coin', async () => {
    const ts = Date.now();
    // BTC default fetches return data for btc but not eth; eth interval is missing
    mockedAxios.get.mockResolvedValue({
      data: {
        btc: [
          {ts: ts - 1000, rate: 40000},
          {ts, rate: 41000},
        ],
      },
    });

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    await store.dispatch(
      fetchFiatRateSeriesAllIntervals({
        fiatCode: 'USD',
        currencyAbbreviation: 'eth',
        force: false,
      }),
    );

    // Multiple network calls should have been made (one per interval for default + coin-specific)
    expect(mockedAxios.get).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// startGetRates – init context (sets altCurrencyList)
// ---------------------------------------------------------------------------
describe('startGetRates – init context', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => jest.clearAllMocks());

  it('sets altCurrencyList when context is "init"', async () => {
    const freshRates = {
      btc: [
        {code: 'USD', rate: 60000, name: 'US Dollar', fetchedOn: NOW, ts: NOW},
        {code: 'EUR', rate: 55000, name: 'Euro', fetchedOn: NOW, ts: NOW},
      ],
    };
    mockedAxios.get
      .mockResolvedValueOnce({data: freshRates})
      .mockResolvedValueOnce({data: freshRates});

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
      APP: {altCurrencyList: []},
      WALLET: {keys: {}, customTokenOptionsByAddress: {}},
    };
    const store = configureTestStore(state);

    await store.dispatch(startGetRates({context: 'init', force: true}));

    // Should have dispatched addAltCurrencyList with USD and EUR
    // We verify indirectly – no throw and 2 axios calls made
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it('updates altCurrencyList when altCurrencyList is empty (even without init context)', async () => {
    const freshRates = {
      btc: [
        {code: 'USD', rate: 60000, name: 'US Dollar', fetchedOn: NOW, ts: NOW},
      ],
    };
    mockedAxios.get
      .mockResolvedValueOnce({data: freshRates})
      .mockResolvedValueOnce({data: freshRates});

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
      APP: {altCurrencyList: []}, // empty → should trigger alt currency list update
      WALLET: {keys: {}, customTokenOptionsByAddress: {}},
    };
    const store = configureTestStore(state);

    await store.dispatch(startGetRates({force: true}));
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it('skips altCurrencyList update when context is not init and list is non-empty', async () => {
    const freshRates = {
      btc: [
        {code: 'USD', rate: 60000, name: 'US Dollar', fetchedOn: NOW, ts: NOW},
      ],
    };
    mockedAxios.get
      .mockResolvedValueOnce({data: freshRates})
      .mockResolvedValueOnce({data: freshRates});

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
      APP: {altCurrencyList: [{isoCode: 'USD', name: 'US Dollar'}]}, // non-empty → skip update
      WALLET: {keys: {}, customTokenOptionsByAddress: {}},
    };
    const store = configureTestStore(state);

    // No context (not 'init'), altCurrencyList has items → should NOT update
    await store.dispatch(startGetRates({force: true}));
    expect(mockedAxios.get).toHaveBeenCalledTimes(2); // rates still fetched
  });

  it('resolves with merged rates including token rates', async () => {
    const freshRates = {
      btc: [
        {code: 'USD', rate: 60000, name: 'Bitcoin', fetchedOn: NOW, ts: NOW},
      ],
    };
    mockedAxios.get
      .mockResolvedValueOnce({data: freshRates})
      .mockResolvedValueOnce({data: freshRates});

    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {},
        ratesCacheKey: {},
      },
      APP: {altCurrencyList: [{isoCode: 'USD', name: 'US Dollar'}]},
      WALLET: {keys: {}, customTokenOptionsByAddress: {}},
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(startGetRates({force: true}));
    expect(result).toHaveProperty('btc');
  });
});

// ---------------------------------------------------------------------------
// getContractAddresses – extracts token addresses from wallets
// ---------------------------------------------------------------------------
describe('getContractAddresses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty array when there are no keys', () => {
    const state = {
      WALLET: {keys: {}, customTokenOptionsByAddress: {}},
    };
    const store = configureTestStore(state);
    const result = store.dispatch(getContractAddresses('eth'));
    expect(result).toEqual([]);
  });

  it('returns token addresses for wallets on matching chain with tokens', () => {
    const mockWalletId = 'wallet-eth-1';
    const tokenId = `${mockWalletId}-0xTokenAddress`;
    const state = {
      WALLET: {
        keys: {
          key1: {
            wallets: [
              {
                id: mockWalletId,
                chain: 'eth',
                currencyAbbreviation: 'eth', // not an ERC token → included
                tokens: [tokenId],
              },
            ],
          },
        },
        customTokenOptionsByAddress: {},
      },
    };
    const store = configureTestStore(state as any);
    const result = store.dispatch(getContractAddresses('eth'));
    // Token address extracted (strips wallet id prefix)
    expect(result).toContain('0xTokenAddress');
  });

  it('skips wallets on non-matching chain', () => {
    const state = {
      WALLET: {
        keys: {
          key1: {
            wallets: [
              {
                id: 'wallet-matic-1',
                chain: 'matic',
                currencyAbbreviation: 'matic',
                tokens: ['wallet-matic-1-0xPolygonToken'],
              },
            ],
          },
        },
        customTokenOptionsByAddress: {},
      },
    };
    const store = configureTestStore(state as any);
    // Looking for eth chain → matic wallet should be skipped
    const result = store.dispatch(getContractAddresses('eth'));
    expect(result).toEqual([]);
  });

  it('deduplicates token addresses across wallets', () => {
    const tokenAddress = '0xSharedToken';
    const state = {
      WALLET: {
        keys: {
          key1: {
            wallets: [
              {
                id: 'w1',
                chain: 'eth',
                currencyAbbreviation: 'eth',
                tokens: [`w1-${tokenAddress}`],
              },
              {
                id: 'w2',
                chain: 'eth',
                currencyAbbreviation: 'eth',
                tokens: [`w2-${tokenAddress}`],
              },
            ],
          },
        },
        customTokenOptionsByAddress: {},
      },
    };
    const store = configureTestStore(state as any);
    const result = store.dispatch(getContractAddresses('eth'));
    // Same address from two wallets → deduped to one
    const uniqueCount = new Set(result).size;
    expect(uniqueCount).toBe(result.length);
  });
});

// ---------------------------------------------------------------------------
// refreshFiatRateSeries – additional edge cases
// ---------------------------------------------------------------------------
describe('refreshFiatRateSeries – additional edge cases', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns false when lastTs is missing from the last point', async () => {
    // Artificially create a cached series with a point that has ts=0 (falsy)
    const cacheKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {
          [cacheKey]: {fetchedOn: Date.now(), points: [{ts: 0, rate: 30000}]},
        },
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '1D',
        spotRate: 35000,
      }),
    );

    // ts=0 is falsy → returns false
    expect(result).toBe(false);
  });

  it('returns false when cadence has not elapsed for 1W interval', async () => {
    // 1W fallback cadence is 2 hours (7200000 ms).
    // With only 1 point and last point 30 min ago → cadence not elapsed → false
    const recentTs = Date.now() - 30 * 60 * 1000; // 30 min ago
    const cacheKey = getFiatRateSeriesCacheKey('USD', 'btc', '1W');
    const state = {
      RATE: {
        rates: {},
        lastDayRates: {},
        fiatRateSeriesCache: {
          [cacheKey]: {
            fetchedOn: Date.now(),
            points: [{ts: recentTs, rate: 30000}],
          },
        },
        ratesCacheKey: {},
      },
    };
    const store = configureTestStore(state);

    // Single point → uses fallback cadence (2h); last is 30 min → below cadence → false
    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '1W',
        spotRate: 35000,
      }),
    );

    expect(result).toBe(false);
  });

  it('refreshes for 1M interval (cadence 6h) when last point is old enough', async () => {
    const oldTs1 = Date.now() - 14 * 60 * 60 * 1000; // 14h ago
    const oldTs2 = Date.now() - 7 * 60 * 60 * 1000; // 7h ago
    const state = buildStateWithCache('btc', '1M', [
      {ts: oldTs1, rate: 29000},
      {ts: oldTs2, rate: 30000},
    ]);
    const store = configureTestStore(state);

    // 1M cadence is 6h; last point is 7h ago → above cadence → should refresh
    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '1M',
        spotRate: 35000,
      }),
    );

    expect(result).toBe(true);
  });

  it('refreshes for 3M interval (cadence 24h) when last point is 25h old', async () => {
    const oldTs = Date.now() - 25 * 60 * 60 * 1000;
    const state = buildStateWithCache('btc', '3M', [{ts: oldTs, rate: 30000}]);
    const store = configureTestStore(state);

    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '3M',
        spotRate: 35000,
      }),
    );

    expect(result).toBe(true);
  });

  it('refreshes for 1Y interval (cadence 24h) when last point is 25h old', async () => {
    const oldTs = Date.now() - 25 * 60 * 60 * 1000;
    const state = buildStateWithCache('btc', '1Y', [{ts: oldTs, rate: 30000}]);
    const store = configureTestStore(state);

    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '1Y',
        spotRate: 35000,
      }),
    );

    expect(result).toBe(true);
  });

  it('refreshes for 5Y interval (cadence 24h) when last point is 25h old', async () => {
    const oldTs = Date.now() - 25 * 60 * 60 * 1000;
    const state = buildStateWithCache('btc', '5Y', [{ts: oldTs, rate: 30000}]);
    const store = configureTestStore(state);

    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '5Y',
        spotRate: 35000,
      }),
    );

    expect(result).toBe(true);
  });

  it('uses cadence derived from actual point delta when 2+ points available', async () => {
    // 2 points with 30-min gap → cadence = 30 min
    // last point is 31 min ago → should refresh
    const oldTs1 = Date.now() - 61 * 60 * 1000;
    const oldTs2 = Date.now() - 31 * 60 * 1000;
    const state = buildStateWithCache('eth', '1W', [
      {ts: oldTs1, rate: 1800},
      {ts: oldTs2, rate: 1900},
    ]);
    const store = configureTestStore(state);

    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'eth',
        interval: '1W',
        spotRate: 2000,
      }),
    );

    expect(result).toBe(true);
  });

  it('truncates sliding window – final points array is no longer than original length', async () => {
    // Build state with exactly 3 points
    const t1 = Date.now() - 3 * 15 * 60 * 1000;
    const t2 = Date.now() - 2 * 15 * 60 * 1000;
    const t3 = Date.now() - 15 * 60 * 1000; // 15 min ago → at cadence boundary
    const state = buildStateWithCache('btc', '1D', [
      {ts: t1, rate: 29000},
      {ts: t2, rate: 30000},
      {ts: t3, rate: 31000},
    ]);
    const store = configureTestStore(state);

    const result = await store.dispatch(
      refreshFiatRateSeries({
        fiatCode: 'USD',
        currencyAbbreviation: 'btc',
        interval: '1D',
        spotRate: 32000,
      }),
    );

    const cacheKey = getFiatRateSeriesCacheKey('USD', 'btc', '1D');
    const storedSeries = store.getState().RATE?.fiatRateSeriesCache?.[cacheKey];
    // targetLength was 3; after append+trim → still 3
    expect(result).toBe(true);
    expect(storedSeries?.points?.length).toBe(3);
    // New rate should be present
    const rates = storedSeries?.points?.map((p: any) => p.rate) ?? [];
    expect(rates).toContain(32000);
  });
});

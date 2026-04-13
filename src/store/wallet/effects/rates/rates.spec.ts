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
  addTokenChainSuffix: jest.fn((addr: string, chain: string) => `${addr}_e.${chain}`),
  getErrorString: jest.fn((e: unknown) => String(e)),
  createWalletsForAccounts: jest.fn(() => Promise.resolve([])),
  getEvmGasWallets: jest.fn(() => []),
  checkEncryptedKeysForEddsaMigration: jest.fn(() => () => Promise.resolve()),
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

    const cachedRates = {btc: [{code: 'USD', rate: 50000, name: 'Bitcoin', fetchedOn: freshTimestamp, ts: freshTimestamp}]};
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
      btc: [{code: 'USD', rate: 60000, name: 'Bitcoin', fetchedOn: NOW, ts: NOW}],
    };
    mockedAxios.get
      .mockResolvedValueOnce({data: freshRates})       // current rates
      .mockResolvedValueOnce({data: freshRates});      // yesterday rates

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

    const cachedRates = {btc: [{code: 'USD', rate: 30000, name: 'Bitcoin', fetchedOn: NOW, ts: NOW}]};
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
    const state = buildStateWithCache('btc', '1D', [{ts: NOW - 60_000, rate: 30000}]);
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
    const state = buildStateWithCache('btc', '1D', [{ts: NOW - 60_000, rate: 30000}]);
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
    const state = buildStateWithCache('btc', 'ALL', [{ts: NOW - 100_000, rate: 30000}]);
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
    const state = buildStateWithCache('btc', '1D', [{ts: recentTs, rate: 30000}]);
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
      data: {btc: [{ts: ts - 1000, rate: 40000}, {ts, rate: 41000}]},
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
});

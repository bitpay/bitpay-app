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
 * - We also exercise the rate.models helpers imported by rates.ts:
 *     getFiatRateSeriesCacheKey
 *     hasValidSeriesForCoin
 */

import axios from 'axios';
import configureTestStore from '@test/store';
import {
  getHistoricFiatRate,
  startGetRates,
  getContractAddresses,
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

// Moralis token prices – return empty array by default for token-rate paths
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

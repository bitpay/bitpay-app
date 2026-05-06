import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import type {FiatRateSeriesCache} from '../../../store/rate/rate.models';
import usePortfolioHistoricalRateDepsCache from './usePortfolioHistoricalRateDepsCache';
import useRuntimeFiatRateSeriesCache from './useRuntimeFiatRateSeriesCache';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let latestHookState:
  | ReturnType<typeof usePortfolioHistoricalRateDepsCache>
  | undefined;

const mockUseRuntimeFiatRateSeriesCache =
  useRuntimeFiatRateSeriesCache as jest.MockedFunction<
    typeof useRuntimeFiatRateSeriesCache
  >;

const runtimeCacheStateByQuoteAndInterval: Record<
  string,
  Record<
    string,
    {
      cache: FiatRateSeriesCache;
      loading?: boolean;
      error?: Error;
    }
  >
> = {
  USD: {},
};

jest.mock('../../../utils/portfolio/balanceChartData', () => ({
  areBalanceChartHistoricalRatesReady: jest.fn(
    ({
      depKeys,
      fiatRateSeriesCache,
    }: {
      depKeys: string[];
      fiatRateSeriesCache?: FiatRateSeriesCache;
    }) => depKeys.every(cacheKey => !!fiatRateSeriesCache?.[cacheKey]),
  ),
  buildBalanceChartHistoricalRateRequests: jest.fn(
    ({
      quoteCurrency,
      timeframes,
    }: {
      quoteCurrency: string;
      timeframes: string[];
    }) => {
      const timeframe = timeframes?.[0] || '1D';
      const requestGroups = [
        {
          quoteCurrency: 'USD',
          requests: [
            {
              coin: 'btc',
              intervals: [timeframe],
            },
          ],
        },
      ];

      if (String(quoteCurrency || 'USD').toUpperCase() !== 'USD') {
        requestGroups.push({
          quoteCurrency: String(quoteCurrency || '').toUpperCase(),
          requests: [
            {
              coin: 'btc',
              intervals: [timeframe],
            },
          ],
        });
      }

      return requestGroups;
    },
  ),
  getBalanceChartHistoricalRateCacheKeysFromRequestGroups: jest.fn(
    (
      requestGroups: Array<{
        quoteCurrency: string;
        requests: Array<{coin: string; intervals?: string[]}>;
      }>,
    ) => {
      const cacheKeys = new Set<string>();

      for (const group of requestGroups || []) {
        for (const request of group.requests || []) {
          for (const interval of request.intervals || []) {
            cacheKeys.add(`${group.quoteCurrency}:${request.coin}:${interval}`);
          }
        }
      }

      return Array.from(cacheKeys).sort();
    },
  ),
  getBalanceChartHistoricalRateCacheRevision: jest.fn(
    ({
      depKeys,
      fiatRateSeriesCache,
    }: {
      depKeys: string[];
      fiatRateSeriesCache?: FiatRateSeriesCache;
    }) =>
      depKeys
        .map(cacheKey => {
          const entry = fiatRateSeriesCache?.[cacheKey];
          return `${cacheKey}:${entry?.fetchedOn ?? 'missing'}:${
            entry?.points?.[entry.points.length - 1]?.ts ?? 'missing'
          }`;
        })
        .join('|'),
  ),
}));

jest.mock('./useRuntimeFiatRateSeriesCache', () => jest.fn());

const HookHarness = ({
  refreshToken,
  timeframe,
}: {
  refreshToken?: string | number;
  timeframe: string;
}) => {
  latestHookState = usePortfolioHistoricalRateDepsCache({
    wallets: [
      {
        summary: {
          walletId: 'wallet-1',
        },
      } as any,
    ],
    quoteCurrency: 'USD',
    timeframes: [timeframe as any],
    enabled: true,
    refreshToken,
  });

  return null;
};

const series = (fetchedOn: number, ts: number, rate: number) => ({
  fetchedOn,
  points: [{ts, rate}],
});

describe('usePortfolioHistoricalRateDepsCache', () => {
  beforeEach(() => {
    latestHookState = undefined;
    runtimeCacheStateByQuoteAndInterval.USD = {};

    mockUseRuntimeFiatRateSeriesCache.mockReset();
    mockUseRuntimeFiatRateSeriesCache.mockImplementation(
      ({
        quoteCurrency,
        requests,
      }: {
        quoteCurrency: string;
        requests: Array<{intervals?: string[]}>;
      }) => {
        const interval = requests?.[0]?.intervals?.[0] || 'none';
        const quote = String(quoteCurrency || '').toUpperCase();
        const state = runtimeCacheStateByQuoteAndInterval[quote]?.[
          interval
        ] || {
          cache: {},
          loading: false,
          error: undefined,
        };

        return {
          cache: state.cache,
          loading: !!state.loading,
          error: state.error,
          reload: jest.fn().mockResolvedValue(state.cache),
        };
      },
    );
  });

  it('retains previously loaded timeframe caches across timeframe switches', async () => {
    runtimeCacheStateByQuoteAndInterval.USD['1D'] = {
      cache: {
        'USD:btc:1D': series(100, 1, 10),
      },
    };

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(<HookHarness timeframe="1D" />);
    });

    expect(latestHookState?.cache).toEqual({
      'USD:btc:1D': series(100, 1, 10),
    });
    expect(latestHookState?.depKeys).toEqual(['USD:btc:1D']);
    expect(latestHookState?.hasRequests).toBe(true);
    expect(latestHookState?.ready).toBe(true);
    expect(latestHookState?.revision).toBe('USD:btc:1D:100:1');
    expect(latestHookState?.shouldWaitForReady).toBe(false);

    runtimeCacheStateByQuoteAndInterval.USD['1W'] = {
      cache: {
        'USD:btc:1W': series(200, 2, 20),
      },
    };

    await act(async () => {
      view!.update(<HookHarness timeframe="1W" />);
    });

    expect(latestHookState?.cache).toEqual({
      'USD:btc:1D': series(100, 1, 10),
      'USD:btc:1W': series(200, 2, 20),
    });
    expect(latestHookState?.depKeys).toEqual(['USD:btc:1W']);
    expect(latestHookState?.ready).toBe(true);
    expect(latestHookState?.revision).toBe('USD:btc:1W:200:2');
  });

  it('keeps the returned cache reference stable when a reload returns semantically identical entries', async () => {
    runtimeCacheStateByQuoteAndInterval.USD['1D'] = {
      cache: {
        'USD:btc:1D': series(100, 1, 10),
      },
    };

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(<HookHarness timeframe="1D" />);
    });

    const firstCacheRef = latestHookState?.cache;

    runtimeCacheStateByQuoteAndInterval.USD['1D'] = {
      cache: {
        'USD:btc:1D': {
          fetchedOn: 100,
          points: [{ts: 1, rate: 10}],
        },
      },
    };

    await act(async () => {
      view!.update(<HookHarness timeframe="1D" />);
    });

    expect(latestHookState?.cache).toBe(firstCacheRef);
  });

  it('reports pending readiness from the same request groups used by the cache fetch', async () => {
    runtimeCacheStateByQuoteAndInterval.USD['1D'] = {
      cache: {},
      loading: true,
    };

    await act(async () => {
      TestRenderer.create(<HookHarness timeframe="1D" />);
    });

    expect(latestHookState?.requestGroups).toEqual([
      {
        quoteCurrency: 'USD',
        requests: [
          {
            coin: 'btc',
            intervals: ['1D'],
          },
        ],
      },
    ]);
    expect(latestHookState?.depKeys).toEqual(['USD:btc:1D']);
    expect(latestHookState?.ready).toBe(false);
    expect(latestHookState?.revision).toBe('USD:btc:1D:missing:missing');
    expect(latestHookState?.shouldWaitForReady).toBe(true);
  });

  it('forwards refresh token to runtime cache loads', async () => {
    runtimeCacheStateByQuoteAndInterval.USD['1D'] = {
      cache: {
        'USD:btc:1D': series(100, 1, 10),
      },
    };

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(
        <HookHarness refreshToken={1} timeframe="1D" />,
      );
    });

    expect(mockUseRuntimeFiatRateSeriesCache).toHaveBeenLastCalledWith(
      expect.objectContaining({
        refreshToken: 1,
      }),
    );

    await act(async () => {
      view!.update(<HookHarness refreshToken={2} timeframe="1D" />);
    });

    expect(mockUseRuntimeFiatRateSeriesCache).toHaveBeenLastCalledWith(
      expect.objectContaining({
        refreshToken: 2,
      }),
    );
  });
});

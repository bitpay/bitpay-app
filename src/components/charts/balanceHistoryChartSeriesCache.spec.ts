import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {
  BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY,
  BALANCE_HISTORY_CHART_SERIES_CACHE_TTL_MS,
  __resetBalanceHistoryChartSeriesCacheMemoryForTests,
  cacheBalanceHistoryChartSeries,
  clearBalanceHistoryChartSeriesCache,
  getCachedBalanceHistoryChartSeries,
  hasCachedBalanceHistoryChartSeries,
  invalidateBalanceHistoryChartSeriesCacheForWalletIds,
  useCachedBalanceHistoryChartSeries,
  type BalanceHistoryChartCacheLookup,
  type CachedBalanceChartSeriesState,
} from './balanceHistoryChartSeriesCache';
import {
  BALANCE_HISTORY_CHART_SCOPE_IDENTITY_KEY,
  buildBalanceChartScopeId,
} from '../../utils/portfolio/chartCache';

const mockPortfolioMmkvValues = new Map<string, string>();
const mockPortfolioMmkvStorage = {
  getString: jest.fn((key: string) => mockPortfolioMmkvValues.get(key)),
  set: jest.fn((key: string, value: string) => {
    mockPortfolioMmkvValues.set(key, value);
  }),
  delete: jest.fn((key: string) => {
    mockPortfolioMmkvValues.delete(key);
  }),
};

jest.mock('../../portfolio/adapters/rn/workletMmkvBridge', () => ({
  getPortfolioMmkvStorageOnRN: () => mockPortfolioMmkvStorage,
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const CacheProbe = ({
  lookup,
  onState,
}: {
  lookup: BalanceHistoryChartCacheLookup;
  onState: (state: CachedBalanceChartSeriesState | undefined) => void;
}) => {
  onState(useCachedBalanceHistoryChartSeries(lookup));
  return null;
};

const buildState = (args: {
  walletIds: string[];
  timestamps: number[];
  fiatByWallet: Record<string, number[]>;
  basisByWallet: Record<string, number[]>;
  balanceOffset?: number;
  revision?: string;
  cachedAt?: number;
  persistable?: boolean;
}): CachedBalanceChartSeriesState => {
  const balanceOffset = args.balanceOffset ?? 0;
  const analysisPoints = args.timestamps.map((timestamp, index) => {
    const totalFiatBalance = args.walletIds.reduce(
      (total, walletId) => total + (args.fiatByWallet[walletId]?.[index] ?? 0),
      0,
    );
    const totalRemainingCostBasisFiat = args.walletIds.reduce(
      (total, walletId) => total + (args.basisByWallet[walletId]?.[index] ?? 0),
      0,
    );
    const totalUnrealizedPnlFiat =
      totalFiatBalance - totalRemainingCostBasisFiat;
    return {
      timestamp,
      totalFiatBalance,
      totalRemainingCostBasisFiat,
      totalUnrealizedPnlFiat,
      totalPnlChange: totalUnrealizedPnlFiat,
      totalPnlPercent:
        totalRemainingCostBasisFiat > 0
          ? (totalUnrealizedPnlFiat * 100) / totalRemainingCostBasisFiat
          : 0,
      byWalletId: {},
    };
  });
  const graphPoints = analysisPoints.map(point => ({
    date: new Date(point.timestamp),
    value: point.totalFiatBalance + balanceOffset,
  }));
  const scopeId = buildBalanceChartScopeId({
    walletIds: args.walletIds,
    quoteCurrency: 'USD',
    balanceOffset,
    scopeIdentityKey: BALANCE_HISTORY_CHART_SCOPE_IDENTITY_KEY,
  });
  const revision = args.revision ?? args.timestamps.join(',');

  return {
    balanceOffset,
    queryRevisionKey: revision,
    quoteCurrency: 'USD',
    scopeId,
    seriesSignature: `${scopeId}:${revision}`,
    timeframe: '1D',
    walletIds: args.walletIds,
    cachedAt: args.cachedAt,
    persistable: args.persistable,
    series: {
      analysisPoints,
      graphPoints,
      pointByTimestamp: new Map(
        analysisPoints.map(point => [point.timestamp, point]),
      ),
      minIndex: 0,
      maxIndex: graphPoints.length - 1,
      minPoint: graphPoints[0],
      maxPoint: graphPoints[graphPoints.length - 1],
      walletFiatBalanceByWalletId:
        args.walletIds.length > 1 ? args.fiatByWallet : undefined,
      walletRemainingCostBasisFiatByWalletId:
        args.walletIds.length > 1 ? args.basisByWallet : undefined,
    },
  };
};

describe('balanceHistoryChartSeriesCache', () => {
  beforeEach(() => {
    mockPortfolioMmkvValues.clear();
    mockPortfolioMmkvStorage.getString.mockClear();
    mockPortfolioMmkvStorage.set.mockClear();
    mockPortfolioMmkvStorage.delete.mockClear();
    clearBalanceHistoryChartSeriesCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('derives descendant scopes from a cached aggregate and keeps the offset', () => {
    const cachedAt = Date.now();
    cacheBalanceHistoryChartSeries({
      state: buildState({
        walletIds: ['a', 'b', 'c'],
        timestamps: [1_000, 2_000],
        fiatByWallet: {
          a: [10, 12],
          b: [20, 23],
          c: [30, 31],
        },
        basisByWallet: {
          a: [8, 8],
          b: [18, 18],
          c: [25, 25],
        },
        balanceOffset: 5,
        cachedAt,
        persistable: false,
      }),
    });

    const derived = getCachedBalanceHistoryChartSeries({
      walletIds: ['b', 'a'],
      quoteCurrency: 'usd',
      balanceOffset: 5,
      timeframe: '1D',
    });

    expect(derived?.series.graphPoints.map(point => point.value)).toEqual([
      35, 40,
    ]);
    expect(
      derived?.series.analysisPoints.map(point => point.totalFiatBalance),
    ).toEqual([30, 35]);
    expect(
      derived?.series.analysisPoints.map(point => point.totalPnlChange),
    ).toEqual([0, 5]);
    expect(derived?.cachedAt).toBe(cachedAt);
    expect(derived?.persistable).toBe(false);
    expect(
      hasCachedBalanceHistoryChartSeries({
        walletIds: ['a'],
        quoteCurrency: 'USD',
        balanceOffset: 0,
        timeframe: '1D',
      }),
    ).toBe(false);
  });

  it('uses a compatible aggregate cohort after one wallet gets a newer timeline', () => {
    cacheBalanceHistoryChartSeries({
      state: buildState({
        walletIds: ['a', 'b', 'c'],
        timestamps: [1_000, 2_000],
        fiatByWallet: {
          a: [10, 12],
          b: [20, 23],
          c: [30, 31],
        },
        basisByWallet: {
          a: [8, 8],
          b: [18, 18],
          c: [25, 25],
        },
      }),
    });
    cacheBalanceHistoryChartSeries({
      state: buildState({
        walletIds: ['a'],
        timestamps: [3_000, 4_000],
        fiatByWallet: {a: [100, 110]},
        basisByWallet: {a: [80, 80]},
        revision: 'new-a',
      }),
    });

    const derived = getCachedBalanceHistoryChartSeries({
      walletIds: ['a', 'b'],
      quoteCurrency: 'USD',
      timeframe: '1D',
    });

    expect(
      derived?.series.graphPoints.map(point => point.date.getTime()),
    ).toEqual([1_000, 2_000]);
    expect(derived?.series.graphPoints.map(point => point.value)).toEqual([
      30, 35,
    ]);
  });

  it('never reports incompatible individual timelines as a reusable scope', () => {
    cacheBalanceHistoryChartSeries({
      state: buildState({
        walletIds: ['a'],
        timestamps: [1_000, 2_000],
        fiatByWallet: {a: [10, 12]},
        basisByWallet: {a: [8, 8]},
      }),
    });
    cacheBalanceHistoryChartSeries({
      state: buildState({
        walletIds: ['b'],
        timestamps: [3_000, 4_000],
        fiatByWallet: {b: [20, 23]},
        basisByWallet: {b: [18, 18]},
      }),
    });

    const lookup = {
      walletIds: ['a', 'b'],
      quoteCurrency: 'USD',
      timeframe: '1D' as const,
    };
    expect(hasCachedBalanceHistoryChartSeries(lookup)).toBe(false);
    expect(getCachedBalanceHistoryChartSeries(lookup)).toBeUndefined();
  });

  it('composes compatible individual entries with a zero PnL baseline', () => {
    const newerCachedAt = Date.now();
    const olderCachedAt = newerCachedAt - 1_000;
    cacheBalanceHistoryChartSeries({
      state: buildState({
        walletIds: ['a'],
        timestamps: [1_000, 2_000],
        fiatByWallet: {a: [10, 15]},
        basisByWallet: {a: [8, 8]},
        balanceOffset: 7,
        cachedAt: newerCachedAt,
      }),
    });
    cacheBalanceHistoryChartSeries({
      state: buildState({
        walletIds: ['b'],
        timestamps: [1_000, 2_000],
        fiatByWallet: {b: [20, 23]},
        basisByWallet: {b: [18, 18]},
        balanceOffset: 7,
        cachedAt: olderCachedAt,
        persistable: false,
      }),
    });

    const composed = getCachedBalanceHistoryChartSeries({
      walletIds: ['b', 'a'],
      quoteCurrency: 'USD',
      balanceOffset: 7,
      timeframe: '1D',
    });

    expect(composed?.series.graphPoints.map(point => point.value)).toEqual([
      37, 45,
    ]);
    expect(
      composed?.series.analysisPoints.map(point => point.totalPnlChange),
    ).toEqual([0, 8]);
    expect(composed?.cachedAt).toBe(olderCachedAt);
    expect(composed?.persistable).toBe(false);
  });

  it('rejects exact entries that do not contain a renderable series', () => {
    const state = buildState({
      walletIds: ['a'],
      timestamps: [1_000],
      fiatByWallet: {a: [10]},
      basisByWallet: {a: [8]},
    });

    cacheBalanceHistoryChartSeries({state});

    expect(
      getCachedBalanceHistoryChartSeries({
        walletIds: ['a'],
        quoteCurrency: 'USD',
        timeframe: '1D',
      }),
    ).toBeUndefined();
  });

  it('round-trips a serializable DTO and restores Date, Map, and extrema identity', () => {
    const now = 2_000_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const state = buildState({
      walletIds: ['a', 'b'],
      timestamps: [1_000, 2_000, 3_000],
      fiatByWallet: {
        a: [30, 10, 20],
        b: [5, 5, 5],
      },
      basisByWallet: {
        a: [8, 8, 8],
        b: [2, 2, 2],
      },
      cachedAt: now,
    });

    cacheBalanceHistoryChartSeries({state});

    const raw = mockPortfolioMmkvValues.get(
      BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY,
    );
    expect(raw).toBeDefined();
    const persisted = JSON.parse(raw as string);
    expect(persisted.version).toBe(1);
    expect(persisted.entries[0].graphPoints).toEqual([
      [1_000, 35],
      [2_000, 15],
      [3_000, 25],
    ]);
    expect(persisted.entries[0].pointByTimestamp).toBeUndefined();
    expect(persisted.entries[0].minPoint).toBeUndefined();

    __resetBalanceHistoryChartSeriesCacheMemoryForTests();
    const hydrated = getCachedBalanceHistoryChartSeries({
      walletIds: ['b', 'a'],
      quoteCurrency: 'USD',
      timeframe: '1D',
    });

    expect(hydrated?.series.graphPoints[0].date).toBeInstanceOf(Date);
    expect(hydrated?.series.pointByTimestamp).toBeInstanceOf(Map);
    expect(hydrated?.series.pointByTimestamp.get(1_000)).toBe(
      hydrated?.series.analysisPoints[0],
    );
    expect(hydrated?.series.minIndex).toBe(1);
    expect(hydrated?.series.maxIndex).toBe(0);
    expect(hydrated?.series.minPoint).toBe(hydrated?.series.graphPoints[1]);
    expect(hydrated?.series.maxPoint).toBe(hydrated?.series.graphPoints[0]);
    expect(hydrated?.cachedAt).toBe(now);
  });

  it('accepts fresh and boundary entries but ignores expired and future entries', () => {
    const now = 2_000_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const lookup: BalanceHistoryChartCacheLookup = {
      walletIds: ['a'],
      quoteCurrency: 'USD',
      timeframe: '1D',
    };
    const cacheAt = (cachedAt: number, revision: string) => {
      cacheBalanceHistoryChartSeries({
        state: buildState({
          walletIds: ['a'],
          timestamps: [1_000, 2_000],
          fiatByWallet: {a: [10, 12]},
          basisByWallet: {a: [8, 8]},
          cachedAt,
          revision,
        }),
      });
      __resetBalanceHistoryChartSeriesCacheMemoryForTests();
    };

    const freshCachedAt = now - BALANCE_HISTORY_CHART_SERIES_CACHE_TTL_MS + 1;
    cacheAt(freshCachedAt, 'fresh');
    expect(getCachedBalanceHistoryChartSeries(lookup)?.cachedAt).toBe(
      freshCachedAt,
    );

    const boundaryCachedAt = now - BALANCE_HISTORY_CHART_SERIES_CACHE_TTL_MS;
    cacheAt(boundaryCachedAt, 'boundary');
    expect(getCachedBalanceHistoryChartSeries(lookup)?.cachedAt).toBe(
      boundaryCachedAt,
    );

    cacheAt(now - BALANCE_HISTORY_CHART_SERIES_CACHE_TTL_MS - 1, 'expired');
    expect(getCachedBalanceHistoryChartSeries(lookup)).toBeUndefined();

    cacheAt(now + 1, 'future');
    expect(getCachedBalanceHistoryChartSeries(lookup)).toBeUndefined();
  });

  it('ignores unsupported versions and corrupt JSON without crashing', () => {
    mockPortfolioMmkvValues.set(
      BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY,
      JSON.stringify({version: 999, entries: []}),
    );
    __resetBalanceHistoryChartSeriesCacheMemoryForTests();

    expect(
      getCachedBalanceHistoryChartSeries({
        walletIds: ['a'],
        quoteCurrency: 'USD',
        timeframe: '1D',
      }),
    ).toBeUndefined();

    mockPortfolioMmkvValues.set(
      BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY,
      '{not-json',
    );
    __resetBalanceHistoryChartSeriesCacheMemoryForTests();
    expect(() =>
      getCachedBalanceHistoryChartSeries({
        walletIds: ['a'],
        quoteCurrency: 'USD',
        timeframe: '1D',
      }),
    ).not.toThrow();
  });

  it('clears persistent storage even when the memory cache was reset', () => {
    cacheBalanceHistoryChartSeries({
      state: buildState({
        walletIds: ['a'],
        timestamps: [1_000, 2_000],
        fiatByWallet: {a: [10, 12]},
        basisByWallet: {a: [8, 8]},
      }),
    });
    expect(
      mockPortfolioMmkvValues.has(
        BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY,
      ),
    ).toBe(true);

    __resetBalanceHistoryChartSeriesCacheMemoryForTests();
    clearBalanceHistoryChartSeriesCache();

    expect(
      mockPortfolioMmkvValues.has(
        BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY,
      ),
    ).toBe(false);
    __resetBalanceHistoryChartSeriesCacheMemoryForTests();
    expect(
      getCachedBalanceHistoryChartSeries({
        walletIds: ['a'],
        quoteCurrency: 'USD',
        timeframe: '1D',
      }),
    ).toBeUndefined();
  });

  it('keeps non-persistable entries in memory and evicts their persisted predecessor', () => {
    cacheBalanceHistoryChartSeries({
      state: buildState({
        walletIds: ['a'],
        timestamps: [1_000, 2_000],
        fiatByWallet: {a: [10, 12]},
        basisByWallet: {a: [8, 8]},
        revision: 'persisted',
      }),
    });
    cacheBalanceHistoryChartSeries({
      state: buildState({
        walletIds: ['a'],
        timestamps: [1_000, 2_000],
        fiatByWallet: {a: [0, 0]},
        basisByWallet: {a: [0, 0]},
        revision: 'memory-only',
        persistable: false,
      }),
    });

    const lookup: BalanceHistoryChartCacheLookup = {
      walletIds: ['a'],
      quoteCurrency: 'USD',
      timeframe: '1D',
    };
    expect(getCachedBalanceHistoryChartSeries(lookup)?.queryRevisionKey).toBe(
      'memory-only',
    );
    expect(
      mockPortfolioMmkvValues.has(
        BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY,
      ),
    ).toBe(false);

    __resetBalanceHistoryChartSeriesCacheMemoryForTests();
    expect(getCachedBalanceHistoryChartSeries(lookup)).toBeUndefined();
  });

  it('invalidates every memory and persistent entry intersecting wallet ids', () => {
    const cacheWallets = (walletIds: string[], revision: string) => {
      const fiatByWallet = Object.fromEntries(
        walletIds.map((walletId, index) => [
          walletId,
          [10 + index, 12 + index],
        ]),
      );
      const basisByWallet = Object.fromEntries(
        walletIds.map((walletId, index) => [walletId, [8 + index, 8 + index]]),
      );
      cacheBalanceHistoryChartSeries({
        state: buildState({
          walletIds,
          timestamps: [1_000, 2_000],
          fiatByWallet,
          basisByWallet,
          revision,
        }),
      });
    };
    cacheWallets(['a'], 'a');
    cacheWallets(['b'], 'b');
    cacheWallets(['a', 'b'], 'aggregate');

    invalidateBalanceHistoryChartSeriesCacheForWalletIds(['a']);

    expect(
      getCachedBalanceHistoryChartSeries({
        walletIds: ['a'],
        quoteCurrency: 'USD',
        timeframe: '1D',
      }),
    ).toBeUndefined();
    expect(
      getCachedBalanceHistoryChartSeries({
        walletIds: ['a', 'b'],
        quoteCurrency: 'USD',
        timeframe: '1D',
      }),
    ).toBeUndefined();
    expect(
      getCachedBalanceHistoryChartSeries({
        walletIds: ['b'],
        quoteCurrency: 'USD',
        timeframe: '1D',
      })?.queryRevisionKey,
    ).toBe('b');

    __resetBalanceHistoryChartSeriesCacheMemoryForTests();
    expect(
      getCachedBalanceHistoryChartSeries({
        walletIds: ['b'],
        quoteCurrency: 'USD',
        timeframe: '1D',
      })?.series.graphPoints.map(point => point.value),
    ).toEqual([10, 12]);
  });

  it('persists only the twelve most recent entries', () => {
    for (let index = 0; index < 14; index += 1) {
      const walletId = `wallet-${index}`;
      cacheBalanceHistoryChartSeries({
        state: buildState({
          walletIds: [walletId],
          timestamps: [1_000, 2_000],
          fiatByWallet: {[walletId]: [index, index + 1]},
          basisByWallet: {[walletId]: [0, 0]},
          revision: String(index),
        }),
      });
    }

    const raw = mockPortfolioMmkvValues.get(
      BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY,
    );
    expect(JSON.parse(raw as string).entries).toHaveLength(12);
  });

  it('updates a mounted derived lookup after insert, replacement, and clear', () => {
    const lookup: BalanceHistoryChartCacheLookup = {
      walletIds: ['a'],
      quoteCurrency: 'USD',
      timeframe: '1D',
    };
    const observedStates: Array<CachedBalanceChartSeriesState | undefined> = [];
    const latestObservedState = () => observedStates[observedStates.length - 1];
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(CacheProbe, {
          lookup,
          onState: state => observedStates.push(state),
        }),
      );
    });
    expect(latestObservedState()).toBeUndefined();

    act(() => {
      cacheBalanceHistoryChartSeries({
        state: buildState({
          walletIds: ['a', 'b'],
          timestamps: [1_000, 2_000],
          fiatByWallet: {
            a: [10, 12],
            b: [20, 23],
          },
          basisByWallet: {
            a: [8, 8],
            b: [18, 18],
          },
          revision: 'aggregate-v1',
        }),
      });
    });
    expect(
      latestObservedState()?.series.graphPoints.map(point => point.value),
    ).toEqual([10, 12]);

    act(() => {
      cacheBalanceHistoryChartSeries({
        state: buildState({
          walletIds: ['a', 'b'],
          timestamps: [1_000, 2_000],
          fiatByWallet: {
            a: [15, 19],
            b: [20, 23],
          },
          basisByWallet: {
            a: [8, 8],
            b: [18, 18],
          },
          revision: 'aggregate-v2',
        }),
      });
    });
    expect(
      latestObservedState()?.series.graphPoints.map(point => point.value),
    ).toEqual([15, 19]);
    expect(latestObservedState()?.queryRevisionKey).toContain('aggregate-v2');

    act(() => {
      clearBalanceHistoryChartSeriesCache();
    });
    expect(latestObservedState()).toBeUndefined();

    act(() => {
      renderer.unmount();
    });
  });
});

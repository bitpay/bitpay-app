import React from 'react';
import {act, render, waitFor} from '@testing-library/react-native';
import {
  clearPortfolioAssetGroupPopulateCacheForTests,
  usePortfolioAssetRows,
} from './usePortfolioAssetRows';
import type {GainLossMode} from '../../../utils/portfolio/assets';
import {
  buildAssetPnlSummaryIdentityFromViewModelQuery,
  seedAssetPnlSummaryCache,
} from '../assetPnlSummaryCache';
import {
  getBalanceChartHistoricalRateCacheKeys,
  getBalanceChartHistoricalRateCacheRevision,
} from '../../../utils/portfolio/balanceChartData';
import {useAppSelector} from '../../../utils/hooks';
import {usePortfolioStoredWalletAnalysisScope} from './usePortfolioStoredWalletAnalysisScope';
import {runPortfolioBalanceChartViewModelQuery} from '../common';
import usePortfolioHistoricalRateDepsCache from './usePortfolioHistoricalRateDepsCache';

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('../../../utils/portfolio/assets', () => {
  const buildPriorityByKey = (wallets: any[] = []) => {
    const next: Record<string, {fiatBalance: number; firstIndex: number}> = {};
    wallets.forEach((wallet, index) => {
      const key = String(wallet?.currencyAbbreviation || '').toLowerCase();
      if (!key) {
        return;
      }

      const existing = next[key];
      const fiatBalance = Math.max(0, Number(wallet?.balance?.fiat || 0));
      if (!existing) {
        next[key] = {fiatBalance, firstIndex: index};
        return;
      }

      existing.fiatBalance += fiatBalance;
      existing.firstIndex = Math.min(existing.firstIndex, index);
    });
    return next;
  };

  return {
    buildAssetFiatPriorityByKey: jest.fn(buildPriorityByKey),
    buildWalletIdsByAssetGroupKey: jest.fn((wallets: any[] = []) => {
      const next: Record<string, string[]> = {};
      for (const wallet of wallets) {
        const key = String(wallet?.currencyAbbreviation || '').toLowerCase();
        const id = String(wallet?.id || '');
        if (!key || !id) {
          continue;
        }
        next[key] = [...(next[key] || []), id];
      }
      return next;
    }),
    getPortfolioWalletCurrencyAbbreviationLower: jest.fn((wallet: any) =>
      String(wallet?.currencyAbbreviation || '').toLowerCase(),
    ),
    getPortfolioWalletChainLower: jest.fn((wallet: any) =>
      String(wallet?.chain || '').toLowerCase(),
    ),
    getPortfolioWalletTokenAddress: jest.fn((wallet: any) =>
      wallet?.tokenAddress ? String(wallet.tokenAddress) : undefined,
    ),
    getPopulateLoadingByAssetKey: jest.fn(
      ({items, walletIdsByAssetKey, populateStatus}: any) => {
        const statusById = populateStatus?.walletStatusById || {};
        const next: Record<string, boolean> = {};
        for (const item of items || []) {
          const walletIds = walletIdsByAssetKey?.[item.key] || [];
          next[item.key] = walletIds.some((walletId: string) => {
            if (populateStatus?.currentWalletId === walletId) {
              return true;
            }
            return statusById[walletId] === 'in_progress';
          });
        }
        return next;
      },
    ),
    getVisibleWalletsFromKeys: jest.fn(() => []),
    hasCompletedPopulateForWalletIds: jest.fn(
      ({populateStatus, walletIds}: any) => {
        const statusById = populateStatus?.walletStatusById || {};
        return (
          !!populateStatus?.inProgress &&
          !!walletIds?.length &&
          walletIds.every(
            (walletId: string) =>
              statusById[walletId] === 'done' ||
              statusById[walletId] === 'error',
          )
        );
      },
    ),
    sortAssetRowItemsByAssetFiatPriority: jest.fn(({items, wallets}: any) => {
      const priorityByKey = buildPriorityByKey(wallets);
      return [...(items || [])].sort((left, right) => {
        const leftPriority = priorityByKey[left.key];
        const rightPriority = priorityByKey[right.key];
        const fiatDiff =
          (rightPriority?.fiatBalance || 0) - (leftPriority?.fiatBalance || 0);
        if (fiatDiff !== 0) {
          return fiatDiff;
        }
        return (
          (leftPriority?.firstIndex ?? Number.MAX_SAFE_INTEGER) -
          (rightPriority?.firstIndex ?? Number.MAX_SAFE_INTEGER)
        );
      });
    }),
  };
});

jest.mock('./usePortfolioStoredWalletAnalysisScope', () => ({
  usePortfolioStoredWalletAnalysisScope: jest.fn(),
}));

jest.mock('./usePortfolioHistoricalRateDepsCache', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    cache: {},
    depKeys: [],
    error: undefined,
    hasRequests: false,
    loading: false,
    ready: true,
    requestGroups: [],
    revision: 'hist-ready',
    shouldWaitForReady: false,
  })),
}));

jest.mock('../common', () => {
  return {
    buildCommittedPortfolioRevisionToken: jest.fn(({lastPopulatedAt}) =>
      typeof lastPopulatedAt === 'number' ? String(lastPopulatedAt) : '',
    ),
    getCurrentRatesByAssetIdSignature: jest.fn(currentRatesByAssetId =>
      Object.keys(currentRatesByAssetId || {})
        .sort()
        .map(assetId => `${assetId}:${String(currentRatesByAssetId[assetId])}`)
        .join('|'),
    ),
    getStoredWalletRequestSignature: jest.fn((storedWallets = []) =>
      storedWallets
        .map((wallet: any) =>
          [
            wallet.summary.walletId,
            wallet.summary.chain,
            wallet.summary.currencyAbbreviation,
            wallet.summary.tokenAddress || '',
            wallet.summary.balanceAtomic || '',
          ].join(':'),
        )
        .sort()
        .join('|'),
    ),
    runPortfolioBalanceChartViewModelQuery: jest.fn(),
  };
});

const mockUseAppSelector = useAppSelector as jest.Mock;
const mockUseStoredWalletScope =
  usePortfolioStoredWalletAnalysisScope as jest.Mock;
const mockRunPortfolioBalanceChartViewModelQuery =
  runPortfolioBalanceChartViewModelQuery as jest.Mock;
const mockUsePortfolioHistoricalRateDepsCache =
  usePortfolioHistoricalRateDepsCache as jest.Mock;
const mockGetVisibleWalletsFromKeys = jest.requireMock(
  '../../../utils/portfolio/assets',
).getVisibleWalletsFromKeys as jest.Mock;

let latestResult: ReturnType<typeof usePortfolioAssetRows> | undefined;

const HookHarness = ({
  assetKeys,
  externalRefreshToken,
  gainLossMode = '1D',
  keyId,
}: {
  assetKeys?: string[];
  externalRefreshToken?: string | number;
  gainLossMode?: GainLossMode;
  keyId?: string;
}) => {
  latestResult = usePortfolioAssetRows({
    gainLossMode,
    keyId,
    assetKeys,
    externalRefreshToken,
  });
  return null;
};

const makeVisibleWallet = (
  id: string,
  currencyAbbreviation: string,
  fiat: number,
) => ({
  id,
  currencyAbbreviation,
  chain: currencyAbbreviation,
  network: 'livenet',
  balance: {
    fiat,
  },
});

const makeStoredWallet = (
  walletId: string,
  currencyAbbreviation: string,
  balanceAtomic = '100000000',
) => ({
  walletId,
  addedAt: 0,
  summary: {
    walletId,
    walletName: currencyAbbreviation.toUpperCase(),
    currencyAbbreviation,
    chain: currencyAbbreviation,
    tokenAddress: undefined,
    network: 'livenet',
    balanceAtomic,
    balanceFormatted: '1',
  },
  credentials: {
    walletId,
    chain: currencyAbbreviation,
    coin: currencyAbbreviation,
  },
});

const makeViewModel = (args: {
  queryArgs: any;
  fiat?: number;
  pnlFiat?: number;
  pnlPercent?: number;
}) => {
  const fiat = args.fiat ?? 100;
  const pnlFiat = args.pnlFiat ?? 5.22;
  const pnlPercent = args.pnlPercent ?? 1.64;

  return {
    timeframe: args.queryArgs.timeframe,
    quoteCurrency: args.queryArgs.quoteCurrency,
    walletIds: args.queryArgs.walletIds,
    dataRevisionSig: args.queryArgs.dataRevisionSig,
    balanceOffset: args.queryArgs.balanceOffset ?? 0,
    graphPoints: [{ts: 1, value: fiat}],
    analysisPoints: [
      {
        timestamp: 1,
        totalFiatBalance: fiat,
        totalRemainingCostBasisFiat: fiat - pnlFiat,
        totalUnrealizedPnlFiat: pnlFiat,
        totalPnlChange: pnlFiat,
        totalPnlPercent: pnlPercent,
        totalCryptoBalanceFormatted: '1',
      },
    ],
    latestTotalFiatBalance: fiat,
    latestDisplayedTotalFiatBalance: fiat,
    totalPnlChange: pnlFiat,
    totalPnlPercent: pnlPercent,
    changeRow: {
      totalPnlChange: pnlFiat,
      totalPnlPercent: pnlPercent,
    },
  };
};

const getTestSummaryCacheRevisionSig = (args: {
  storedWallets: any[];
  quoteCurrency: string;
  timeframe: GainLossMode;
  fiatRateSeriesCache?: Record<
    string,
    {fetchedOn: number; points: Array<{ts: number; rate: number}>}
  >;
}) => {
  const depKeys = getBalanceChartHistoricalRateCacheKeys({
    wallets: args.storedWallets,
    quoteCurrency: args.quoteCurrency,
    timeframes: [args.timeframe],
  });
  const fiatRateSeriesCache =
    args.fiatRateSeriesCache || buildReadyHistoricalRateCache(depKeys);

  return [
    '',
    getBalanceChartHistoricalRateCacheRevision({
      depKeys,
      fiatRateSeriesCache,
    }),
  ].join('|');
};

function buildReadyHistoricalRateCache(
  depKeys: string[],
  fetchedOnBase = 1000,
) {
  return depKeys.reduce<
    Record<
      string,
      {fetchedOn: number; points: Array<{ts: number; rate: number}>}
    >
  >((next, depKey, index) => {
    next[depKey] = {
      fetchedOn: fetchedOnBase + index,
      points: [{ts: fetchedOnBase + 1000 + index, rate: 1}],
    };
    return next;
  }, {});
}

function makeHistoricalRateDepsState(args: {
  wallets?: any[];
  quoteCurrency?: string;
  timeframes?: GainLossMode[];
  cache?: Record<
    string,
    {fetchedOn: number; points: Array<{ts: number; rate: number}>}
  >;
  loading?: boolean;
  error?: Error;
  refreshToken?: string | number;
}) {
  const depKeys = getBalanceChartHistoricalRateCacheKeys({
    wallets: args.wallets || [],
    quoteCurrency: args.quoteCurrency || 'USD',
    timeframes: args.timeframes || ['1D'],
  });
  const cache = args.cache || buildReadyHistoricalRateCache(depKeys);
  const ready = depKeys.every(depKey => !!cache[depKey]);
  const error = args.error;
  const loading = !!args.loading;

  return {
    cache,
    depKeys,
    error,
    hasRequests: depKeys.length > 0,
    loading,
    ready,
    requestGroups: [],
    revision: getBalanceChartHistoricalRateCacheRevision({
      depKeys,
      fiatRateSeriesCache: cache,
    }),
    shouldWaitForReady: depKeys.length > 0 && !ready && !error && loading,
  };
}

const makeScope = (args?: {
  visibleWallets?: any[];
  storedWallets?: any[];
  currentRatesByAssetId?: Record<string, number>;
  asOfMs?: number;
  committedRevisionToken?: string;
}) => {
  const visibleWallets = args?.visibleWallets || [
    makeVisibleWallet('btc-wallet', 'btc', 100),
  ];
  const storedWallets = args?.storedWallets || [
    makeStoredWallet('btc-wallet', 'btc'),
  ];

  return {
    asOfMs: args?.asOfMs ?? 1234,
    committedRevisionToken: args?.committedRevisionToken ?? 'committed-1',
    currentRatesByAssetId:
      args?.currentRatesByAssetId ||
      storedWallets.reduce((next: Record<string, number>, wallet: any) => {
        const coin = wallet.summary.currencyAbbreviation;
        next[`${coin}:${coin}`] = 100;
        return next;
      }, {}),
    currentRatesSignature: '',
    eligibleWallets: visibleWallets,
    quoteCurrency: 'USD',
    rates: {},
    storedWalletRequestSig: storedWallets
      .map((wallet: any) =>
        [
          wallet.summary.walletId,
          wallet.summary.chain,
          wallet.summary.currencyAbbreviation,
          '',
          wallet.summary.balanceAtomic,
        ].join(':'),
      )
      .sort()
      .join('|'),
    storedWallets,
  };
};

describe('usePortfolioAssetRows', () => {
  let mockState: any;

  beforeEach(() => {
    latestResult = undefined;
    clearPortfolioAssetGroupPopulateCacheForTests();
    mockState = {
      PORTFOLIO: {
        lastPopulatedAt: 10,
        populateStatus: {
          inProgress: false,
          finishedAt: 10,
          stopReason: 'completed',
          errors: [],
          walletStatusById: {},
        },
      },
      APP: {
        homeCarouselConfig: undefined,
      },
      WALLET: {
        keys: {},
      },
    };
    mockUseAppSelector.mockReset();
    mockUseAppSelector.mockImplementation(selector => selector(mockState));
    mockGetVisibleWalletsFromKeys.mockReset();
    mockGetVisibleWalletsFromKeys.mockReturnValue([
      makeVisibleWallet('btc-wallet', 'btc', 100),
    ]);
    mockUseStoredWalletScope.mockReset();
    mockUseStoredWalletScope.mockReturnValue(makeScope());
    mockUsePortfolioHistoricalRateDepsCache.mockReset();
    mockUsePortfolioHistoricalRateDepsCache.mockImplementation(
      makeHistoricalRateDepsState,
    );
    mockRunPortfolioBalanceChartViewModelQuery.mockReset();
    mockRunPortfolioBalanceChartViewModelQuery.mockImplementation(
      (queryArgs: any) => Promise.resolve(makeViewModel({queryArgs})),
    );
  });

  it('clears home row pnl loading when a matching per-asset summary is available', async () => {
    let resolveSummary: ((value: any) => void) | undefined;
    mockRunPortfolioBalanceChartViewModelQuery.mockImplementation(
      (queryArgs: any) =>
        new Promise(resolve => {
          resolveSummary = value => resolve(value);
          void queryArgs;
        }) as any,
    );

    render(<HookHarness assetKeys={['btc']} />);

    await waitFor(() => {
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          hasPnl: false,
          showPnlPlaceholder: false,
          showScopedPnlLoading: true,
        }),
      ]);
    });

    await act(async () => {
      const queryArgs =
        mockRunPortfolioBalanceChartViewModelQuery.mock.calls[0][0];
      resolveSummary?.(
        makeViewModel({
          queryArgs,
          pnlFiat: 5.22,
          pnlPercent: 1.64,
        }),
      );
    });

    await waitFor(() => {
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          deltaFiat: '+$5.22',
          deltaPercent: '+1.64%',
          hasPnl: true,
          showPnlPlaceholder: false,
          showScopedPnlLoading: false,
        }),
      ]);
    });
  });

  it('shows a PnL placeholder only after a completed populate asset fails summary loading', async () => {
    let rejectSummary: ((error: Error) => void) | undefined;
    mockState.PORTFOLIO.populateStatus = {
      inProgress: true,
      startedAt: 11,
      errors: [],
      walletStatusById: {
        'btc-wallet': 'done',
      },
    };
    mockRunPortfolioBalanceChartViewModelQuery.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectSummary = reject;
        }) as any,
    );

    render(<HookHarness assetKeys={['btc']} />);

    await waitFor(() => {
      expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(
        1,
      );
    });
    await act(async () => {
      rejectSummary?.(new Error('summary failed'));
    });

    await waitFor(() => {
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          hasPnl: false,
          showPnlPlaceholder: true,
          showScopedPnlLoading: false,
        }),
      ]);
      expect(latestResult?.isPopulateLoadingByKey).toEqual({
        btc: false,
      });
    });
  });

  it('uses a detail-chart seeded summary without launching a duplicate row query', async () => {
    const scope = makeScope();
    const queryArgs = {
      wallets: scope.storedWallets,
      quoteCurrency: scope.quoteCurrency,
      timeframe: '1D',
      currentRatesByAssetId: scope.currentRatesByAssetId,
      dataRevisionSig: `committed-1|${scope.storedWalletRequestSig}`,
      walletIds: ['btc-wallet'],
      balanceOffset: 0,
      asOfMs: scope.asOfMs,
      summaryCacheRevisionSig: getTestSummaryCacheRevisionSig({
        storedWallets: scope.storedWallets,
        quoteCurrency: scope.quoteCurrency,
        timeframe: '1D',
      }),
    };
    const identity = buildAssetPnlSummaryIdentityFromViewModelQuery(
      queryArgs as any,
    );
    expect(identity).toBeDefined();
    seedAssetPnlSummaryCache({
      identity: identity!,
      viewModel: makeViewModel({
        queryArgs,
        pnlFiat: -4.5,
        pnlPercent: -1.25,
      }),
    });

    render(<HookHarness assetKeys={['btc']} />);

    await waitFor(() => {
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          deltaFiat: '-$4.50',
          deltaPercent: '-1.25%',
          showScopedPnlLoading: false,
        }),
      ]);
    });
    expect(mockRunPortfolioBalanceChartViewModelQuery).not.toHaveBeenCalled();
  });

  it('uses a detail-chart seeded refreshed summary after focus refresh updates historical deps', async () => {
    const scope = makeScope();
    const depKeys = getBalanceChartHistoricalRateCacheKeys({
      wallets: scope.storedWallets,
      quoteCurrency: scope.quoteCurrency,
      timeframes: ['1D'],
    });
    const oldHistoricalRateCache = buildReadyHistoricalRateCache(depKeys, 1000);
    const refreshedHistoricalRateCache = buildReadyHistoricalRateCache(
      depKeys,
      3000,
    );
    const makeQueryArgs = (
      fiatRateSeriesCache: typeof oldHistoricalRateCache,
    ) => ({
      wallets: scope.storedWallets,
      quoteCurrency: scope.quoteCurrency,
      timeframe: '1D',
      currentRatesByAssetId: scope.currentRatesByAssetId,
      dataRevisionSig: `committed-1|${scope.storedWalletRequestSig}`,
      walletIds: ['btc-wallet'],
      balanceOffset: 0,
      asOfMs: scope.asOfMs,
      summaryCacheRevisionSig: getTestSummaryCacheRevisionSig({
        storedWallets: scope.storedWallets,
        quoteCurrency: scope.quoteCurrency,
        timeframe: '1D',
        fiatRateSeriesCache,
      }),
    });
    const oldQueryArgs = makeQueryArgs(oldHistoricalRateCache);
    const refreshedQueryArgs = makeQueryArgs(refreshedHistoricalRateCache);
    const oldIdentity = buildAssetPnlSummaryIdentityFromViewModelQuery(
      oldQueryArgs as any,
    );
    const refreshedIdentity = buildAssetPnlSummaryIdentityFromViewModelQuery(
      refreshedQueryArgs as any,
    );
    seedAssetPnlSummaryCache({
      identity: oldIdentity!,
      viewModel: makeViewModel({
        queryArgs: oldQueryArgs,
        pnlFiat: 1.11,
        pnlPercent: 1.11,
      }),
    });
    seedAssetPnlSummaryCache({
      identity: refreshedIdentity!,
      viewModel: makeViewModel({
        queryArgs: refreshedQueryArgs,
        pnlFiat: 9.99,
        pnlPercent: 4.56,
      }),
    });
    mockUsePortfolioHistoricalRateDepsCache.mockImplementation(args =>
      makeHistoricalRateDepsState({
        ...args,
        cache:
          args.refreshToken === 1
            ? refreshedHistoricalRateCache
            : oldHistoricalRateCache,
      }),
    );

    const view = render(<HookHarness externalRefreshToken={0} />);

    await waitFor(() => {
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          deltaFiat: '+$1.11',
          deltaPercent: '+1.11%',
          showScopedPnlLoading: false,
        }),
      ]);
    });

    view.rerender(<HookHarness externalRefreshToken={1} />);

    await waitFor(() => {
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          deltaFiat: '+$9.99',
          deltaPercent: '+4.56%',
          showScopedPnlLoading: false,
        }),
      ]);
    });
    expect(mockRunPortfolioBalanceChartViewModelQuery).not.toHaveBeenCalled();
  });

  it('reuses Home preview summaries when AllAssets opens with the same global scope', async () => {
    let resolveSummary: ((value: any) => void) | undefined;
    mockRunPortfolioBalanceChartViewModelQuery.mockImplementation(
      (queryArgs: any) =>
        new Promise(resolve => {
          resolveSummary = value => resolve(value);
          void queryArgs;
        }) as any,
    );

    const homeView = render(<HookHarness assetKeys={['btc']} />);

    await waitFor(() => {
      expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(
        1,
      );
    });
    await act(async () => {
      const queryArgs =
        mockRunPortfolioBalanceChartViewModelQuery.mock.calls[0][0];
      resolveSummary?.(makeViewModel({queryArgs}));
    });

    await waitFor(() => {
      expect(latestResult?.visibleItems[0]).toEqual(
        expect.objectContaining({
          key: 'btc',
          hasPnl: true,
        }),
      );
    });
    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(1);

    homeView.unmount();
    render(<HookHarness />);

    await waitFor(() => {
      expect(latestResult?.visibleItems[0]).toEqual(
        expect.objectContaining({
          key: 'btc',
          hasPnl: true,
          showScopedPnlLoading: false,
        }),
      );
    });
    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(1);
  });

  it('uses compatible cached PnL while historical deps warm outside populate', async () => {
    const btcWallet = makeVisibleWallet('btc-wallet', 'btc', 200);
    const ethWallet = makeVisibleWallet('eth-wallet', 'eth', 100);
    const btcStored = makeStoredWallet('btc-wallet', 'btc');
    const ethStored = makeStoredWallet('eth-wallet', 'eth');
    const scope = makeScope({
      visibleWallets: [btcWallet, ethWallet],
      storedWallets: [btcStored, ethStored],
      currentRatesByAssetId: {
        'btc:btc': 200,
        'eth:eth': 100,
      },
    });
    const allHistoricalRateCache = buildReadyHistoricalRateCache(
      getBalanceChartHistoricalRateCacheKeys({
        wallets: scope.storedWallets,
        quoteCurrency: scope.quoteCurrency,
        timeframes: ['1D'],
      }),
    );
    const seedCachedSummary = (args: {
      storedWallet: any;
      walletId: string;
      pnlFiat: number;
      pnlPercent: number;
    }) => {
      const assetId = `${args.storedWallet.summary.currencyAbbreviation}:${args.storedWallet.summary.chain}`;
      const queryArgs = {
        wallets: [args.storedWallet],
        quoteCurrency: scope.quoteCurrency,
        timeframe: '1D',
        currentRatesByAssetId: {
          [assetId]: scope.currentRatesByAssetId[assetId],
        },
        dataRevisionSig: `committed-1|${[
          args.storedWallet.summary.walletId,
          args.storedWallet.summary.chain,
          args.storedWallet.summary.currencyAbbreviation,
          '',
          args.storedWallet.summary.balanceAtomic,
        ].join(':')}`,
        walletIds: [args.walletId],
        balanceOffset: 0,
        asOfMs: scope.asOfMs,
        summaryCacheRevisionSig: getTestSummaryCacheRevisionSig({
          storedWallets: [args.storedWallet],
          quoteCurrency: scope.quoteCurrency,
          timeframe: '1D',
          fiatRateSeriesCache: allHistoricalRateCache,
        }),
      };
      const identity = buildAssetPnlSummaryIdentityFromViewModelQuery(
        queryArgs as any,
      );
      seedAssetPnlSummaryCache({
        identity: identity!,
        viewModel: makeViewModel({
          queryArgs,
          pnlFiat: args.pnlFiat,
          pnlPercent: args.pnlPercent,
        }),
      });
    };
    seedCachedSummary({
      storedWallet: btcStored,
      walletId: 'btc-wallet',
      pnlFiat: 8.25,
      pnlPercent: 2.5,
    });
    seedCachedSummary({
      storedWallet: ethStored,
      walletId: 'eth-wallet',
      pnlFiat: 3.5,
      pnlPercent: 1.75,
    });
    mockGetVisibleWalletsFromKeys.mockReturnValue([btcWallet, ethWallet]);
    mockUseStoredWalletScope.mockReturnValue(scope);
    mockUsePortfolioHistoricalRateDepsCache.mockImplementation(args =>
      makeHistoricalRateDepsState({
        ...args,
        cache: {},
        loading: true,
      }),
    );

    render(<HookHarness />);

    await waitFor(() => {
      expect(latestResult?.isFiatLoading).toBe(false);
      expect(latestResult?.isPopulateLoadingByKey).toBeUndefined();
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          deltaFiat: '+$8.25',
          deltaPercent: '+2.50%',
          showScopedPnlLoading: false,
        }),
        expect.objectContaining({
          key: 'eth',
          deltaFiat: '+$3.50',
          deltaPercent: '+1.75%',
          showScopedPnlLoading: false,
        }),
      ]);
    });
    expect(mockRunPortfolioBalanceChartViewModelQuery).not.toHaveBeenCalled();
  });

  it('changes the row PnL scope key when switching gain-loss timeframe', async () => {
    const resolvers: Array<(value: any) => void> = [];
    mockRunPortfolioBalanceChartViewModelQuery.mockImplementation(
      (queryArgs: any) =>
        new Promise(resolve => {
          resolvers.push(value => resolve(value));
          void queryArgs;
        }) as any,
    );

    const view = render(<HookHarness gainLossMode="1D" />);

    await waitFor(() => {
      expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(
        1,
      );
    });
    await act(async () => {
      const queryArgs =
        mockRunPortfolioBalanceChartViewModelQuery.mock.calls[0][0];
      resolvers[0](makeViewModel({queryArgs}));
    });

    await waitFor(() => {
      expect(latestResult?.visibleItems[0]).toEqual(
        expect.objectContaining({
          key: 'btc',
          hasPnl: true,
          showScopedPnlLoading: false,
        }),
      );
    });
    const oneDayPnlScopeKey = latestResult?.visibleItems[0]?.pnlScopeKey;

    view.rerender(<HookHarness gainLossMode="ALL" />);

    await waitFor(() => {
      expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(
        2,
      );
      expect(latestResult?.visibleItems[0]).toEqual(
        expect.objectContaining({
          key: 'btc',
          hasPnl: false,
          showScopedPnlLoading: true,
        }),
      );
    });
    expect(latestResult?.visibleItems[0]?.pnlScopeKey).toBeDefined();
    expect(latestResult?.visibleItems[0]?.pnlScopeKey).not.toBe(
      oneDayPnlScopeKey,
    );
  });

  it('does not flash a dash from a no-PnL summary while historical deps warm', async () => {
    const scope = makeScope();
    const depKeys = getBalanceChartHistoricalRateCacheKeys({
      wallets: scope.storedWallets,
      quoteCurrency: scope.quoteCurrency,
      timeframes: ['1D'],
    });
    const missingHistoricalRatesSummaryRevision = [
      '',
      getBalanceChartHistoricalRateCacheRevision({
        depKeys,
        fiatRateSeriesCache: {},
      }),
    ].join('|');
    const queryArgs = {
      wallets: scope.storedWallets,
      quoteCurrency: scope.quoteCurrency,
      timeframe: '1D',
      currentRatesByAssetId: scope.currentRatesByAssetId,
      dataRevisionSig: `committed-1|${scope.storedWalletRequestSig}`,
      walletIds: ['btc-wallet'],
      balanceOffset: 0,
      asOfMs: scope.asOfMs,
      summaryCacheRevisionSig: missingHistoricalRatesSummaryRevision,
    };
    const identity = buildAssetPnlSummaryIdentityFromViewModelQuery(
      queryArgs as any,
    );
    seedAssetPnlSummaryCache({
      identity: identity!,
      viewModel: {
        ...makeViewModel({queryArgs}),
        changeRow: undefined,
      } as any,
    });
    mockState.PORTFOLIO.populateStatus = {
      inProgress: true,
      startedAt: 11,
      errors: [],
      walletStatusById: {
        'btc-wallet': 'done',
      },
    };
    mockUsePortfolioHistoricalRateDepsCache.mockImplementation(args =>
      makeHistoricalRateDepsState({
        ...args,
        cache: {},
        loading: false,
      }),
    );

    render(<HookHarness />);

    await waitFor(() => {
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          hasPnl: false,
          showPnlPlaceholder: false,
          showScopedPnlLoading: true,
        }),
      ]);
    });
    expect(mockRunPortfolioBalanceChartViewModelQuery).not.toHaveBeenCalled();
  });

  it('does not force cached PnL rows back into populate skeletons when AllAssets mounts', async () => {
    const btcWallet = makeVisibleWallet('btc-wallet', 'btc', 200);
    const ethWallet = makeVisibleWallet('eth-wallet', 'eth', 100);
    const btcStored = makeStoredWallet('btc-wallet', 'btc');
    const ethStored = makeStoredWallet('eth-wallet', 'eth');
    const scope = makeScope({
      visibleWallets: [btcWallet, ethWallet],
      storedWallets: [btcStored, ethStored],
      currentRatesByAssetId: {
        'btc:btc': 200,
        'eth:eth': 100,
      },
    });
    const allHistoricalRateCache = buildReadyHistoricalRateCache(
      getBalanceChartHistoricalRateCacheKeys({
        wallets: scope.storedWallets,
        quoteCurrency: scope.quoteCurrency,
        timeframes: ['1D'],
      }),
    );
    const seedCachedSummary = (args: {
      storedWallet: any;
      walletId: string;
      pnlFiat: number;
      pnlPercent: number;
    }) => {
      const assetId = `${args.storedWallet.summary.currencyAbbreviation}:${args.storedWallet.summary.chain}`;
      const queryArgs = {
        wallets: [args.storedWallet],
        quoteCurrency: scope.quoteCurrency,
        timeframe: '1D',
        currentRatesByAssetId: {
          [assetId]: scope.currentRatesByAssetId[assetId],
        },
        dataRevisionSig: `committed-1|${[
          args.storedWallet.summary.walletId,
          args.storedWallet.summary.chain,
          args.storedWallet.summary.currencyAbbreviation,
          '',
          args.storedWallet.summary.balanceAtomic,
        ].join(':')}`,
        walletIds: [args.walletId],
        balanceOffset: 0,
        asOfMs: scope.asOfMs,
        summaryCacheRevisionSig: getTestSummaryCacheRevisionSig({
          storedWallets: [args.storedWallet],
          quoteCurrency: scope.quoteCurrency,
          timeframe: '1D',
          fiatRateSeriesCache: allHistoricalRateCache,
        }),
      };
      const identity = buildAssetPnlSummaryIdentityFromViewModelQuery(
        queryArgs as any,
      );
      seedAssetPnlSummaryCache({
        identity: identity!,
        viewModel: makeViewModel({
          queryArgs,
          pnlFiat: args.pnlFiat,
          pnlPercent: args.pnlPercent,
        }),
      });
    };
    seedCachedSummary({
      storedWallet: btcStored,
      walletId: 'btc-wallet',
      pnlFiat: 8.25,
      pnlPercent: 2.5,
    });
    seedCachedSummary({
      storedWallet: ethStored,
      walletId: 'eth-wallet',
      pnlFiat: 3.5,
      pnlPercent: 1.75,
    });
    mockState.PORTFOLIO.populateStatus = {
      inProgress: true,
      startedAt: 11,
      errors: [],
      walletStatusById: {
        'btc-wallet': 'in_progress',
        'eth-wallet': 'in_progress',
      },
    };
    mockGetVisibleWalletsFromKeys.mockReturnValue([btcWallet, ethWallet]);
    mockUseStoredWalletScope.mockReturnValue(scope);

    render(<HookHarness />);

    await waitFor(() => {
      expect(latestResult?.isPopulateLoadingByKey).toEqual({
        btc: false,
        eth: false,
      });
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          deltaFiat: '+$8.25',
          deltaPercent: '+2.50%',
          showScopedPnlLoading: false,
        }),
        expect.objectContaining({
          key: 'eth',
          deltaFiat: '+$3.50',
          deltaPercent: '+1.75%',
          showScopedPnlLoading: false,
        }),
      ]);
    });
    expect(mockRunPortfolioBalanceChartViewModelQuery).not.toHaveBeenCalled();
  });

  it('does not reuse a global BTC summary for KeyOverview AllAssets with different wallet ids', async () => {
    const globalScope = makeScope({
      visibleWallets: [makeVisibleWallet('btc-global', 'btc', 100)],
      storedWallets: [makeStoredWallet('btc-global', 'btc')],
    });
    const globalQueryArgs = {
      wallets: globalScope.storedWallets,
      quoteCurrency: globalScope.quoteCurrency,
      timeframe: '1D',
      currentRatesByAssetId: globalScope.currentRatesByAssetId,
      dataRevisionSig: `committed-1|${globalScope.storedWalletRequestSig}`,
      walletIds: ['btc-global'],
      balanceOffset: 0,
      asOfMs: globalScope.asOfMs,
      summaryCacheRevisionSig: getTestSummaryCacheRevisionSig({
        storedWallets: globalScope.storedWallets,
        quoteCurrency: globalScope.quoteCurrency,
        timeframe: '1D',
      }),
    };
    const globalIdentity = buildAssetPnlSummaryIdentityFromViewModelQuery(
      globalQueryArgs as any,
    );
    seedAssetPnlSummaryCache({
      identity: globalIdentity!,
      viewModel: makeViewModel({
        queryArgs: globalQueryArgs,
        pnlFiat: 9,
        pnlPercent: 9,
      }),
    });

    const keyScope = makeScope({
      visibleWallets: [makeVisibleWallet('btc-key', 'btc', 50)],
      storedWallets: [makeStoredWallet('btc-key', 'btc')],
    });
    mockGetVisibleWalletsFromKeys.mockReturnValue([
      makeVisibleWallet('btc-key', 'btc', 50),
    ]);
    mockUseStoredWalletScope.mockReturnValue(keyScope);
    mockRunPortfolioBalanceChartViewModelQuery.mockImplementation(
      () => new Promise(() => undefined),
    );

    render(<HookHarness keyId="key-1" />);

    await waitFor(() => {
      expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          walletIds: ['btc-key'],
        }),
      );
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          hasPnl: false,
        }),
      ]);
    });
  });

  it('reveals rows progressively during populate as each asset summary becomes ready', async () => {
    const dogeWallet = makeVisibleWallet('doge-wallet', 'doge', 500);
    const btcWallet = makeVisibleWallet('btc-wallet', 'btc', 100);
    const dogeStored = makeStoredWallet('doge-wallet', 'doge');
    const btcStored = makeStoredWallet('btc-wallet', 'btc');
    mockState.PORTFOLIO.populateStatus = {
      inProgress: true,
      startedAt: 11,
      errors: [],
      walletStatusById: {
        'doge-wallet': 'done',
        'btc-wallet': 'in_progress',
      },
    };
    mockGetVisibleWalletsFromKeys.mockReturnValue([dogeWallet, btcWallet]);
    mockUseStoredWalletScope.mockReturnValue(
      makeScope({
        visibleWallets: [dogeWallet, btcWallet],
        storedWallets: [dogeStored, btcStored],
        currentRatesByAssetId: {
          'doge:doge': 0.25,
          'btc:btc': 100,
        },
      }),
    );

    render(<HookHarness />);

    await waitFor(() => {
      expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(
        1,
      );
      expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          walletIds: ['doge-wallet'],
        }),
      );
    });

    await waitFor(() => {
      expect(latestResult?.isPopulateLoadingByKey).toEqual({
        doge: false,
        btc: true,
      });
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'doge',
          hasPnl: true,
          showScopedPnlLoading: false,
        }),
        expect.objectContaining({
          key: 'btc',
          hasPnl: false,
          showScopedPnlLoading: true,
        }),
      ]);
    });
  });

  it('rejects a stale summary result for an old rate/timeframe key', async () => {
    const resolvers: Array<(value: any) => void> = [];
    let currentScope = makeScope({
      currentRatesByAssetId: {'btc:btc': 100},
      asOfMs: 1000,
    });
    mockUseStoredWalletScope.mockImplementation(() => currentScope);
    mockRunPortfolioBalanceChartViewModelQuery.mockImplementation(
      (queryArgs: any) =>
        new Promise(resolve => {
          resolvers.push(value => resolve(value));
          void queryArgs;
        }) as any,
    );

    const view = render(<HookHarness gainLossMode="1D" />);

    await waitFor(() => {
      expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(
        1,
      );
    });

    const firstQueryArgs =
      mockRunPortfolioBalanceChartViewModelQuery.mock.calls[0][0];
    currentScope = makeScope({
      currentRatesByAssetId: {'btc:btc': 200},
      asOfMs: 2000,
    });
    view.rerender(<HookHarness gainLossMode="1D" />);

    await waitFor(() => {
      expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(
        2,
      );
    });

    await act(async () => {
      resolvers[0](
        makeViewModel({
          queryArgs: firstQueryArgs,
          pnlFiat: 99,
          pnlPercent: 99,
        }),
      );
    });

    await waitFor(() => {
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          hasPnl: false,
          showScopedPnlLoading: true,
        }),
      ]);
    });

    const secondQueryArgs =
      mockRunPortfolioBalanceChartViewModelQuery.mock.calls[1][0];
    await act(async () => {
      resolvers[1](
        makeViewModel({
          queryArgs: secondQueryArgs,
          pnlFiat: 7.77,
          pnlPercent: 3.21,
        }),
      );
    });

    await waitFor(() => {
      expect(latestResult?.visibleItems).toEqual([
        expect.objectContaining({
          key: 'btc',
          deltaFiat: '+$7.77',
          deltaPercent: '+3.21%',
          showScopedPnlLoading: false,
        }),
      ]);
    });
  });
});

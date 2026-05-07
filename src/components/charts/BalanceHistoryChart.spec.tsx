import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import BalanceHistoryChart from './BalanceHistoryChart';
import {useAppDispatch, useAppSelector} from '../../utils/hooks';
import {usePortfolioBalanceChartScope} from '../../portfolio/ui/hooks/usePortfolioBalanceChartScope';
import usePortfolioHistoricalRateDepsCache from '../../portfolio/ui/hooks/usePortfolioHistoricalRateDepsCache';
import {runPortfolioBalanceChartViewModelQuery} from '../../portfolio/ui/common';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return {promise, resolve};
}

let latestInteractiveLineChartProps: any;
let latestTimeframeSelectorProps: any;
let mockHistoricalRatesReady = true;
let mockHistoricalRateCacheLoading: boolean | undefined;
let mockHistoricalRateRequests: any[] = [];
let mockHistoricalRateCacheKeys: any[] = [];
let mockScheduleImmediately = true;
let mockScheduledChartQueryRuns: Array<() => Promise<void>> = [];
const mockReadyHistoricalRateCache = {
  ready: {
    points: [],
  },
};
const mockPendingHistoricalRateCache = {};

const mockOneDayPoint = {date: new Date(1_000), value: 100};
const mockOneWeekPoint = {date: new Date(2_000), value: 150};
const mockUpdatedOneDayPoint = {date: new Date(3_000), value: 115};

const mockOneDaySeries = {
  graphPoints: [mockOneDayPoint],
  analysisPoints: [
    {
      timestamp: mockOneDayPoint.date.getTime(),
      totalFiatBalance: 100,
      totalPnlChange: 10,
      totalPnlPercent: 10,
    },
  ],
  pointByTimestamp: new Map([
    [
      mockOneDayPoint.date.getTime(),
      {
        timestamp: mockOneDayPoint.date.getTime(),
        totalFiatBalance: 100,
        totalPnlChange: 10,
        totalPnlPercent: 10,
      },
    ],
  ]),
  maxPoint: mockOneDayPoint,
  minPoint: mockOneDayPoint,
  maxIndex: 0,
  minIndex: 0,
};

const mockOneWeekSeries = {
  graphPoints: [mockOneWeekPoint],
  analysisPoints: [
    {
      timestamp: mockOneWeekPoint.date.getTime(),
      totalFiatBalance: 150,
      totalPnlChange: 20,
      totalPnlPercent: 15,
      totalCryptoBalanceFormatted: '1.5',
    },
  ],
  pointByTimestamp: new Map([
    [
      mockOneWeekPoint.date.getTime(),
      {
        timestamp: mockOneWeekPoint.date.getTime(),
        totalFiatBalance: 150,
        totalPnlChange: 20,
        totalPnlPercent: 15,
        totalCryptoBalanceFormatted: '1.5',
      },
    ],
  ]),
  maxPoint: mockOneWeekPoint,
  minPoint: mockOneWeekPoint,
  maxIndex: 0,
  minIndex: 0,
};

const mockUpdatedOneDaySeries = {
  graphPoints: [mockUpdatedOneDayPoint],
  analysisPoints: [
    {
      timestamp: mockUpdatedOneDayPoint.date.getTime(),
      totalFiatBalance: 115,
      totalPnlChange: 15,
      totalPnlPercent: 12,
    },
  ],
  pointByTimestamp: new Map([
    [
      mockUpdatedOneDayPoint.date.getTime(),
      {
        timestamp: mockUpdatedOneDayPoint.date.getTime(),
        totalFiatBalance: 115,
        totalPnlChange: 15,
        totalPnlPercent: 12,
      },
    ],
  ]),
  maxPoint: mockUpdatedOneDayPoint,
  minPoint: mockUpdatedOneDayPoint,
  maxIndex: 0,
  minIndex: 0,
};

const buildEquivalentSeries = <T extends typeof mockOneDaySeries>(
  series: T,
): T => {
  const graphPoints = series.graphPoints.map(point => ({
    date: new Date(point.date.getTime()),
    value: point.value,
  }));
  const analysisPoints = series.analysisPoints.map(point => ({...point}));

  return {
    ...series,
    graphPoints,
    analysisPoints,
    pointByTimestamp: new Map(
      analysisPoints.map(point => [point.timestamp, point]),
    ),
    maxPoint: graphPoints[series.maxIndex],
    minPoint: graphPoints[series.minIndex],
  } as T;
};

const mockEquivalentOneDaySeries = buildEquivalentSeries(mockOneDaySeries);
const mockEquivalentUpdatedOneDaySeries = buildEquivalentSeries(
  mockUpdatedOneDaySeries,
);

jest.mock('react-native-reanimated', () => {
  const ReactLib = require('react');
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ({children, ...props}: any) =>
        ReactLib.createElement(View, props, children),
    },
    useAnimatedStyle: () => ({}),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value: string) => value,
  }),
}));

jest.mock('styled-components/native', () => ({
  useTheme: () => ({
    dark: false,
    colors: {
      text: 'black',
    },
  }),
}));

jest.mock('../../utils/hooks', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('./InteractiveLineChart', () => {
  return (props: any) => {
    latestInteractiveLineChartProps = props;
    return null;
  };
});

jest.mock('./TimeframeSelector', () => {
  return (props: any) => {
    latestTimeframeSelectorProps = props;
    return null;
  };
});

jest.mock('./ChartSelectionDot', () => () => null);
jest.mock('./ChartChangeRow', () => () => null);

jest.mock('./useStableBalanceHistoryChartAxisLabels', () => ({
  useStableBalanceHistoryChartAxisLabels: () => ({
    MaxAxisLabel: () => null,
    MinAxisLabel: () => null,
  }),
}));

jest.mock('../../utils/errors/formatUnknownError', () => ({
  formatUnknownError: (err: unknown) => String(err),
}));

jest.mock('../haptic-feedback/haptic', () => jest.fn());

jest.mock('../../portfolio/ui/hooks/usePortfolioBalanceChartScope', () => ({
  usePortfolioBalanceChartScope: jest.fn(),
}));

jest.mock('../../portfolio/ui/hooks/usePortfolioHistoricalRateDepsCache', () =>
  jest.fn(),
);

jest.mock('../../portfolio/ui/common', () => ({
  runPortfolioBalanceChartViewModelQuery: jest.fn(),
}));

jest.mock('../../utils/scheduleAfterInteractionsAndFrames', () => ({
  scheduleAfterInteractionsAndFrames: jest.fn(
    ({callback}: {callback: (signal: AbortSignal) => void | Promise<void>}) => {
      const controller = new AbortController();
      const run = () =>
        controller.signal.aborted
          ? Promise.resolve()
          : Promise.resolve(callback(controller.signal));

      if (mockScheduleImmediately) {
        void run();
      } else {
        mockScheduledChartQueryRuns.push(run);
      }

      return {
        cancel: () => controller.abort(),
        done: Promise.resolve(),
        signal: controller.signal,
      };
    },
  ),
}));

jest.mock('../../utils/portfolio/chartCache', () => ({
  BALANCE_HISTORY_CHART_SCOPE_IDENTITY_KEY: 'balance_history_chart:89',
}));

jest.mock('../../utils/portfolio/balanceChartData', () => ({
  areBalanceChartHistoricalRatesReady: jest.fn(() => mockHistoricalRatesReady),
  buildBalanceChartHistoricalRateRequests: jest.fn(
    () => mockHistoricalRateRequests,
  ),
  buildHydratedSeriesFromBalanceChartViewModel: jest.fn(
    (viewModel: {__series: any}) => {
      return viewModel.__series;
    },
  ),
  getBalanceChartHistoricalRateCacheKeys: jest.fn(
    () => mockHistoricalRateCacheKeys,
  ),
  getBalanceChartHistoricalRateCacheRevision: jest.fn(() => 'hist-rev'),
}));

jest.mock('./balanceHistoryChartSelection', () => ({
  buildBalanceHistoryChartChangeRowData: jest.fn(
    ({
      displayedAnalysisPoint,
      label,
    }: {
      displayedAnalysisPoint?: {
        totalPnlChange?: number;
        totalPnlPercent?: number;
      };
      label?: string;
    }) =>
      displayedAnalysisPoint
        ? {
            percent: displayedAnalysisPoint.totalPnlPercent ?? 0,
            deltaFiatFormatted: String(
              displayedAnalysisPoint.totalPnlChange ?? 0,
            ),
            rangeLabel: label,
          }
        : undefined,
  ),
  getDisplayedBalanceHistoryAnalysisPoint: jest.fn(
    ({activeSeries}: {activeSeries?: {analysisPoints?: any[]}}) =>
      activeSeries?.analysisPoints?.[activeSeries.analysisPoints.length - 1],
  ),
  getSelectedBalanceHistoryValue: jest.fn(
    ({point}: {point: {value: number}}) => point.value,
  ),
}));

jest.mock('./fiatTimeframes', () => ({
  DEFAULT_BALANCE_CHART_TIMEFRAME: '1D',
  getFiatChartTimeframeOptions: jest.fn(() => [
    {value: '1D', label: '1D'},
    {value: '1W', label: '1W'},
  ]),
  getRangeLabelForFiatTimeframe: jest.fn(
    (_t: unknown, timeframe: string) => timeframe,
  ),
  formatRangeOrSelectedPointLabel: jest.fn(
    ({rangeLabel}: {rangeLabel?: string}) => rangeLabel,
  ),
}));

const mockUseAppDispatch = useAppDispatch as jest.Mock;
const mockUseAppSelector = useAppSelector as jest.Mock;
const mockUsePortfolioBalanceChartScope =
  usePortfolioBalanceChartScope as jest.Mock;
const mockUsePortfolioHistoricalRateDepsCache =
  usePortfolioHistoricalRateDepsCache as jest.Mock;
const mockRunPortfolioBalanceChartViewModelQuery =
  runPortfolioBalanceChartViewModelQuery as jest.Mock;
let mockDispatch: jest.Mock;

describe('BalanceHistoryChart', () => {
  beforeEach(() => {
    jest.useRealTimers();
    latestInteractiveLineChartProps = undefined;
    latestTimeframeSelectorProps = undefined;
    mockHistoricalRatesReady = true;
    mockHistoricalRateCacheLoading = undefined;
    mockHistoricalRateRequests = [];
    mockHistoricalRateCacheKeys = [];
    mockScheduleImmediately = true;
    mockScheduledChartQueryRuns = [];
    mockUseAppDispatch.mockReset();
    mockDispatch = jest.fn();
    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseAppSelector.mockReset();
    mockUseAppSelector.mockImplementation(selector =>
      selector({
        PORTFOLIO: {
          populateStatus: {
            inProgress: false,
          },
        },
      }),
    );
    mockUsePortfolioHistoricalRateDepsCache.mockReset();
    mockUsePortfolioHistoricalRateDepsCache.mockImplementation(() => {
      const loading =
        mockHistoricalRateCacheLoading ?? !mockHistoricalRatesReady;
      const hasRequests = mockHistoricalRateRequests.some(
        group => group.requests.length > 0,
      );

      return {
        cache: mockHistoricalRatesReady
          ? mockReadyHistoricalRateCache
          : mockPendingHistoricalRateCache,
        depKeys: mockHistoricalRateCacheKeys,
        error: undefined,
        hasRequests,
        loading,
        ready: mockHistoricalRatesReady,
        requestGroups: mockHistoricalRateRequests,
        revision: 'hist-rev',
        shouldWaitForReady: hasRequests && !mockHistoricalRatesReady && loading,
      };
    });
    mockUsePortfolioBalanceChartScope.mockReset();
    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1234,
      chartDataRevisionSig: 'chart-rev',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev',
      quoteCurrency: 'USD',
      scopeId: 'scope-1',
      sortedWalletIds: ['wallet-1'],
      storedWalletRequestSig: 'wallet-req',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-1',
          },
        },
      ],
    });
    mockRunPortfolioBalanceChartViewModelQuery.mockReset();
    mockRunPortfolioBalanceChartViewModelQuery.mockResolvedValue({
      __series: mockOneDaySeries,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the animated graph renderer on the initial render', async () => {
    await act(async () => {
      TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps.animated).toBe(true);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
  });

  it('defers the initial chart query until after the first visible render window', async () => {
    mockScheduleImmediately = false;

    await act(async () => {
      TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).not.toHaveBeenCalled();
    expect(latestInteractiveLineChartProps.points).toEqual([]);
    expect(latestInteractiveLineChartProps.isLoading).toBe(true);

    await act(async () => {
      await mockScheduledChartQueryRuns.shift()?.();
      await Promise.resolve();
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(1);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
  });

  it('commits a runtime series without dispatching chart state updates', async () => {
    await act(async () => {
      TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(1);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('renders a runtime series for default no-loader callers', async () => {
    await act(async () => {
      TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
        />,
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(1);
    expect(latestInteractiveLineChartProps).toBeDefined();
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
  });

  it('avoids flashing the loader when an uncached timeframe switch resolves before the pending overlay delay', async () => {
    jest.useFakeTimers();
    const deferred = createDeferred<{__series: typeof mockOneWeekSeries}>();
    mockRunPortfolioBalanceChartViewModelQuery
      .mockResolvedValueOnce({__series: mockOneDaySeries})
      .mockReturnValue(deferred.promise);

    await act(async () => {
      TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);

    await act(async () => {
      latestTimeframeSelectorProps.onSelect('1W');
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(2);
    expect(latestInteractiveLineChartProps.animated).toBe(true);
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    await act(async () => {
      jest.advanceTimersByTime(100);
      deferred.resolve({__series: mockOneWeekSeries});
      await deferred.promise;
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.animated).toBe(true);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneWeekSeries.graphPoints,
    );
  });

  it('shows the delayed loader over the previous series during a slow uncached timeframe switch', async () => {
    jest.useFakeTimers();
    const deferred = createDeferred<{__series: typeof mockOneWeekSeries}>();
    mockRunPortfolioBalanceChartViewModelQuery
      .mockResolvedValueOnce({__series: mockOneDaySeries})
      .mockReturnValue(deferred.promise);

    await act(async () => {
      TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    await act(async () => {
      latestTimeframeSelectorProps.onSelect('1W');
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    await act(async () => {
      jest.advanceTimersByTime(119);
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(true);
    expect(latestInteractiveLineChartProps.animated).toBe(true);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    await act(async () => {
      deferred.resolve({__series: mockOneWeekSeries});
      await deferred.promise;
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneWeekSeries.graphPoints,
    );
  });

  it('keeps the previous series visible and shows the delayed loader while a pending historical timeframe hydrates', async () => {
    jest.useFakeTimers();
    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1234,
      chartDataRevisionSig: 'chart-rev',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev',
      quoteCurrency: 'USD',
      scopeId: 'scope-1',
      sortedWalletIds: ['wallet-1'],
      storedWalletRequestSig: 'wallet-req',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-1',
          },
        },
      ],
    });

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    mockHistoricalRatesReady = false;
    mockHistoricalRateRequests = [
      {
        quoteCurrency: 'USD',
        requests: [{coin: 'btc', intervals: ['1W']}],
      },
    ];
    mockHistoricalRateCacheKeys = ['USD:BTC:1W'];

    await act(async () => {
      latestTimeframeSelectorProps.onSelect('1W');
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(1);
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    await act(async () => {
      jest.advanceTimersByTime(119);
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(true);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    mockHistoricalRatesReady = true;
    mockRunPortfolioBalanceChartViewModelQuery.mockResolvedValueOnce({
      __series: mockOneWeekSeries,
    });

    await act(async () => {
      renderer.update(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneWeekSeries.graphPoints,
    );
  });

  it('does not rerun or flash the loader for a ready ALL-backed timeframe when rate loading pulses', async () => {
    jest.useFakeTimers();
    mockRunPortfolioBalanceChartViewModelQuery
      .mockResolvedValueOnce({__series: mockOneDaySeries})
      .mockResolvedValueOnce({__series: mockOneWeekSeries});
    mockHistoricalRateRequests = [
      {
        quoteCurrency: 'USD',
        requests: [{coin: 'btc', intervals: ['3M']}],
      },
    ];
    mockHistoricalRateCacheKeys = ['USD:btc:ALL'];

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    await act(async () => {
      latestTimeframeSelectorProps.onSelect('3M');
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(2);
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneWeekSeries.graphPoints,
    );

    mockHistoricalRateCacheLoading = true;
    await act(async () => {
      renderer.update(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    await act(async () => {
      jest.advanceTimersByTime(120);
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(2);
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneWeekSeries.graphPoints,
    );

    mockHistoricalRateCacheLoading = false;
    await act(async () => {
      renderer.update(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(2);
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
  });

  it('keeps the current same-quote timeframe series visible while a new query revision hydrates', async () => {
    jest.useFakeTimers();
    const deferred = createDeferred<{
      __series: typeof mockUpdatedOneDaySeries;
    }>();
    mockRunPortfolioBalanceChartViewModelQuery
      .mockResolvedValueOnce({__series: mockOneDaySeries})
      .mockReturnValue(deferred.promise);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);

    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1235,
      chartDataRevisionSig: 'chart-rev-2',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev-2',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev-2',
      quoteCurrency: 'USD',
      scopeId: 'scope-1',
      sortedWalletIds: ['wallet-1'],
      storedWalletRequestSig: 'wallet-req',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-1',
          },
        },
      ],
    });

    await act(async () => {
      renderer.update(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(2);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(120);
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(true);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    await act(async () => {
      deferred.resolve({__series: mockUpdatedOneDaySeries});
      await deferred.promise;
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockUpdatedOneDaySeries.graphPoints,
    );
  });

  it('does not keep the previous series visible across a quote change while the new quote hydrates', async () => {
    const deferred = createDeferred<{__series: typeof mockOneWeekSeries}>();
    mockRunPortfolioBalanceChartViewModelQuery
      .mockResolvedValueOnce({__series: mockOneDaySeries})
      .mockReturnValue(deferred.promise);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1235,
      chartDataRevisionSig: 'chart-rev-eur',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev-eur',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev-eur',
      quoteCurrency: 'EUR',
      scopeId: 'scope-1',
      sortedWalletIds: ['wallet-1'],
      storedWalletRequestSig: 'wallet-req',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-1',
          },
        },
      ],
    });

    await act(async () => {
      renderer.update(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="EUR"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(2);
    expect(latestInteractiveLineChartProps.isLoading).toBe(true);
    expect(latestInteractiveLineChartProps.points).toEqual([]);

    await act(async () => {
      deferred.resolve({__series: mockOneWeekSeries});
      await deferred.promise;
    });
  });

  it('does not keep the previous series visible across a scope change while the new scope hydrates', async () => {
    const deferred = createDeferred<{__series: typeof mockOneWeekSeries}>();
    mockRunPortfolioBalanceChartViewModelQuery
      .mockResolvedValueOnce({__series: mockOneDaySeries})
      .mockReturnValue(deferred.promise);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1235,
      chartDataRevisionSig: 'chart-rev-wallet-2',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev-wallet-2',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev-wallet-2',
      quoteCurrency: 'USD',
      scopeId: 'scope-2',
      sortedWalletIds: ['wallet-2'],
      storedWalletRequestSig: 'wallet-req-2',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-2',
          },
        },
      ],
    });

    await act(async () => {
      renderer.update(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-2',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(2);
    expect(latestInteractiveLineChartProps.isLoading).toBe(true);
    expect(latestInteractiveLineChartProps.points).toEqual([]);

    await act(async () => {
      deferred.resolve({__series: mockOneWeekSeries});
      await deferred.promise;
    });
  });

  it('updates points, change row, and displayed balance from a completed view model', async () => {
    const deferred = createDeferred<{__series: typeof mockOneWeekSeries}>();
    const onChangeRowData = jest.fn();
    const onDisplayedAnalysisPointChange = jest.fn();
    mockRunPortfolioBalanceChartViewModelQuery.mockReturnValue(
      deferred.promise,
    );
    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1234,
      chartDataRevisionSig: 'chart-rev',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev',
      quoteCurrency: 'USD',
      scopeId: 'scope-1',
      sortedWalletIds: ['wallet-1'],
      storedWalletRequestSig: 'wallet-req',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-1',
          },
        },
      ],
    });

    await act(async () => {
      TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          initialSelectedTimeframe="1W"
          onChangeRowData={onChangeRowData}
          onDisplayedAnalysisPointChange={onDisplayedAnalysisPointChange}
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps.points).toEqual([]);

    await act(async () => {
      deferred.resolve({__series: mockOneWeekSeries});
      await deferred.promise;
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneWeekSeries.graphPoints,
    );
    expect(onDisplayedAnalysisPointChange).toHaveBeenLastCalledWith({
      timestamp: mockOneWeekPoint.date.getTime(),
      totalFiatBalance: 150,
      totalPnlChange: 20,
      totalPnlPercent: 15,
      totalCryptoBalanceFormatted: '1.5',
    });
    expect(onChangeRowData).toHaveBeenLastCalledWith({
      percent: 15,
      deltaFiatFormatted: '20',
      rangeLabel: '1W',
    });
  });

  it('preserves graph points reference after a runtime refresh with equivalent points', async () => {
    const deferred = createDeferred<{
      __series: typeof mockUpdatedOneDaySeries;
    }>();
    mockRunPortfolioBalanceChartViewModelQuery.mockReturnValue(
      deferred.promise,
    );
    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1234,
      chartDataRevisionSig: 'chart-rev',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev',
      quoteCurrency: 'USD',
      scopeId: 'scope-1',
      sortedWalletIds: ['wallet-1'],
      storedWalletRequestSig: 'wallet-req',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-1',
          },
        },
      ],
    });

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    await act(async () => {
      deferred.resolve({__series: mockUpdatedOneDaySeries});
      await deferred.promise;
    });

    const runtimeGraphPoints = latestInteractiveLineChartProps.points;
    expect(runtimeGraphPoints).toBe(mockUpdatedOneDaySeries.graphPoints);
    expect(mockDispatch).not.toHaveBeenCalled();

    mockRunPortfolioBalanceChartViewModelQuery.mockResolvedValueOnce({
      __series: mockEquivalentUpdatedOneDaySeries,
    });
    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1234,
      chartDataRevisionSig: 'chart-rev',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev',
      quoteCurrency: 'USD',
      scopeId: 'scope-1',
      sortedWalletIds: ['wallet-1'],
      storedWalletRequestSig: 'wallet-req',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-1',
          },
        },
      ],
    });

    await act(async () => {
      renderer.update(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(runtimeGraphPoints);
  });

  it('preserves the graph points reference for equivalent runtime candidates', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    const initialGraphPoints = latestInteractiveLineChartProps.points;

    mockRunPortfolioBalanceChartViewModelQuery.mockResolvedValueOnce({
      __series: mockEquivalentOneDaySeries,
    });
    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1235,
      chartDataRevisionSig: 'chart-rev-2',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev-2',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev-2',
      quoteCurrency: 'USD',
      scopeId: 'scope-1',
      sortedWalletIds: ['wallet-1'],
      storedWalletRequestSig: 'wallet-req',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-1',
          },
        },
      ],
    });

    await act(async () => {
      renderer.update(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(initialGraphPoints);
  });

  it('clears selection and reports timeframe changes from the display model', async () => {
    const onSelectedBalanceChange = jest.fn();
    const onSelectedTimeframeChange = jest.fn();
    const onSelectionActiveChange = jest.fn();
    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1234,
      chartDataRevisionSig: 'chart-rev',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev',
      quoteCurrency: 'USD',
      scopeId: 'scope-1',
      sortedWalletIds: ['wallet-1'],
      storedWalletRequestSig: 'wallet-req',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-1',
          },
        },
      ],
    });

    await act(async () => {
      TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          onSelectedBalanceChange={onSelectedBalanceChange}
          onSelectedTimeframeChange={onSelectedTimeframeChange}
          onSelectionActiveChange={onSelectionActiveChange}
          showLoaderWhenNoSnapshots
        />,
      );
    });

    await act(async () => {
      latestInteractiveLineChartProps.onGestureStart();
      latestInteractiveLineChartProps.onPointSelected(mockOneDayPoint);
    });

    expect(onSelectedBalanceChange).toHaveBeenLastCalledWith(
      mockOneDayPoint.value,
    );
    expect(onSelectionActiveChange).toHaveBeenLastCalledWith(true);

    await act(async () => {
      latestTimeframeSelectorProps.onSelect('1W');
    });

    expect(onSelectedTimeframeChange).toHaveBeenCalledWith('1W');
    expect(onSelectedBalanceChange).toHaveBeenLastCalledWith(undefined);
    expect(onSelectionActiveChange).toHaveBeenCalledWith(false);
  });

  it('keeps the chart shell mounted with a loader when wallets exist but no series is ready', async () => {
    const deferred = createDeferred<{
      __series: typeof mockUpdatedOneDaySeries;
    }>();
    mockRunPortfolioBalanceChartViewModelQuery.mockReturnValue(
      deferred.promise,
    );
    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1234,
      chartDataRevisionSig: 'chart-rev',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev',
      quoteCurrency: 'USD',
      scopeId: 'scope-1',
      sortedWalletIds: ['wallet-1'],
      storedWalletRequestSig: 'wallet-req',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-1',
          },
        },
      ],
    });

    await act(async () => {
      TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps).toBeDefined();
    expect(latestInteractiveLineChartProps.points).toEqual([]);
    expect(latestInteractiveLineChartProps.isLoading).toBe(true);
    expect(latestInteractiveLineChartProps.hideLineWhileLoading).toBe(true);
  });

  it('displays view models started during populate', async () => {
    mockUseAppSelector.mockImplementation(selector =>
      selector({
        PORTFOLIO: {
          populateStatus: {
            inProgress: true,
          },
        },
      }),
    );
    mockUsePortfolioBalanceChartScope.mockReturnValue({
      asOfMs: 1234,
      chartDataRevisionSig: 'chart-rev',
      currentRatesByAssetId: {},
      currentRatesSignature: 'rates-rev',
      currentSpotRatesByRateKey: {},
      currentSpotRatesSignature: 'spot-rev',
      quoteCurrency: 'USD',
      scopeId: 'scope-1',
      sortedWalletIds: ['wallet-1'],
      storedWalletRequestSig: 'wallet-req',
      storedWallets: [
        {
          summary: {
            walletId: 'wallet-1',
          },
        },
      ],
    });
    mockRunPortfolioBalanceChartViewModelQuery.mockResolvedValue({
      __series: mockUpdatedOneDaySeries,
    });

    await act(async () => {
      TestRenderer.create(
        <BalanceHistoryChart
          wallets={[
            {
              id: 'wallet-1',
            } as any,
          ]}
          quoteCurrency="USD"
          showLoaderWhenNoSnapshots
        />,
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockUpdatedOneDaySeries.graphPoints,
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

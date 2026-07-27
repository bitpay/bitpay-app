import React from 'react';
import {View} from 'react-native';
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
const mockOneDayEndPoint = {date: new Date(1_500), value: 110};
const mockOneWeekPoint = {date: new Date(2_000), value: 150};
const mockOneWeekEndPoint = {date: new Date(2_500), value: 155};
const mockUpdatedOneDayPoint = {date: new Date(3_000), value: 115};
const mockUpdatedOneDayEndPoint = {date: new Date(3_500), value: 125};
const mockZeroBalancePoint = {date: new Date(4_000), value: 0};
const mockZeroBalanceEndPoint = {date: new Date(4_500), value: 0};
const mockWallets = (id = 'wallet-1') => [{id} as any];
const balanceHistoryChart = (
  props: Partial<React.ComponentProps<typeof BalanceHistoryChart>> = {},
) => (
  <BalanceHistoryChart wallets={mockWallets()} quoteCurrency="USD" {...props} />
);
const mockChartScope = (overrides: Record<string, any> = {}) => ({
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
  ...overrides,
});

type MockSeriesPoint = {
  point: {date: Date; value: number};
  totalFiatBalance: number;
  totalPnlChange: number;
  totalPnlPercent: number;
  totalCryptoBalanceFormatted?: string;
};

const buildMockSeries = (points: MockSeriesPoint[]) => {
  const toAnalysisPoint = ({point, ...analysis}: MockSeriesPoint) => ({
    timestamp: point.date.getTime(),
    ...analysis,
  });
  const graphPoints = points.map(({point}) => point);
  const analysisPoints = points.map(toAnalysisPoint);

  return {
    graphPoints,
    analysisPoints,
    pointByTimestamp: new Map(
      analysisPoints.map(point => [point.timestamp, {...point}]),
    ),
    maxPoint: graphPoints[graphPoints.length - 1],
    minPoint: graphPoints[0],
    maxIndex: graphPoints.length - 1,
    minIndex: 0,
  };
};

const mockOneDaySeries = buildMockSeries([
  {
    point: mockOneDayPoint,
    totalFiatBalance: 100,
    totalPnlChange: 10,
    totalPnlPercent: 10,
  },
  {
    point: mockOneDayEndPoint,
    totalFiatBalance: 110,
    totalPnlChange: 12,
    totalPnlPercent: 11,
  },
]);

const mockOneWeekSeries = buildMockSeries([
  {
    point: mockOneWeekPoint,
    totalFiatBalance: 150,
    totalPnlChange: 20,
    totalPnlPercent: 15,
    totalCryptoBalanceFormatted: '1.5',
  },
  {
    point: mockOneWeekEndPoint,
    totalFiatBalance: 155,
    totalPnlChange: 25,
    totalPnlPercent: 16,
    totalCryptoBalanceFormatted: '1.55',
  },
]);

const mockUpdatedOneDaySeries = buildMockSeries([
  {
    point: mockUpdatedOneDayPoint,
    totalFiatBalance: 115,
    totalPnlChange: 15,
    totalPnlPercent: 12,
  },
  {
    point: mockUpdatedOneDayEndPoint,
    totalFiatBalance: 125,
    totalPnlChange: 18,
    totalPnlPercent: 14,
  },
]);

const mockZeroBalanceSeries = buildMockSeries([
  {
    point: mockZeroBalancePoint,
    totalFiatBalance: 0,
    totalPnlChange: 0,
    totalPnlPercent: 0,
  },
  {
    point: mockZeroBalanceEndPoint,
    totalFiatBalance: 0,
    totalPnlChange: 0,
    totalPnlPercent: 0,
  },
]);

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
    useAnimatedStyle: (factory: () => any) => factory(),
    useDerivedValue: (factory: () => number) => ({value: factory()}),
    withTiming: (value: number) => value,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value: string) => value,
  }),
}));

jest.mock('../../contexts', () => ({
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

const renderAxisLabelOpacity = (
  propName: 'TopAxisLabel' | 'BottomAxisLabel',
) => {
  const AxisLabel = latestInteractiveLineChartProps?.[propName];
  expect(AxisLabel).toBeDefined();

  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<AxisLabel width={300} />);
  });

  const style = renderer.root.findByType(View).props.style;
  const opacityStyle = Array.isArray(style)
    ? style.find(
        styleItem =>
          styleItem && typeof styleItem === 'object' && 'opacity' in styleItem,
      )
    : style;

  return opacityStyle?.opacity;
};

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
    mockUsePortfolioBalanceChartScope.mockReturnValue(mockChartScope());
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
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
      );
    });

    expect(latestInteractiveLineChartProps.animated).toBe(true);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
  });

  it('renders a synthetic zero series when requested for an empty history scope', async () => {
    await act(async () => {
      TestRenderer.create(
        balanceHistoryChart({renderZeroBalanceWhenNoSnapshots: true}),
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).not.toHaveBeenCalled();
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points.length).toBeGreaterThan(1);
    expect(
      latestInteractiveLineChartProps.points.every(
        (point: {value: number}) => point.value === 0,
      ),
    ).toBe(true);
  });

  it('keeps the loader up and skips chart queries until chart data is ready to query', async () => {
    await act(async () => {
      TestRenderer.create(
        balanceHistoryChart({
          showLoaderWhenNoSnapshots: true,
          isBalanceChartDataReadyToQuery: false,
        }),
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).not.toHaveBeenCalled();
    expect(latestInteractiveLineChartProps.isLoading).toBe(true);
    expect(latestInteractiveLineChartProps.points).toEqual([]);
  });

  it('hides an already visible series as soon as chart data is no longer ready to query', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    await act(async () => {
      renderer.update(
        balanceHistoryChart({
          showLoaderWhenNoSnapshots: true,
          isBalanceChartDataReadyToQuery: false,
        }),
      );
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(true);
    expect(latestInteractiveLineChartProps.points).toEqual([]);
    expect(latestInteractiveLineChartProps.hideLineWhileLoading).toBe(true);
  });

  it('preserves an already visible series while chart data is not ready when requested', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    const onSelectedBalanceChange = jest.fn();

    await act(async () => {
      renderer = TestRenderer.create(
        balanceHistoryChart({
          showLoaderWhenNoSnapshots: true,
          onSelectedBalanceChange,
        }),
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer.update(
        balanceHistoryChart({
          showLoaderWhenNoSnapshots: false,
          isBalanceChartDataReadyToQuery: false,
          preserveVisibleSeriesWhileNotReady: true,
          onSelectedBalanceChange,
        }),
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(1);
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
    expect(latestInteractiveLineChartProps.hideLineWhileLoading).toBe(false);
    expect(latestInteractiveLineChartProps.enablePanGesture).toBe(true);

    await act(async () => {
      latestInteractiveLineChartProps.onGestureStart();
      latestInteractiveLineChartProps.onPointSelected(mockOneDayPoint);
    });

    expect(onSelectedBalanceChange).toHaveBeenLastCalledWith(100);
  });

  it('defers a stale-preserved timeframe switch until chart data is ready', async () => {
    jest.useFakeTimers();
    mockRunPortfolioBalanceChartViewModelQuery
      .mockResolvedValueOnce({__series: mockOneDaySeries})
      .mockResolvedValueOnce({__series: mockOneWeekSeries});
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(1);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    await act(async () => {
      renderer.update(
        balanceHistoryChart({
          showLoaderWhenNoSnapshots: false,
          isBalanceChartDataReadyToQuery: false,
          preserveVisibleSeriesWhileNotReady: true,
        }),
      );
    });

    expect(latestInteractiveLineChartProps.enablePanGesture).toBe(true);

    await act(async () => {
      latestTimeframeSelectorProps.onSelect('1W');
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(1);
    expect(latestTimeframeSelectorProps.selected).toBe('1W');
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
    expect(latestInteractiveLineChartProps.enablePanGesture).toBe(false);
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(119);
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(latestInteractiveLineChartProps.isLoading).toBe(true);

    await act(async () => {
      renderer.update(
        balanceHistoryChart({
          showLoaderWhenNoSnapshots: true,
          isBalanceChartDataReadyToQuery: true,
        }),
      );
      await Promise.resolve();
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(2);
    expect(
      mockRunPortfolioBalanceChartViewModelQuery.mock.calls[1][0].timeframe,
    ).toBe('1W');
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneWeekSeries.graphPoints,
    );
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);
    expect(latestInteractiveLineChartProps.enablePanGesture).toBe(true);
  });

  it('fades out the axis labels for a zero balance interval', async () => {
    mockRunPortfolioBalanceChartViewModelQuery.mockResolvedValue({
      __series: mockZeroBalanceSeries,
    });

    await act(async () => {
      TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockZeroBalanceSeries.graphPoints,
    );
    expect(
      latestInteractiveLineChartProps.firstPointGuideLineOpacity.value,
    ).toBe(0);
    expect(renderAxisLabelOpacity('TopAxisLabel')).toBe(0);
    expect(renderAxisLabelOpacity('BottomAxisLabel')).toBe(0);
  });

  it('fades the axis labels back in when the visible interval is non-zero', async () => {
    mockRunPortfolioBalanceChartViewModelQuery
      .mockResolvedValueOnce({__series: mockZeroBalanceSeries})
      .mockResolvedValueOnce({__series: mockOneWeekSeries});

    await act(async () => {
      TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
      );
    });

    expect(renderAxisLabelOpacity('TopAxisLabel')).toBe(0);
    expect(renderAxisLabelOpacity('BottomAxisLabel')).toBe(0);
    expect(
      latestInteractiveLineChartProps.firstPointGuideLineOpacity.value,
    ).toBe(0);

    await act(async () => {
      latestTimeframeSelectorProps.onSelect('1W');
      await Promise.resolve();
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneWeekSeries.graphPoints,
    );
    expect(
      latestInteractiveLineChartProps.firstPointGuideLineOpacity.value,
    ).toBe(1);
    expect(renderAxisLabelOpacity('TopAxisLabel')).toBe(1);
    expect(renderAxisLabelOpacity('BottomAxisLabel')).toBe(1);
  });

  it('defers the initial chart query until after the first visible render window', async () => {
    mockScheduleImmediately = false;

    await act(async () => {
      TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
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

  it('pauses chart work while disabled and preserves the visible series', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
      );
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(1);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    const pendingQuery = createDeferred<{
      __series: typeof mockUpdatedOneDaySeries;
    }>();
    mockRunPortfolioBalanceChartViewModelQuery.mockReturnValue(
      pendingQuery.promise,
    );
    mockUsePortfolioBalanceChartScope.mockReturnValue(
      mockChartScope({chartDataRevisionSig: 'chart-rev-2'}),
    );

    await act(async () => {
      renderer.update(balanceHistoryChart({showLoaderWhenNoSnapshots: true}));
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(2);

    await act(async () => {
      renderer.update(
        balanceHistoryChart({
          enabled: false,
          showLoaderWhenNoSnapshots: true,
        }),
      );
    });

    expect(mockUsePortfolioBalanceChartScope).toHaveBeenLastCalledWith(
      expect.objectContaining({enabled: false}),
    );
    expect(mockUsePortfolioHistoricalRateDepsCache).toHaveBeenLastCalledWith(
      expect.objectContaining({enabled: false}),
    );

    await act(async () => {
      pendingQuery.resolve({__series: mockUpdatedOneDaySeries});
      await pendingQuery.promise;
    });

    expect(mockRunPortfolioBalanceChartViewModelQuery).toHaveBeenCalledTimes(2);
    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
  });

  it('commits a runtime series without dispatching chart state updates', async () => {
    await act(async () => {
      TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
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
      TestRenderer.create(balanceHistoryChart());
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
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
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
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
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

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
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
      renderer.update(balanceHistoryChart({showLoaderWhenNoSnapshots: true}));
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
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
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
      renderer.update(balanceHistoryChart({showLoaderWhenNoSnapshots: true}));
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
      renderer.update(balanceHistoryChart({showLoaderWhenNoSnapshots: true}));
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
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );
    expect(latestInteractiveLineChartProps.isLoading).toBe(false);

    mockUsePortfolioBalanceChartScope.mockReturnValue(
      mockChartScope({
        asOfMs: 1235,
        chartDataRevisionSig: 'chart-rev-2',
        currentRatesSignature: 'rates-rev-2',
        currentSpotRatesSignature: 'spot-rev-2',
      }),
    );

    await act(async () => {
      renderer.update(balanceHistoryChart({showLoaderWhenNoSnapshots: true}));
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
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    mockUsePortfolioBalanceChartScope.mockReturnValue(
      mockChartScope({
        asOfMs: 1235,
        chartDataRevisionSig: 'chart-rev-eur',
        currentRatesSignature: 'rates-rev-eur',
        currentSpotRatesSignature: 'spot-rev-eur',
        quoteCurrency: 'EUR',
      }),
    );

    await act(async () => {
      renderer.update(
        balanceHistoryChart({
          quoteCurrency: 'EUR',
          showLoaderWhenNoSnapshots: true,
        }),
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
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockOneDaySeries.graphPoints,
    );

    mockUsePortfolioBalanceChartScope.mockReturnValue(
      mockChartScope({
        asOfMs: 1235,
        chartDataRevisionSig: 'chart-rev-wallet-2',
        currentRatesSignature: 'rates-rev-wallet-2',
        currentSpotRatesSignature: 'spot-rev-wallet-2',
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
      }),
    );

    await act(async () => {
      renderer.update(
        balanceHistoryChart({
          wallets: mockWallets('wallet-2'),
          showLoaderWhenNoSnapshots: true,
        }),
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

    await act(async () => {
      TestRenderer.create(
        balanceHistoryChart({
          initialSelectedTimeframe: '1W',
          onChangeRowData,
          onDisplayedAnalysisPointChange,
          showLoaderWhenNoSnapshots: true,
        }),
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
      timestamp: mockOneWeekEndPoint.date.getTime(),
      totalFiatBalance: 155,
      totalPnlChange: 25,
      totalPnlPercent: 16,
      totalCryptoBalanceFormatted: '1.55',
    });
    expect(onChangeRowData).toHaveBeenLastCalledWith({
      percent: 16,
      deltaFiatFormatted: '25',
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

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
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
    mockUsePortfolioBalanceChartScope.mockReturnValue(mockChartScope());

    await act(async () => {
      renderer.update(balanceHistoryChart({showLoaderWhenNoSnapshots: true}));
    });

    expect(latestInteractiveLineChartProps.points).toBe(runtimeGraphPoints);
  });

  it('preserves the graph points reference for equivalent runtime candidates', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
      );
    });

    const initialGraphPoints = latestInteractiveLineChartProps.points;

    mockRunPortfolioBalanceChartViewModelQuery.mockResolvedValueOnce({
      __series: mockEquivalentOneDaySeries,
    });
    mockUsePortfolioBalanceChartScope.mockReturnValue(
      mockChartScope({
        asOfMs: 1235,
        chartDataRevisionSig: 'chart-rev-2',
        currentRatesSignature: 'rates-rev-2',
        currentSpotRatesSignature: 'spot-rev-2',
      }),
    );

    await act(async () => {
      renderer.update(balanceHistoryChart({showLoaderWhenNoSnapshots: true}));
    });

    expect(latestInteractiveLineChartProps.points).toBe(initialGraphPoints);
  });

  it('clears selection and reports timeframe changes from the display model', async () => {
    const onSelectedBalanceChange = jest.fn();
    const onSelectedTimeframeChange = jest.fn();
    const onSelectionActiveChange = jest.fn();

    await act(async () => {
      TestRenderer.create(
        balanceHistoryChart({
          onSelectedBalanceChange,
          onSelectedTimeframeChange,
          onSelectionActiveChange,
          showLoaderWhenNoSnapshots: true,
        }),
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

    await act(async () => {
      TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
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
    mockRunPortfolioBalanceChartViewModelQuery.mockResolvedValue({
      __series: mockUpdatedOneDaySeries,
    });

    await act(async () => {
      TestRenderer.create(
        balanceHistoryChart({showLoaderWhenNoSnapshots: true}),
      );
    });

    expect(latestInteractiveLineChartProps.points).toBe(
      mockUpdatedOneDaySeries.graphPoints,
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

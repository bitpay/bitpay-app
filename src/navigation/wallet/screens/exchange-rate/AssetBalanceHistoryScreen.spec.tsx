import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import AssetBalanceHistoryScreen from './AssetBalanceHistoryScreen';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let latestBalanceHistoryChartProps: any;
let latestExchangeRateScreenLayoutProps: any;
let mockState: any;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value: string) => value,
  }),
}));

jest.mock('../../../../components/charts/BalanceHistoryChart', () => {
  return (props: any) => {
    latestBalanceHistoryChartProps = props;
    return null;
  };
});

jest.mock('../../../../components/charts/useLegacyLastDayChangeRowData', () =>
  jest.fn(),
);

jest.mock('../../../../components/styled/Containers', () => ({
  ScreenGutter: 16,
}));

jest.mock('../../../../portfolio/ui/hooks/usePortfolioAnalysis', () => ({
  usePortfolioAnalysis: jest.fn(() => ({
    storedWallets: [],
    eligibleWallets: [],
    data: undefined,
    quoteCurrency: 'USD',
    currentData: undefined,
    committedData: undefined,
    error: undefined,
    requestKey: 'analysis-request',
    currentRatesByAssetId: {},
    currentRatesSignature: 'rates-sig',
  })),
}));

jest.mock(
  '../../../../portfolio/ui/hooks/usePortfolioWalletSnapshotPresence',
  () =>
    jest.fn(() => ({
      checked: true,
      hasAllSnapshots: true,
      hasAnySnapshots: true,
      loading: false,
    })),
);

jest.mock('../../../../utils/helper-methods', () => ({
  formatFiatAmount: jest.fn(() => '$100.00'),
}));

jest.mock('../../../../utils/hooks', () => ({
  useAppSelector: jest.fn((selector: (state: any) => any) =>
    selector(mockState),
  ),
}));

jest.mock('../../../../utils/portfolio/assets', () => ({
  hasCompletedPopulateForWallets: jest.fn(() => false),
  isPopulateLoadingForWallets: jest.fn(() => false),
  walletHasNonZeroLiveBalance: jest.fn(() => false),
  walletsHaveNonZeroLiveBalance: jest.fn(() => true),
}));

jest.mock('../../../../utils/fiatAmountText', () => ({
  shouldUseCompactFiatAmountText: jest.fn(() => false),
}));

jest.mock('./ExchangeRateScreenLayout', () => {
  return (props: any) => {
    latestExchangeRateScreenLayoutProps = props;
    return <>{props.chartSection}</>;
  };
});

jest.mock('./assetBalanceHistorySummary', () => ({
  buildAssetBalanceHistoryIdleSummary: jest.fn(() => ({
    assetBalance: 100,
    changeRow: {
      percent: 10,
      deltaFiatFormatted: '$10.00',
      rangeLabel: '1D',
    },
    assetMetrics: {
      hasRate: true,
      hasPnl: true,
      showPnlPlaceholder: false,
      fiatValue: 100,
      pnlFiat: 10,
      pnlPercent: 10,
    },
  })),
  buildAssetBalanceHistoryDisplayedSummary: jest.fn(
    ({
      idleSummary,
    }: {
      idleSummary: {assetBalance?: number; changeRow?: any};
    }) => ({
      assetBalance: idleSummary.assetBalance,
      changeRow: idleSummary.changeRow,
      source: 'idle',
    }),
  ),
}));

jest.mock('./useAssetScreenRefresh', () =>
  jest.fn(() => ({
    isRefreshing: false,
    onRefresh: jest.fn(),
  })),
);

const {usePortfolioAnalysis} = jest.requireMock(
  '../../../../portfolio/ui/hooks/usePortfolioAnalysis',
) as {
  usePortfolioAnalysis: jest.Mock;
};
const useLegacyLastDayChangeRowData = jest.requireMock(
  '../../../../components/charts/useLegacyLastDayChangeRowData',
) as jest.Mock;
const {hasCompletedPopulateForWallets} = jest.requireMock(
  '../../../../utils/portfolio/assets',
) as {
  hasCompletedPopulateForWallets: jest.Mock;
};
const {isPopulateLoadingForWallets} = jest.requireMock(
  '../../../../utils/portfolio/assets',
) as {
  isPopulateLoadingForWallets: jest.Mock;
};
const mockUsePortfolioWalletSnapshotPresence = jest.requireMock(
  '../../../../portfolio/ui/hooks/usePortfolioWalletSnapshotPresence',
) as jest.Mock;
const {buildAssetBalanceHistoryDisplayedSummary} = jest.requireMock(
  './assetBalanceHistorySummary',
) as {
  buildAssetBalanceHistoryDisplayedSummary: jest.Mock;
};

const sharedFactory = () =>
  ({
    walletsForAsset: [{wallet: {id: 'wallet-1'}}],
    assetWallets: [{id: 'wallet-1'}],
    hasWalletsForAsset: true,
    assetContext: {
      chain: 'btc',
      currencyAbbreviation: 'btc',
      tokenAddress: undefined,
    },
    resolvedQuoteCurrency: 'USD',
    assetTotalFiatBalance: 100,
    rates: {},
    chartLineColor: '#123456',
    gradientBackgroundColor: '#abcdef',
    hideAllBalances: false,
    showPortfolioValue: true,
    formatDisplayPrice: () => '$100.00',
    currentFiatRate: 100,
    currencyAbbreviation: 'BTC',
  } as any);

describe('AssetBalanceHistoryScreen', () => {
  beforeEach(() => {
    latestBalanceHistoryChartProps = undefined;
    latestExchangeRateScreenLayoutProps = undefined;
    mockState = {
      PORTFOLIO: {
        lastFullPopulateCompletedAt: 1234,
        lastPopulatedAt: 1234,
        populateStatus: undefined,
      },
    };
    usePortfolioAnalysis.mockClear();
    buildAssetBalanceHistoryDisplayedSummary.mockClear();
    useLegacyLastDayChangeRowData.mockReset();
    useLegacyLastDayChangeRowData.mockReturnValue(undefined);
    hasCompletedPopulateForWallets.mockClear();
    hasCompletedPopulateForWallets.mockReturnValue(false);
    isPopulateLoadingForWallets.mockClear();
    isPopulateLoadingForWallets.mockReturnValue(false);
    mockUsePortfolioWalletSnapshotPresence.mockClear();
    mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
      checked: true,
      hasAllSnapshots: true,
      hasAnySnapshots: true,
      loading: false,
    });
  });

  it('updates parent analysis when the chart timeframe changes', async () => {
    await act(async () => {
      TestRenderer.create(
        <AssetBalanceHistoryScreen shared={sharedFactory()} />,
      );
    });

    expect(latestBalanceHistoryChartProps.showLoaderWhenNoSnapshots).toBe(
      false,
    );
    expect(usePortfolioAnalysis).toHaveBeenCalledTimes(1);
    expect(usePortfolioAnalysis).toHaveBeenLastCalledWith(
      expect.objectContaining({
        timeframe: '1D',
      }),
    );

    await act(async () => {
      latestBalanceHistoryChartProps.onSelectedTimeframeChange('1W');
    });

    expect(latestBalanceHistoryChartProps.showLoaderWhenNoSnapshots).toBe(
      false,
    );
    expect(usePortfolioAnalysis).toHaveBeenCalledTimes(2);
    expect(usePortfolioAnalysis).toHaveBeenLastCalledWith(
      expect.objectContaining({
        timeframe: '1W',
      }),
    );
  });

  it('does not mount chart work when Show Portfolio is disabled', async () => {
    const shared = sharedFactory();
    shared.showPortfolioValue = false;

    await act(async () => {
      TestRenderer.create(<AssetBalanceHistoryScreen shared={shared} />);
    });

    expect(latestBalanceHistoryChartProps).toBeUndefined();
    expect(usePortfolioAnalysis).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
    expect(useLegacyLastDayChangeRowData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentFiatBalance: 100,
        enabled: true,
        mode: 'representativeAsset',
        quoteCurrency: 'USD',
        representativeAsset: shared.assetContext,
        wallets: shared.assetWallets,
      }),
    );
  });

  it('shows the legacy Last Day PnL row when Show Portfolio is disabled', async () => {
    const shared = sharedFactory();
    shared.showPortfolioValue = false;
    const legacyChangeRow = {
      percent: 11.11,
      deltaFiatFormatted: '$10.00',
      rangeLabel: 'Last Day',
    };
    useLegacyLastDayChangeRowData.mockReturnValue(legacyChangeRow);

    await act(async () => {
      TestRenderer.create(<AssetBalanceHistoryScreen shared={shared} />);
    });

    expect(latestBalanceHistoryChartProps).toBeUndefined();
    expect(latestExchangeRateScreenLayoutProps.changeRow).toEqual(
      legacyChangeRow,
    );
    expect(latestExchangeRateScreenLayoutProps.reserveChangeRowSpace).toBe(
      false,
    );
  });

  it('hides the PnL row when balances are hidden', async () => {
    const shared = sharedFactory();
    shared.hideAllBalances = true;

    await act(async () => {
      TestRenderer.create(<AssetBalanceHistoryScreen shared={shared} />);
    });

    expect(latestBalanceHistoryChartProps).toBeUndefined();
    expect(latestExchangeRateScreenLayoutProps.changeRow).toBeUndefined();
    expect(latestExchangeRateScreenLayoutProps.topValue).toBe('****');
    expect(latestExchangeRateScreenLayoutProps.reserveChangeRowSpace).toBe(
      false,
    );
  });

  it('does not mount chart work while the asset initial populate scope is still running', async () => {
    const shared = sharedFactory();
    isPopulateLoadingForWallets.mockReturnValue(true);
    mockState.PORTFOLIO = {
      lastFullPopulateCompletedAt: undefined,
      lastPopulatedAt: undefined,
      populateStatus: {
        currentWalletId: 'wallet-1',
        errors: [],
        inProgress: true,
        txRequestsMade: 1,
        txsProcessed: 100,
        walletsCompleted: 0,
        walletsTotal: 1,
        walletStatusById: {'wallet-1': 'in_progress'},
      },
    };

    await act(async () => {
      TestRenderer.create(<AssetBalanceHistoryScreen shared={shared} />);
    });

    expect(latestBalanceHistoryChartProps).toBeUndefined();
    expect(usePortfolioAnalysis).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('mounts chart work when this asset has completed during initial populate', async () => {
    const shared = sharedFactory();
    mockState.PORTFOLIO = {
      lastFullPopulateCompletedAt: undefined,
      lastPopulatedAt: undefined,
      populateStatus: {
        currentWalletId: 'wallet-2',
        errors: [],
        inProgress: true,
        txRequestsMade: 1,
        txsProcessed: 100,
        walletsCompleted: 1,
        walletsTotal: 2,
        walletStatusById: {'wallet-1': 'done', 'wallet-2': 'in_progress'},
      },
    };
    hasCompletedPopulateForWallets.mockReturnValue(true);

    await act(async () => {
      TestRenderer.create(<AssetBalanceHistoryScreen shared={shared} />);
    });

    expect(latestBalanceHistoryChartProps).toBeDefined();
    expect(usePortfolioAnalysis).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it('keeps asset chart work mounted with stale preservation during later incremental populate after initial success', async () => {
    isPopulateLoadingForWallets.mockReturnValue(true);
    mockState.PORTFOLIO.populateStatus = {
      currentWalletId: 'wallet-1',
      errors: [],
      inProgress: true,
      txRequestsMade: 1,
      txsProcessed: 100,
      walletsCompleted: 0,
      walletsTotal: 1,
      walletStatusById: {'wallet-1': 'in_progress'},
    };

    await act(async () => {
      TestRenderer.create(
        <AssetBalanceHistoryScreen shared={sharedFactory()} />,
      );
    });

    expect(latestBalanceHistoryChartProps).toBeDefined();
    expect(latestBalanceHistoryChartProps.showLoaderWhenNoSnapshots).toBe(
      false,
    );
    expect(latestBalanceHistoryChartProps.isBalanceChartDataReadyToQuery).toBe(
      false,
    );
    expect(
      latestBalanceHistoryChartProps.preserveVisibleSeriesWhileNotReady,
    ).toBe(true);
  });

  it('preserves stale chart summary state while asset chart data is not ready during incremental populate', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <AssetBalanceHistoryScreen shared={sharedFactory()} />,
      );
    });

    await act(async () => {
      latestBalanceHistoryChartProps.onDisplayedAnalysisPointChange({
        totalFiatBalance: 200,
      });
      latestBalanceHistoryChartProps.onChangeRowData({
        percent: 20,
        deltaFiatFormatted: '$20.00',
        rangeLabel: '1D',
      });
      latestBalanceHistoryChartProps.onSelectionActiveChange(true);
    });

    expect(buildAssetBalanceHistoryDisplayedSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({
        chartDisplayedPoint: expect.objectContaining({
          totalFiatBalance: 200,
        }),
        chartChangeRow: expect.objectContaining({
          percent: 20,
        }),
      }),
    );

    isPopulateLoadingForWallets.mockReturnValue(true);
    mockState.PORTFOLIO.populateStatus = {
      currentWalletId: 'wallet-1',
      errors: [],
      inProgress: true,
      txRequestsMade: 1,
      txsProcessed: 100,
      walletsCompleted: 0,
      walletsTotal: 1,
      walletStatusById: {'wallet-1': 'in_progress'},
    };

    await act(async () => {
      renderer.update(<AssetBalanceHistoryScreen shared={sharedFactory()} />);
    });

    expect(latestBalanceHistoryChartProps.isBalanceChartDataReadyToQuery).toBe(
      false,
    );
    expect(
      latestBalanceHistoryChartProps.preserveVisibleSeriesWhileNotReady,
    ).toBe(true);
    expect(buildAssetBalanceHistoryDisplayedSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({
        chartDisplayedPoint: expect.objectContaining({
          totalFiatBalance: 200,
        }),
        chartChangeRow: expect.objectContaining({
          percent: 20,
        }),
      }),
    );
  });

  it('does not mount chart work when snapshot presence settles with no rows and no pending work', async () => {
    mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
      checked: true,
      hasAllSnapshots: false,
      hasAnySnapshots: false,
      loading: false,
    });

    await act(async () => {
      TestRenderer.create(
        <AssetBalanceHistoryScreen shared={sharedFactory()} />,
      );
    });

    expect(latestBalanceHistoryChartProps).toBeUndefined();
    expect(usePortfolioAnalysis).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });
});

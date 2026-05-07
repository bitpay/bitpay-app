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
const {hasCompletedPopulateForWallets} = jest.requireMock(
  '../../../../utils/portfolio/assets',
) as {
  hasCompletedPopulateForWallets: jest.Mock;
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
    hasCompletedPopulateForWallets.mockClear();
    hasCompletedPopulateForWallets.mockReturnValue(false);
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

  it('does not mount chart work before the asset populate completes', async () => {
    const shared = sharedFactory();
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

  it('keeps chart work eligible during later incremental populate after initial success', async () => {
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
  });
});

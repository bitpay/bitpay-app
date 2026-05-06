import {
  runPortfolioBalanceChartViewModelQuery,
  runPortfolioChartQuery,
} from './common';
import {
  buildAssetPnlSummaryCacheKey,
  buildAssetPnlSummaryIdentityFromViewModelQuery,
  clearAssetPnlSummaryCacheForTests,
  getAssetPnlSummaryCacheEntry,
} from './assetPnlSummaryCache';
import {
  getPortfolioAnalysisRuntimeClient,
  getPortfolioRuntimeClient,
} from '../runtime/portfolioRuntime';

const mockComputeAnalysisChart = jest.fn();
const mockComputeAnalysis = jest.fn();
const mockComputeBalanceChartViewModel = jest.fn();

jest.mock('../../constants/config', () => ({
  BASE_BWS_URL: 'https://bws.invalid',
  BWC_TIMEOUT: 60_000,
}));

jest.mock('../../store/wallet/utils/currency', () => ({
  GetPrecision: jest.fn(() => ({
    unitDecimals: 8,
  })),
}));

jest.mock('../../utils/portfolio/displayCurrency', () => ({
  buildCommittedPortfolioHoldingsRevisionToken: jest.fn(
    ({lastPopulatedAt}: {lastPopulatedAt?: number}) =>
      typeof lastPopulatedAt === 'number' ? String(lastPopulatedAt) : '0',
  ),
  getAssetCurrentDisplayQuoteRate: jest.fn(() => 0),
  resolveActivePortfolioDisplayQuoteCurrency: jest.fn(
    ({quoteCurrency}: {quoteCurrency?: string}) => quoteCurrency || 'USD',
  ),
}));

jest.mock('../adapters/rn/walletMappers', () => ({
  isPortfolioRuntimeEligibleWallet: jest.fn(() => true),
  toPortfolioStoredWallet: jest.fn(),
}));

jest.mock('../runtime/portfolioRuntime', () => ({
  getPortfolioRuntimeClient: jest.fn(() => ({
    computeAnalysisChart: mockComputeAnalysisChart,
    computeAnalysis: mockComputeAnalysis,
  })),
  getPortfolioAnalysisRuntimeClient: jest.fn(() => ({
    computeAnalysisChart: mockComputeAnalysisChart,
    computeAnalysis: mockComputeAnalysis,
    computeBalanceChartViewModel: mockComputeBalanceChartViewModel,
  })),
}));

const mockGetPortfolioRuntimeClient = getPortfolioRuntimeClient as jest.Mock;
const mockGetPortfolioAnalysisRuntimeClient =
  getPortfolioAnalysisRuntimeClient as jest.Mock;

describe('runPortfolioChartQuery', () => {
  beforeEach(() => {
    mockComputeAnalysisChart.mockReset();
    mockComputeAnalysis.mockReset();
    mockComputeBalanceChartViewModel.mockReset();
    mockGetPortfolioRuntimeClient.mockClear();
    mockGetPortfolioAnalysisRuntimeClient.mockClear();
    clearAssetPnlSummaryCacheForTests();
  });

  it('calls computeAnalysisChart on the analysis runtime and does not call computeAnalysis', async () => {
    const chartResult = {
      timeframe: '1D',
      quoteCurrency: 'USD',
      driverAssetId: 'btc:btc',
      driverCoin: 'btc',
      analysisWindow: undefined,
      assetIds: ['btc:btc'],
      coins: ['btc'],
      singleAsset: true,
      timestamps: [1],
      totalFiatBalance: [100],
      totalRemainingCostBasisFiat: [100],
      totalUnrealizedPnlFiat: [0],
      totalPnlChange: [0],
      totalPnlPercent: [0],
      driverMarkRate: [100],
      driverRatePercentChange: [0],
    } as const;

    mockComputeAnalysisChart.mockResolvedValue(chartResult);

    const wallets = [
      {
        walletId: 'wallet-1',
        addedAt: 0,
        summary: {
          walletId: 'wallet-1',
          walletName: 'Wallet 1',
          chain: 'btc',
          network: 'livenet',
          currencyAbbreviation: 'btc',
          balanceAtomic: '0',
          balanceFormatted: '0',
        },
        credentials: {
          walletId: 'wallet-1',
          chain: 'btc',
          network: 'livenet',
          coin: 'btc',
        },
      },
    ] as any;

    await expect(
      runPortfolioChartQuery({
        wallets,
        quoteCurrency: 'USD',
        timeframe: '1D',
        maxPoints: 5,
        currentRatesByAssetId: {'btc:btc': 100},
        asOfMs: 1234,
      }),
    ).resolves.toBe(chartResult);

    expect(mockComputeAnalysisChart).toHaveBeenCalledWith(
      expect.objectContaining({
        wallets,
        quoteCurrency: 'USD',
        timeframe: '1D',
        maxPoints: 5,
        currentRatesByAssetId: {'btc:btc': 100},
        nowMs: 1234,
      }),
    );
    expect(mockComputeAnalysis).not.toHaveBeenCalled();
    expect(mockGetPortfolioAnalysisRuntimeClient).toHaveBeenCalledTimes(1);
    expect(mockGetPortfolioRuntimeClient).not.toHaveBeenCalled();
  });

  it('calls computeBalanceChartViewModel on the analysis runtime', async () => {
    const viewModel = {
      timeframe: '1D',
      quoteCurrency: 'USD',
      walletIds: ['wallet-1'],
      dataRevisionSig: 'rev-1',
      balanceOffset: 0,
      graphPoints: [{ts: 1, value: 100}],
      analysisPoints: [
        {
          timestamp: 1,
          totalFiatBalance: 100,
          totalRemainingCostBasisFiat: 90,
          totalUnrealizedPnlFiat: 10,
          totalPnlChange: 10,
          totalPnlPercent: 11.11,
        },
      ],
      latestTotalFiatBalance: 100,
      latestDisplayedTotalFiatBalance: 100,
      totalPnlChange: 10,
      totalPnlPercent: 11.11,
      changeRow: {
        totalPnlChange: 10,
        totalPnlPercent: 11.11,
      },
    } as const;
    const wallets = [
      {
        walletId: 'wallet-1',
        addedAt: 0,
        summary: {
          walletId: 'wallet-1',
          walletName: 'Wallet 1',
          chain: 'btc',
          network: 'livenet',
          currencyAbbreviation: 'btc',
          balanceAtomic: '0',
          balanceFormatted: '0',
        },
        credentials: {
          walletId: 'wallet-1',
          chain: 'btc',
          network: 'livenet',
          coin: 'btc',
        },
      },
    ] as any;

    mockComputeBalanceChartViewModel.mockResolvedValue(viewModel);

    await expect(
      runPortfolioBalanceChartViewModelQuery({
        wallets,
        quoteCurrency: 'USD',
        timeframe: '1D',
        maxPoints: 5,
        currentRatesByAssetId: {'btc:btc': 100},
        dataRevisionSig: 'rev-1',
        walletIds: ['wallet-1'],
        balanceOffset: 0,
        asOfMs: 1234,
      }),
    ).resolves.toBe(viewModel);

    expect(mockComputeBalanceChartViewModel).toHaveBeenCalledWith(
      expect.objectContaining({
        wallets,
        quoteCurrency: 'USD',
        timeframe: '1D',
        maxPoints: 5,
        currentRatesByAssetId: {'btc:btc': 100},
        dataRevisionSig: 'rev-1',
        walletIds: ['wallet-1'],
        balanceOffset: 0,
        nowMs: 1234,
      }),
    );
    expect(mockComputeAnalysisChart).not.toHaveBeenCalled();
    expect(mockComputeAnalysis).not.toHaveBeenCalled();
    expect(mockGetPortfolioAnalysisRuntimeClient).toHaveBeenCalledTimes(1);
    expect(mockGetPortfolioRuntimeClient).not.toHaveBeenCalled();

    const identity = buildAssetPnlSummaryIdentityFromViewModelQuery({
      wallets,
      quoteCurrency: 'USD',
      timeframe: '1D',
      currentRatesByAssetId: {'btc:btc': 100},
      dataRevisionSig: 'rev-1',
      walletIds: ['wallet-1'],
      balanceOffset: 0,
      asOfMs: 1234,
      summaryCacheRevisionSig: '',
    });
    expect(identity).toBeDefined();
    expect(
      getAssetPnlSummaryCacheEntry(buildAssetPnlSummaryCacheKey(identity!))
        ?.summary,
    ).toEqual(
      expect.objectContaining({
        assetKey: 'btc',
        fiatValue: 100,
        pnlFiat: 10,
        pnlPercent: 11.11,
        hasPnl: true,
      }),
    );
  });
});

import {buildBalanceChartViewModelFromAnalysisChart} from './balanceChartViewModel';
import type {PnlAnalysisChartResult} from './analysisStreaming';

const makeChart = (
  overrides: Partial<PnlAnalysisChartResult> = {},
): PnlAnalysisChartResult => ({
  timeframe: '1D',
  quoteCurrency: 'usd',
  driverAssetId: 'btc:btc',
  driverCoin: 'btc',
  analysisWindow: undefined,
  assetIds: ['btc:btc'],
  coins: ['btc'],
  singleAsset: true,
  timestamps: [1000, 1000, 900],
  totalFiatBalance: [100, 110, 120],
  totalRemainingCostBasisFiat: [90, 95, 100],
  totalUnrealizedPnlFiat: [10, 15, 20],
  totalPnlChange: [0, 10, 20],
  totalPnlPercent: [0, 10, 20],
  totalCryptoBalanceFormatted: ['1', '1.1', '1.2'],
  driverMarkRate: [100, 110, 120],
  driverRatePercentChange: [0, 10, 20],
  ...overrides,
});

describe('buildBalanceChartViewModelFromAnalysisChart', () => {
  it('normalizes render graph timestamps without rewriting analysis timestamps', () => {
    const viewModel = buildBalanceChartViewModelFromAnalysisChart({
      chart: makeChart(),
      walletIds: ['wallet-1'],
      dataRevisionSig: 'revision-1',
      balanceOffset: 5,
    });

    expect(viewModel.graphPoints.map(point => point.ts)).toEqual([
      1000, 1001, 1002,
    ]);
    expect(viewModel.graphPoints.map(point => point.value)).toEqual([
      105, 115, 125,
    ]);
    expect(viewModel.analysisPoints.map(point => point.timestamp)).toEqual([
      1000, 1000, 900,
    ]);
    expect(
      viewModel.analysisPoints.map(point => point.totalCryptoBalanceFormatted),
    ).toEqual(['1', '1.1', '1.2']);
    expect(viewModel.latestTotalFiatBalance).toBe(120);
    expect(viewModel.latestDisplayedTotalFiatBalance).toBe(125);
  });
});

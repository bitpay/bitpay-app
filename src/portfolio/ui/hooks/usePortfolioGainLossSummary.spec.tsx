import React from 'react';
import {act, render, waitFor} from '@testing-library/react-native';
import {usePortfolioGainLossSummary} from './usePortfolioGainLossSummary';
import {useIsFocused} from '@react-navigation/native';
import {runPortfolioChartQuery} from '../common';
import {BALANCE_GAIN_LOSS_SUMMARY_SCOPE_IDENTITY_KEY} from '../../../utils/portfolio/chartCache';
import {usePortfolioBalanceChartScope} from './usePortfolioBalanceChartScope';
import usePortfolioHistoricalRateDepsCache from './usePortfolioHistoricalRateDepsCache';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('../common', () => ({
  runPortfolioChartQuery: jest.fn(),
}));

jest.mock('../../../utils/portfolio/chartCache', () => ({
  BALANCE_GAIN_LOSS_SUMMARY_SCOPE_IDENTITY_KEY:
    'portfolio_gain_loss_summary_chart',
}));

jest.mock('../../../utils/portfolio/balanceChartData', () => ({
  areBalanceChartHistoricalRatesReady: jest.fn(() => true),
  buildBalanceChartHistoricalRateRequests: jest.fn(() => []),
  getBalanceChartHistoricalRateCacheKeys: jest.fn(() => []),
  getBalanceChartHistoricalRateCacheRevision: jest.fn(() => 'hist-rev'),
}));

jest.mock('./usePortfolioBalanceChartScope', () => ({
  usePortfolioBalanceChartScope: jest.fn(),
}));

jest.mock('./usePortfolioHistoricalRateDepsCache', () => jest.fn());

const mockUseIsFocused = useIsFocused as jest.Mock;
const mockRunPortfolioChartQuery = runPortfolioChartQuery as jest.Mock;
const mockUsePortfolioBalanceChartScope =
  usePortfolioBalanceChartScope as jest.Mock;
const mockUsePortfolioHistoricalRateDepsCache =
  usePortfolioHistoricalRateDepsCache as jest.Mock;

let latestResult: ReturnType<typeof usePortfolioGainLossSummary> | undefined;

const sampleWallet = {
  id: 'wallet-1',
  currencyAbbreviation: 'btc',
  chain: 'btc',
  tokenAddress: undefined,
} as any;

const storedWallets = [
  {
    summary: {
      walletId: 'wallet-1',
      currencyAbbreviation: 'btc',
      chain: 'btc',
      tokenAddress: undefined,
    },
  },
];

const buildScope = () => ({
  asOfMs: 1234,
  chartDataRevisionSig: 'USD|1|1234',
  currentRatesByAssetId: {'btc-asset': 74333.76},
  currentRatesSignature: 'rates-sig',
  currentSpotRatesByRateKey: {'btc:btc': 74333.76},
  currentSpotRatesSignature: 'spot-sig',
  eligibleWallets: [sampleWallet],
  quoteCurrency: 'USD',
  scopeId: 'scope-1',
  sortedWalletIds: ['wallet-1'],
  storedWalletRequestSig: 'wallet-sig',
  storedWallets,
});

const buildChart = (timeframe: '1D' | 'ALL', pnlChange: number) => ({
  timeframe,
  quoteCurrency: 'USD',
  driverAssetId: 'btc-asset',
  driverCoin: 'btc',
  assetIds: ['btc-asset'],
  coins: ['btc'],
  singleAsset: true,
  timestamps: [100, 200],
  totalFiatBalance: [90, 100],
  totalRemainingCostBasisFiat: [80, 80],
  totalUnrealizedPnlFiat: [10, 20],
  totalPnlChange: [0, pnlChange],
  totalPnlPercent: [0, timeframe === '1D' ? 10 : 25],
  driverMarkRate: [70000, 74333.76],
  driverRatePercentChange: [0, 5],
});

const HookHarness = ({
  wallets = [sampleWallet],
  liveFiatTotal = 100,
}: {
  wallets?: any[];
  liveFiatTotal?: number;
}) => {
  latestResult = usePortfolioGainLossSummary({
    wallets,
    liveFiatTotal,
  });
  return null;
};

describe('usePortfolioGainLossSummary', () => {
  beforeEach(() => {
    latestResult = undefined;
    mockUseIsFocused.mockReset();
    mockUseIsFocused.mockReturnValue(true);
    mockRunPortfolioChartQuery.mockReset();
    mockRunPortfolioChartQuery.mockImplementation(
      ({timeframe}: {timeframe: '1D' | 'ALL'}) =>
        Promise.resolve(buildChart(timeframe, timeframe === '1D' ? 5 : 20)),
    );
    mockUsePortfolioBalanceChartScope.mockReset();
    mockUsePortfolioBalanceChartScope.mockReturnValue(buildScope());
    mockUsePortfolioHistoricalRateDepsCache.mockReset();
    mockUsePortfolioHistoricalRateDepsCache.mockReturnValue({
      cache: {},
      depKeys: [],
      loading: false,
      error: undefined,
      hasRequests: false,
      ready: true,
      requestGroups: [],
      revision: 'hist-rev',
      shouldWaitForReady: false,
    });
  });

  it('does not compute gain-loss charts while the screen is unfocused', () => {
    mockUseIsFocused.mockReturnValue(false);

    render(<HookHarness />);

    expect(mockRunPortfolioChartQuery).not.toHaveBeenCalled();
  });

  it('derives today and all-time summary values from runtime chart queries', async () => {
    const chartResolvers: Record<string, (value: any) => void> = {};
    mockRunPortfolioChartQuery.mockImplementation(
      ({timeframe}: {timeframe: '1D' | 'ALL'}) =>
        new Promise(resolve => {
          chartResolvers[timeframe] = resolve;
        }),
    );

    render(<HookHarness />);

    expect(mockUsePortfolioBalanceChartScope).toHaveBeenCalledWith(
      expect.objectContaining({
        balanceOffset: 0,
        scopeIdentityKey: BALANCE_GAIN_LOSS_SUMMARY_SCOPE_IDENTITY_KEY,
        wallets: [sampleWallet],
      }),
    );

    await waitFor(() => {
      expect(mockRunPortfolioChartQuery).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      chartResolvers['1D']?.(buildChart('1D', 5));
      chartResolvers.ALL?.(buildChart('ALL', 20));
      await Promise.resolve();
    });

    expect(latestResult?.summary).toEqual({
      quoteCurrency: 'USD',
      today: {
        deltaFiat: 5,
        percentRatio: 0.1,
        available: true,
      },
      total: {
        deltaFiat: 20,
        percentRatio: 0.25,
        available: true,
      },
    });
  });

  it('keeps the all-time summary query alive when the today query resolves first', async () => {
    const chartResolvers: Record<string, (value: any) => void> = {};
    mockRunPortfolioChartQuery.mockImplementation(
      ({timeframe}: {timeframe: '1D' | 'ALL'}) =>
        new Promise(resolve => {
          chartResolvers[timeframe] = resolve;
        }),
    );

    const view = render(<HookHarness />);

    await waitFor(() => {
      expect(mockRunPortfolioChartQuery).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      chartResolvers['1D']?.(buildChart('1D', 5));
      await Promise.resolve();
    });

    view.rerender(<HookHarness />);

    expect(latestResult?.loading).toBe(true);
    expect(mockRunPortfolioChartQuery).toHaveBeenCalledTimes(2);

    await act(async () => {
      chartResolvers.ALL?.(buildChart('ALL', 20));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(latestResult?.loading).toBe(false);
    });
    expect(latestResult?.summary.total).toEqual({
      deltaFiat: 20,
      percentRatio: 0.25,
      available: true,
    });
  });
});

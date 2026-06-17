import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {usePortfolioBalanceChartSurface} from './usePortfolioBalanceChartSurface';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let latestResult:
  | ReturnType<typeof usePortfolioBalanceChartSurface>
  | undefined;

const wallet = {id: 'wallet-1'} as any;

const HookHarness = ({
  quoteCurrency = 'EUR',
  fallbackCurrency = 'USD',
  fallbackBalance = 100,
  isBalanceChartDataReadyToQuery = true,
  preserveChartDrivenStateWhileNotReady = false,
  resetKey = 'a',
}: {
  quoteCurrency?: string;
  fallbackCurrency?: string;
  fallbackBalance?: number;
  isBalanceChartDataReadyToQuery?: boolean;
  preserveChartDrivenStateWhileNotReady?: boolean;
  resetKey?: string;
}) => {
  latestResult = usePortfolioBalanceChartSurface({
    wallets: [wallet],
    quoteCurrency,
    fallbackCurrency,
    fallbackBalance,
    isBalanceChartDataReadyToQuery,
    preserveChartDrivenStateWhileNotReady,
    resetKey,
  });
  return null;
};

describe('usePortfolioBalanceChartSurface', () => {
  beforeEach(() => {
    latestResult = undefined;
  });

  it('uses the fallback balance and currency until chart data is displayed', async () => {
    await act(async () => {
      TestRenderer.create(<HookHarness />);
    });

    expect(latestResult?.displayedTopBalance).toBe(100);
    expect(latestResult?.displayedTopBalanceCurrency).toBe('USD');

    await act(async () => {
      latestResult?.chartCallbacks.onDisplayedAnalysisPointChange({
        totalFiatBalance: 125,
        totalPnlChange: 10,
        totalPnlPercent: 5,
        totalCryptoBalanceFormatted: '1.25',
      });
    });

    expect(latestResult?.displayedTopBalance).toBe(125);
    expect(latestResult?.displayedTopBalanceCurrency).toBe('EUR');
    expect(
      latestResult?.displayedAnalysisPoint?.totalCryptoBalanceFormatted,
    ).toBe('1.25');

    await act(async () => {
      latestResult?.chartCallbacks.onSelectedBalanceChange(140);
    });

    expect(latestResult?.displayedTopBalance).toBe(140);
    expect(latestResult?.displayedTopBalanceCurrency).toBe('EUR');
  });

  it('returns to the fallback when the chart surface scope resets', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<HookHarness resetKey="a" />);
    });

    await act(async () => {
      latestResult?.chartCallbacks.onSelectedBalanceChange(140);
    });

    expect(latestResult?.displayedTopBalance).toBe(140);

    await act(async () => {
      renderer.update(<HookHarness resetKey="b" />);
    });

    expect(latestResult?.selectedBalance).toBeUndefined();
    expect(latestResult?.displayedBalance).toBeUndefined();
    expect(latestResult?.displayedTopBalance).toBe(100);
    expect(latestResult?.displayedTopBalanceCurrency).toBe('USD');
  });

  it('ignores chart-driven values while chart data is not ready to query', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<HookHarness />);
    });

    await act(async () => {
      latestResult?.chartCallbacks.onDisplayedAnalysisPointChange({
        totalFiatBalance: 125,
        totalPnlChange: 10,
        totalPnlPercent: 5,
        totalCryptoBalanceFormatted: '1.25',
      });
      latestResult?.chartCallbacks.onChangeRowData({
        percent: 5,
        deltaFiatFormatted: '$10.00',
        rangeLabel: '1D',
      });
      latestResult?.chartCallbacks.onSelectedBalanceChange(140);
    });

    expect(latestResult?.displayedTopBalance).toBe(140);
    expect(latestResult?.changeRowData?.percent).toBe(5);

    await act(async () => {
      renderer.update(<HookHarness isBalanceChartDataReadyToQuery={false} />);
    });

    expect(latestResult?.selectedBalance).toBeUndefined();
    expect(latestResult?.displayedBalance).toBeUndefined();
    expect(latestResult?.displayedAnalysisPoint).toBeUndefined();
    expect(latestResult?.changeRowData).toBeUndefined();
    expect(latestResult?.chartDrivenBalance).toBeUndefined();
    expect(latestResult?.displayedTopBalance).toBe(100);
    expect(latestResult?.displayedTopBalanceCurrency).toBe('USD');

    await act(async () => {
      renderer.update(<HookHarness />);
    });

    expect(latestResult?.displayedTopBalance).toBe(100);
    expect(latestResult?.displayedTopBalanceCurrency).toBe('USD');
    expect(latestResult?.changeRowData).toBeUndefined();
  });

  it('preserves chart-driven values while chart data is not ready when requested', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<HookHarness />);
    });

    await act(async () => {
      latestResult?.chartCallbacks.onDisplayedAnalysisPointChange({
        totalFiatBalance: 125,
        totalPnlChange: 10,
        totalPnlPercent: 5,
        totalCryptoBalanceFormatted: '1.25',
      });
      latestResult?.chartCallbacks.onChangeRowData({
        percent: 5,
        deltaFiatFormatted: '$10.00',
        rangeLabel: '1D',
      });
    });

    await act(async () => {
      renderer.update(
        <HookHarness
          isBalanceChartDataReadyToQuery={false}
          preserveChartDrivenStateWhileNotReady={true}
        />,
      );
    });

    expect(latestResult?.displayedBalance).toBe(125);
    expect(latestResult?.displayedAnalysisPoint?.totalFiatBalance).toBe(125);
    expect(latestResult?.changeRowData?.percent).toBe(5);
    expect(latestResult?.displayedTopBalance).toBe(125);
    expect(latestResult?.displayedTopBalanceCurrency).toBe('EUR');
  });
});

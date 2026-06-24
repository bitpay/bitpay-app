import {
  isWorkletPopulateMethod,
  shouldDispatchPortfolioRequestOnRuntimeWorklet,
} from './portfolioRequestRouting';

describe('portfolioRequestRouting', () => {
  it('still identifies populate session methods', () => {
    expect(isWorkletPopulateMethod('snapshots.prepareWallet')).toBe(true);
    expect(isWorkletPopulateMethod('snapshots.processNextPage')).toBe(true);
    expect(isWorkletPopulateMethod('snapshots.finishWallet')).toBe(true);
    expect(isWorkletPopulateMethod('snapshots.closeWalletSession')).toBe(true);
  });

  it('routes read and debug methods to the worklet runtime too', () => {
    expect(
      shouldDispatchPortfolioRequestOnRuntimeWorklet('snapshots.getIndex'),
    ).toBe(true);
    expect(
      shouldDispatchPortfolioRequestOnRuntimeWorklet('rates.getCache'),
    ).toBe(true);
    expect(
      shouldDispatchPortfolioRequestOnRuntimeWorklet('analysis.compute'),
    ).toBe(true);
    expect(
      shouldDispatchPortfolioRequestOnRuntimeWorklet('analysis.prepareSession'),
    ).toBe(true);
    expect(
      shouldDispatchPortfolioRequestOnRuntimeWorklet(
        'analysis.computeSessionScope',
      ),
    ).toBe(true);
    expect(
      shouldDispatchPortfolioRequestOnRuntimeWorklet('analysis.disposeSession'),
    ).toBe(true);
    expect(
      shouldDispatchPortfolioRequestOnRuntimeWorklet('analysis.computeChart'),
    ).toBe(true);
    expect(
      shouldDispatchPortfolioRequestOnRuntimeWorklet(
        'analysis.computeBalanceChartViewModel',
      ),
    ).toBe(true);
    expect(
      shouldDispatchPortfolioRequestOnRuntimeWorklet('debug.clearAll'),
    ).toBe(true);
    expect(
      shouldDispatchPortfolioRequestOnRuntimeWorklet(
        'debug.getPopulateWalletTrace',
      ),
    ).toBe(true);
    expect(
      shouldDispatchPortfolioRequestOnRuntimeWorklet({
        id: 1,
        method: 'analysis.compute',
        params: {
          cfg: {baseUrl: 'https://example.com'},
          wallets: [],
          quoteCurrency: 'USD',
          timeframe: '1D',
        },
      }),
    ).toBe(true);
  });
});

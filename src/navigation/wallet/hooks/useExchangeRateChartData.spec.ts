import {
  formatExchangeRateChartData,
  getDisplayedExchangeRateRangeMs,
  prepareExchangeRateChartPoints,
} from './useExchangeRateChartData';

describe('prepareExchangeRateChartPoints', () => {
  it('uses the explicit nowMs when clipping an ALL-series window for display', () => {
    const nowMs = Date.UTC(2026, 3, 20, 15, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(nowMs + dayMs * 7);

    try {
      const result = prepareExchangeRateChartPoints({
        selectedSeriesPoints: [
          {ts: nowMs - dayMs - 1, rate: 99},
          {ts: nowMs - dayMs, rate: 100},
          {ts: nowMs, rate: 101},
        ],
        selectedTimeframe: '1D',
        seriesDataInterval: 'ALL',
        currentFiatRate: 101,
        nowMs,
      });

      expect(result).toEqual([
        {ts: nowMs - dayMs, rate: 100},
        {ts: nowMs, rate: 101},
      ]);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('appends a live terminal point at nowMs when the live point is newer than history', () => {
    const startMs = Date.UTC(2026, 3, 19, 15, 0, 0);
    const historicalEndMs = Date.UTC(2026, 3, 20, 14, 0, 0);
    const asOfMs = Date.UTC(2026, 3, 20, 15, 0, 0);

    const result = prepareExchangeRateChartPoints({
      selectedSeriesPoints: [
        {ts: startMs, rate: 100},
        {ts: historicalEndMs, rate: 101},
      ],
      selectedTimeframe: '1D',
      seriesDataInterval: '1D',
      currentFiatRate: 102,
      nowMs: asOfMs,
    });

    expect(result).toEqual([
      {ts: startMs, rate: 100},
      {ts: historicalEndMs, rate: 101},
      {ts: asOfMs, rate: 102},
    ]);
  });

  it('appends a live terminal point even when the live rate matches the last historical rate', () => {
    const startMs = Date.UTC(2026, 3, 19, 15, 0, 0);
    const historicalEndMs = Date.UTC(2026, 3, 20, 14, 0, 0);
    const asOfMs = Date.UTC(2026, 3, 20, 15, 0, 0);

    const result = prepareExchangeRateChartPoints({
      selectedSeriesPoints: [
        {ts: startMs, rate: 100},
        {ts: historicalEndMs, rate: 101},
      ],
      selectedTimeframe: '1D',
      seriesDataInterval: '1D',
      currentFiatRate: 101,
      nowMs: asOfMs,
    });

    expect(result).toEqual([
      {ts: startMs, rate: 100},
      {ts: historicalEndMs, rate: 101},
      {ts: asOfMs, rate: 101},
    ]);
  });

  it('replaces the last point rate when the live terminal timestamp matches the historical terminal timestamp', () => {
    const startMs = Date.UTC(2026, 3, 19, 15, 0, 0);
    const asOfMs = Date.UTC(2026, 3, 20, 15, 0, 0);

    const result = prepareExchangeRateChartPoints({
      selectedSeriesPoints: [
        {ts: startMs, rate: 100},
        {ts: asOfMs, rate: 101},
      ],
      selectedTimeframe: '1D',
      seriesDataInterval: '1D',
      currentFiatRate: 102,
      nowMs: asOfMs,
    });

    expect(result).toEqual([
      {ts: startMs, rate: 100},
      {ts: asOfMs, rate: 102},
    ]);
  });

  it('computes displayed range metadata from the prepared points including an appended live terminal point', () => {
    const startMs = Date.UTC(2026, 3, 19, 15, 0, 0);
    const historicalEndMs = Date.UTC(2026, 3, 20, 14, 0, 0);
    const asOfMs = Date.UTC(2026, 3, 20, 15, 0, 0);

    const prepared = prepareExchangeRateChartPoints({
      selectedSeriesPoints: [
        {ts: startMs, rate: 100},
        {ts: historicalEndMs, rate: 101},
      ],
      selectedTimeframe: '1D',
      seriesDataInterval: '1D',
      currentFiatRate: 102,
      nowMs: asOfMs,
    });

    expect(getDisplayedExchangeRateRangeMs(prepared)).toBe(asOfMs - startMs);
  });
});

describe('formatExchangeRateChartData', () => {
  it('returns the raw percent change without rounding in the math layer', () => {
    const result = formatExchangeRateChartData([
      {ts: 1, rate: 100},
      {ts: 2, rate: 110.123456},
    ]);

    expect(result.percentChange).toBeCloseTo(10.123456, 6);
  });
});

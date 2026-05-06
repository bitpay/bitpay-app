import {
  buildBalanceHistoryChartChangeRowData,
  getDisplayedBalanceHistoryAnalysisPoint,
} from './balanceHistoryChartSelection';

jest.mock('../../utils/helper-methods', () => ({
  formatFiatAmount: jest.fn((amount: number, quoteCurrency: string) => {
    return `${quoteCurrency}:${amount}`;
  }),
}));

import {formatFiatAmount} from '../../utils/helper-methods';

describe('balanceHistoryChartSelection', () => {
  it('uses interval pnl change for the detail change row', () => {
    const changeRow = buildBalanceHistoryChartChangeRowData({
      displayedAnalysisPoint: {
        totalPnlPercent: 12.34,
        totalUnrealizedPnlFiat: 150,
        totalPnlChange: 40,
      } as any,
      quoteCurrency: 'USD',
      label: '1D',
    });

    expect(changeRow).toEqual({
      percent: 12.34,
      deltaFiatFormatted: formatFiatAmount(40, 'USD', {
        customPrecision: 'minimal',
        currencyDisplay: 'symbol',
      }),
      rangeLabel: '1D',
    });
  });

  it('prefers the selected point over the last point when resolving chart data', () => {
    const selectedPoint = {date: new Date(2000)} as any;
    const selectedAnalysisPoint = {timestamp: 2000, totalUnrealizedPnlFiat: 25};
    const lastAnalysisPoint = {timestamp: 3000, totalUnrealizedPnlFiat: 50};

    const displayed = getDisplayedBalanceHistoryAnalysisPoint({
      selectedPoint,
      activeSeries: {
        pointByTimestamp: new Map([[2000, selectedAnalysisPoint as any]]),
        analysisPoints: [
          selectedAnalysisPoint as any,
          lastAnalysisPoint as any,
        ],
      },
    });

    expect(displayed).toBe(selectedAnalysisPoint);
  });
});

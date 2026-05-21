import {
  buildLegacyLastDayChangeRowData,
  getLegacyLastDayFiatBalance,
} from './useLegacyLastDayChangeRowData';

jest.mock('../../utils/helper-methods', () => ({
  calculatePercentageDifference: jest.fn(
    (currentBalance: number, lastDayBalance: number) =>
      Number(
        (((currentBalance - lastDayBalance) * 100) / lastDayBalance).toFixed(2),
      ),
  ),
  formatFiatAmount: jest.fn((amount: number, quoteCurrency: string) => {
    return `${quoteCurrency}:${amount}`;
  }),
}));

describe('useLegacyLastDayChangeRowData helpers', () => {
  it('sums wallet fiatLastDay balances for a scoped legacy baseline', () => {
    expect(
      getLegacyLastDayFiatBalance([
        {balance: {fiatLastDay: 30}},
        {balance: {fiatLastDay: '70'}},
        {balance: {fiatLastDay: undefined}},
      ] as any),
    ).toBe(100);
  });

  it('builds chart-compatible change row data from legacy current and last-day fiat', () => {
    expect(
      buildLegacyLastDayChangeRowData({
        wallets: [
          {balance: {fiatLastDay: 30}},
          {balance: {fiatLastDay: 70}},
        ] as any,
        currentFiatBalance: 120,
        quoteCurrency: 'USD',
        label: 'Last Day',
      }),
    ).toEqual({
      percent: 20,
      deltaFiatFormatted: 'USD:20',
      rangeLabel: 'Last Day',
    });
  });

  it('returns undefined when legacy last-day data is unavailable', () => {
    expect(
      buildLegacyLastDayChangeRowData({
        wallets: [{balance: {fiatLastDay: 0}}] as any,
        currentFiatBalance: 120,
        quoteCurrency: 'USD',
        label: 'Last Day',
      }),
    ).toBeUndefined();
  });
});

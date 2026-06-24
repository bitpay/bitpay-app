import {
  resolveExchangeRateTopChangeRow,
  type ExchangeRateChangeRow,
} from './exchangeRateTopChangeRow';

describe('resolveExchangeRateTopChangeRow', () => {
  it('returns the visible change row when data is available', () => {
    const changeRow: ExchangeRateChangeRow = {
      percent: -1.23,
      deltaFiatFormatted: '-$4.56',
      rangeLabel: 'Last Day',
    };

    expect(
      resolveExchangeRateTopChangeRow({
        changeRow,
        reserveSpace: true,
      }),
    ).toEqual({
      ...changeRow,
      hidden: false,
    });
  });

  it('returns a hidden placeholder row when reserving space without data', () => {
    expect(
      resolveExchangeRateTopChangeRow({
        reserveSpace: true,
      }),
    ).toEqual({
      percent: 0,
      hidden: true,
    });
  });

  it('returns undefined when not reserving space and no change row exists', () => {
    expect(
      resolveExchangeRateTopChangeRow({
        reserveSpace: false,
      }),
    ).toBeUndefined();
  });
});

import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import ChartChangeRow from './ChartChangeRow';
import Percentage from '../percentage/Percentage';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let mockState: any;

jest.mock('../percentage/Percentage', () => jest.fn(() => null));

jest.mock('../../utils/hooks', () => ({
  useAppSelector: (selector: (state: any) => any) => selector(mockState),
}));

const mockPercentage = Percentage as unknown as jest.Mock;

const renderChangeRow = (
  props: Partial<React.ComponentProps<typeof ChartChangeRow>> = {},
) => {
  act(() => {
    TestRenderer.create(
      <ChartChangeRow
        percent={4.2}
        deltaFiatFormatted={'$120.00'}
        rangeLabel={'Last Day'}
        {...props}
      />,
    );
  });
};

describe('ChartChangeRow', () => {
  beforeEach(() => {
    mockPercentage.mockClear();
    mockState = {APP: {hideAllBalances: false}};
  });

  it('shows the fiat delta when balances are not hidden', () => {
    renderChangeRow({maskDeltaWhenBalancesHidden: true});

    expect(mockPercentage).toHaveBeenCalledWith(
      expect.objectContaining({
        percentageDifference: 4.2,
        priceChange: '$120.00',
      }),
      undefined,
    );
  });

  it('masks the fiat delta while balances are hidden', () => {
    mockState.APP.hideAllBalances = true;

    renderChangeRow({maskDeltaWhenBalancesHidden: true});

    expect(mockPercentage).toHaveBeenCalledWith(
      expect.objectContaining({
        percentageDifference: 4.2,
        priceChange: '****',
      }),
      undefined,
    );
  });

  it('keeps price deltas visible while balances are hidden', () => {
    mockState.APP.hideAllBalances = true;

    renderChangeRow();

    expect(mockPercentage).toHaveBeenCalledWith(
      expect.objectContaining({
        priceChange: '$120.00',
      }),
      undefined,
    );
  });
});

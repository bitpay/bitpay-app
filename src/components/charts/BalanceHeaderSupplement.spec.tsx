import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import BalanceHeaderSupplement from './BalanceHeaderSupplement';
import ChartChangeRow from './ChartChangeRow';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('./ChartChangeRow', () => jest.fn(() => null));

const mockChartChangeRow = ChartChangeRow as jest.Mock;

describe('BalanceHeaderSupplement', () => {
  beforeEach(() => {
    mockChartChangeRow.mockClear();
  });

  it('renders balance PnL rows with change data', () => {
    act(() => {
      TestRenderer.create(
        <BalanceHeaderSupplement
          changeRowData={{
            percent: 0,
            deltaFiatFormatted: '$0.00',
            rangeLabel: 'Last Day',
          }}
        />,
      );
    });

    expect(mockChartChangeRow).toHaveBeenCalledWith(
      expect.objectContaining({
        deltaFiatFormatted: '$0.00',
        percent: 0,
        rangeLabel: 'Last Day',
      }),
      undefined,
    );
  });
});

import {
  buildAssetBalanceHistoryDisplayedSummary,
  buildAssetBalanceHistoryIdleSummary,
} from './assetBalanceHistorySummary';

jest.mock('../../../../utils/helper-methods', () => ({
  formatFiatAmount: jest.fn((amount: number, quoteCurrency: string) => {
    return `${quoteCurrency}:${amount}`;
  }),
}));

describe('buildAssetBalanceHistoryIdleSummary', () => {
  it('reuses the shared asset-row metrics for idle balance and pnl', () => {
    expect(
      buildAssetBalanceHistoryIdleSummary({
        storedWallets: [
          {
            walletId: 'wallet-1',
            credentials: {
              walletId: 'wallet-1',
              chain: 'btc',
              coin: 'btc',
            },
            summary: {
              walletId: 'wallet-1',
              walletName: 'BTC Wallet',
              chain: 'btc',
              network: 'livenet',
              currencyAbbreviation: 'btc',
              balanceAtomic: '100000000',
              balanceFormatted: '1',
            },
            addedAt: 0,
          } as any,
        ],
        analysis: {
          assetSummaries: [
            {
              assetId: 'btc:btc',
              rateEnd: 125,
              fiatBalanceEnd: 125,
              pnlEnd: 25,
              pnlChange: 25,
              remainingCostBasisFiatEnd: 200,
            },
          ],
        } as any,
        quoteCurrency: 'USD',
        rangeLabel: '1D',
        gainLossMode: '1D',
        assetKey: 'btc',
      }),
    ).toEqual(
      expect.objectContaining({
        assetBalance: 125,
        changeRow: {
          percent: 12.5,
          deltaFiatFormatted: 'USD:25',
          rangeLabel: '1D',
        },
        assetMetrics: expect.objectContaining({
          key: 'btc',
          fiatValue: 125,
          pnlFiat: 25,
          pnlPercent: 12.5,
        }),
      }),
    );
  });

  it('returns no balance or change row when the asset row cannot be resolved', () => {
    expect(
      buildAssetBalanceHistoryIdleSummary({
        storedWallets: [],
        analysis: {assetSummaries: []} as any,
        quoteCurrency: 'USD',
        rangeLabel: '1D',
        gainLossMode: '1D',
        assetKey: 'btc',
      }),
    ).toEqual({
      assetBalance: undefined,
      changeRow: undefined,
      assetMetrics: undefined,
    });
  });

  it('prefers the chart displayed point and change row when both are available', () => {
    expect(
      buildAssetBalanceHistoryDisplayedSummary({
        idleSummary: {
          assetBalance: 125,
          changeRow: {
            percent: 12.5,
            deltaFiatFormatted: 'USD:25',
            rangeLabel: '1D',
          },
        },
        chartDisplayedPoint: {
          totalFiatBalance: 150,
        },
        chartChangeRow: {
          percent: 20,
          deltaFiatFormatted: 'USD:30',
          rangeLabel: 'Last Day',
        },
      }),
    ).toEqual({
      assetBalance: 150,
      changeRow: {
        percent: 20,
        deltaFiatFormatted: 'USD:30',
        rangeLabel: 'Last Day',
      },
      source: 'chart',
    });
  });

  it('falls back to the idle summary until the chart has a complete displayed payload', () => {
    expect(
      buildAssetBalanceHistoryDisplayedSummary({
        idleSummary: {
          assetBalance: 125,
          changeRow: {
            percent: 12.5,
            deltaFiatFormatted: 'USD:25',
            rangeLabel: '1D',
          },
        },
        chartDisplayedPoint: {
          totalFiatBalance: 150,
        },
      }),
    ).toEqual({
      assetBalance: 125,
      changeRow: {
        percent: 12.5,
        deltaFiatFormatted: 'USD:25',
        rangeLabel: '1D',
      },
      source: 'idle',
    });
  });
});

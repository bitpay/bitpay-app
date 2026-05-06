jest.mock('../../../utils/helper-methods', () => ({
  formatCurrencyAbbreviation: jest.fn((value: string) => value.toUpperCase()),
  formatFiatAmount: jest.fn((value: number, quoteCurrency: string) => {
    return `${quoteCurrency}:${value}`;
  }),
}));

import {buildAssetRowsFromAnalysis} from './buildAssetRowsFromAnalysis';

describe('buildAssetRowsFromAnalysis', () => {
  it('formats pnl percent with two decimals to match asset detail', () => {
    const rows = buildAssetRowsFromAnalysis({
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
            pnlEnd: 12.3456,
            pnlChange: 12.3456,
            remainingCostBasisFiatEnd: 100,
          },
        ],
      } as any,
      quoteCurrency: 'USD',
      gainLossMode: '1D',
      collapseAcrossChains: true,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        key: 'btc',
        deltaPercent: '+12.35%',
      }),
    ]);
  });

  it('builds rows for wallets whose summary network is reported as mainnet', () => {
    const rows = buildAssetRowsFromAnalysis({
      storedWallets: [
        {
          walletId: 'wallet-1',
          credentials: {
            walletId: 'wallet-1',
            chain: 'eth',
            coin: 'eth',
          },
          summary: {
            walletId: 'wallet-1',
            walletName: 'ETH Wallet',
            chain: 'eth',
            network: 'mainnet',
            currencyAbbreviation: 'eth',
            balanceAtomic: '1000000000000000000',
            balanceFormatted: '1',
          },
          addedAt: 0,
        } as any,
      ],
      analysis: {
        assetSummaries: [
          {
            assetId: 'eth:eth',
            rateEnd: 2000,
            fiatBalanceEnd: 1000,
            pnlEnd: 50,
            pnlChange: 50,
            remainingCostBasisFiatEnd: 1950,
          },
        ],
      } as any,
      currentRatesByAssetId: {'eth:eth': 2000},
      quoteCurrency: 'USD',
      gainLossMode: '1D',
      collapseAcrossChains: true,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        key: 'eth',
        fiatAmount: 'USD:2000',
      }),
    ]);
  });

  it('shows live fiat balance when pnl is unavailable but a live rate exists', () => {
    const rows = buildAssetRowsFromAnalysis({
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
      analysis: {assetSummaries: []} as any,
      currentRatesByAssetId: {'btc:btc': 50000},
      quoteCurrency: 'USD',
      gainLossMode: 'ALL',
      collapseAcrossChains: true,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        key: 'btc',
        fiatAmount: 'USD:50000\u00A0',
        hasRate: true,
        showPnlPlaceholder: true,
      }),
    ]);
  });
});

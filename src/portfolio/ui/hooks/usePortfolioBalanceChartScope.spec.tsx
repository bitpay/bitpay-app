import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {usePortfolioBalanceChartScope} from './usePortfolioBalanceChartScope';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {buildBalanceChartScopeId} from '../../../utils/portfolio/chartCache';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('../../../utils/portfolio/chartCache', () => ({
  buildBalanceChartScopeId: jest.fn(
    ({
      scopeIdentityKey,
      walletIds,
      quoteCurrency,
      balanceOffset,
    }: {
      scopeIdentityKey?: string;
      walletIds: string[];
      quoteCurrency: string;
      balanceOffset?: number;
    }) =>
      [
        scopeIdentityKey || 'default',
        quoteCurrency,
        typeof balanceOffset === 'number' ? String(balanceOffset) : '0',
        walletIds.join(','),
      ].join('|'),
  ),
  getSortedUniqueWalletIds: jest.fn((walletIds: string[]) =>
    Array.from(new Set(walletIds.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    ),
  ),
}));

jest.mock('../../../utils/portfolio/balanceChartData', () => ({
  buildCurrentSpotRatesByRateKey: jest.fn(() => ({
    'btc:btc': 100,
  })),
  getCurrentSpotRatesByRateKeySignature: jest.fn(
    (rates: Record<string, number>) =>
      Object.keys(rates)
        .sort()
        .map(rateKey => `${rateKey}:${String(rates[rateKey])}`)
        .join('|'),
  ),
}));

jest.mock('../common', () => ({
  buildCommittedPortfolioRevisionToken: jest.fn(
    ({lastPopulatedAt}: {lastPopulatedAt?: number}) =>
      typeof lastPopulatedAt === 'number'
        ? String(lastPopulatedAt)
        : 'uncommitted',
  ),
  buildCurrentRatesByAssetId: jest.fn(() => ({
    'btc:btc': 100,
  })),
  getCurrentRatesByAssetIdSignature: jest.fn((rates: Record<string, number>) =>
    Object.keys(rates)
      .sort()
      .map(rateKey => `${rateKey}:${String(rates[rateKey])}`)
      .join('|'),
  ),
  getStoredWalletRequestSignature: jest.fn(
    (
      storedWallets: Array<{
        summary?: {
          walletId?: string;
          chain?: string;
          currencyAbbreviation?: string;
          tokenAddress?: string;
          balanceAtomic?: string;
        };
      }>,
    ) =>
      storedWallets
        .map(wallet => {
          const summary = wallet.summary || {};
          return [
            String(summary.walletId || ''),
            String(summary.chain || ''),
            String(summary.currencyAbbreviation || ''),
            String(summary.tokenAddress || ''),
            String(summary.balanceAtomic || ''),
          ].join(':');
        })
        .sort()
        .join('|'),
  ),
  mapWalletsToStoredWallets: jest.fn(
    ({
      wallets,
    }: {
      wallets: Array<{
        id: string;
        chain: string;
        currencyAbbreviation: string;
        balanceAtomic?: string;
        balance?: {
          sat?: number;
        };
      }>;
    }) => ({
      eligibleWallets: wallets,
      storedWallets: wallets.map(wallet => ({
        summary: {
          walletId: wallet.id,
          walletName: wallet.id,
          chain: wallet.chain,
          currencyAbbreviation: wallet.currencyAbbreviation,
          tokenAddress: undefined,
          balanceAtomic: String(
            wallet.balance?.sat ?? wallet.balanceAtomic ?? '1000',
          ),
        },
      })),
    }),
  ),
  resolveActivePortfolioDisplayQuoteCurrency: jest.fn(
    ({
      quoteCurrency,
      defaultAltCurrencyIsoCode,
    }: {
      quoteCurrency?: string;
      defaultAltCurrencyIsoCode?: string;
    }) => quoteCurrency || defaultAltCurrencyIsoCode || 'USD',
  ),
  resolveCurrentRatesAsOfMs: jest.fn(
    ({ratesUpdatedAt}: {ratesUpdatedAt?: number}) => ratesUpdatedAt,
  ),
}));

const mockUseAppDispatch = useAppDispatch as jest.Mock;
const mockUseAppSelector = useAppSelector as jest.Mock;
const mockBuildBalanceChartScopeId = buildBalanceChartScopeId as jest.Mock;

let mockState: any;
let latestResult: ReturnType<typeof usePortfolioBalanceChartScope> | undefined;

const walletFactory = () =>
  ({
    id: 'wallet-1',
    chain: 'btc',
    currencyAbbreviation: 'btc',
    balanceAtomic: '1000',
    balance: {
      sat: 1000,
    },
  } as any);

const HookHarness = ({
  scopeIdentityKey,
  wallets,
}: {
  scopeIdentityKey?: string;
  wallets: any[];
}) => {
  latestResult = usePortfolioBalanceChartScope({
    scopeIdentityKey,
    wallets,
  });
  return null;
};

describe('usePortfolioBalanceChartScope', () => {
  beforeEach(() => {
    latestResult = undefined;
    mockBuildBalanceChartScopeId.mockClear();
    mockUseAppDispatch.mockReset();
    mockUseAppDispatch.mockReturnValue(jest.fn());
    mockUseAppSelector.mockReset();
    mockState = {
      APP: {
        defaultAltCurrency: {isoCode: 'USD'},
      },
      PORTFOLIO: {
        lastPopulatedAt: 111,
      },
      RATE: {
        rates: {
          btc: [{code: 'USD', rate: 100}],
        },
        ratesUpdatedAt: 1234,
      },
    };
    mockUseAppSelector.mockImplementation(selector => selector(mockState));
  });

  it('keeps the historical chart revision stable when only the shared rate asOfMs changes', async () => {
    let view: TestRenderer.ReactTestRenderer;

    await act(async () => {
      view = TestRenderer.create(<HookHarness wallets={[walletFactory()]} />);
    });

    expect(latestResult?.chartDataRevisionSig).toBe(
      '111|wallet-1:btc:btc::1000',
    );
    expect(latestResult?.asOfMs).toBe(1234);

    mockState = {
      ...mockState,
      RATE: {
        ...mockState.RATE,
        ratesUpdatedAt: 5678,
      },
    };

    await act(async () => {
      view!.update(<HookHarness wallets={[walletFactory()]} />);
    });

    expect(latestResult?.chartDataRevisionSig).toBe(
      '111|wallet-1:btc:btc::1000',
    );
    expect(latestResult?.asOfMs).toBe(5678);
  });

  it('changes the chart data revision when only the wallet live balance changes', async () => {
    let view: TestRenderer.ReactTestRenderer;

    await act(async () => {
      view = TestRenderer.create(<HookHarness wallets={[walletFactory()]} />);
    });

    expect(latestResult?.chartDataRevisionSig).toBe(
      '111|wallet-1:btc:btc::1000',
    );

    await act(async () => {
      view!.update(
        <HookHarness
          wallets={[
            {
              ...walletFactory(),
              balance: {
                sat: 700,
              },
            },
          ]}
        />,
      );
    });

    expect(latestResult?.chartDataRevisionSig).toBe(
      '111|wallet-1:btc:btc::700',
    );
  });

  it('refreshes the chart data revision when an existing wallet object balance is mutated', async () => {
    const wallet = walletFactory();
    const wallets = [wallet];
    let view: TestRenderer.ReactTestRenderer;

    await act(async () => {
      view = TestRenderer.create(<HookHarness wallets={wallets} />);
    });

    expect(latestResult?.chartDataRevisionSig).toBe(
      '111|wallet-1:btc:btc::1000',
    );

    wallet.balance = {
      sat: 700,
    };

    await act(async () => {
      view!.update(<HookHarness wallets={wallets} />);
    });

    expect(latestResult?.chartDataRevisionSig).toBe(
      '111|wallet-1:btc:btc::700',
    );
  });

  it('includes the scope identity key in the scope id so different chart series do not collide', async () => {
    let view: TestRenderer.ReactTestRenderer;

    await act(async () => {
      view = TestRenderer.create(
        <HookHarness
          scopeIdentityKey="balance_history_chart:89"
          wallets={[walletFactory()]}
        />,
      );
    });

    expect(mockBuildBalanceChartScopeId).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scopeIdentityKey: 'balance_history_chart:89',
      }),
    );
    expect(latestResult?.scopeId).toBe(
      'balance_history_chart:89|USD|0|wallet-1',
    );

    await act(async () => {
      view!.update(
        <HookHarness
          scopeIdentityKey="balance_gain_loss_summary:2"
          wallets={[walletFactory()]}
        />,
      );
    });

    expect(mockBuildBalanceChartScopeId).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scopeIdentityKey: 'balance_gain_loss_summary:2',
      }),
    );
    expect(latestResult?.scopeId).toBe(
      'balance_gain_loss_summary:2|USD|0|wallet-1',
    );
  });
});

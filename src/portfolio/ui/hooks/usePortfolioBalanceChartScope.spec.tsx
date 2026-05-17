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

const mockGetRatesSignature = (rates: Record<string, number>) =>
  Object.keys(rates)
    .sort()
    .map(rateKey => `${rateKey}:${String(rates[rateKey])}`)
    .join('|');

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
  getCurrentSpotRatesByRateKeySignature: jest.fn(mockGetRatesSignature),
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
  getCurrentRatesByAssetIdSignature: jest.fn(mockGetRatesSignature),
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

const expectChartRevision = (balanceAtomic = '1000') =>
  expect(latestResult?.chartDataRevisionSig).toBe(
    `111|wallet-1:btc:btc::${balanceAtomic}`,
  );

const expectScopeIdentity = (scopeIdentityKey: string) => {
  expect(mockBuildBalanceChartScopeId).toHaveBeenLastCalledWith(
    expect.objectContaining({scopeIdentityKey}),
  );
  expect(latestResult?.scopeId).toBe(`${scopeIdentityKey}|USD|0|wallet-1`);
};

const renderHarness = async (props: {
  scopeIdentityKey?: string;
  wallets: any[];
}) => {
  let view!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    view = TestRenderer.create(<HookHarness {...props} />);
  });
  return view;
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
        excessiveBalanceMismatchesByWalletId: {},
        invalidDecimalsByWalletId: {},
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
    const view = await renderHarness({wallets: [walletFactory()]});

    expectChartRevision();
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

    expectChartRevision();
    expect(latestResult?.asOfMs).toBe(5678);
  });

  it('changes the chart data revision when only the wallet live balance changes', async () => {
    const view = await renderHarness({wallets: [walletFactory()]});

    expectChartRevision();

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

    expectChartRevision('700');
  });

  it('excludes excessive balance mismatch quarantines from chart scope inputs', async () => {
    mockState = {
      ...mockState,
      PORTFOLIO: {
        ...mockState.PORTFOLIO,
        excessiveBalanceMismatchesByWalletId: {
          'wallet-1': {
            walletId: 'wallet-1',
            reason: 'excessive_balance_mismatch',
            computedAtomic: '1100',
            liveAtomic: '1000',
            deltaAtomic: '100',
            ratio: '1.1',
            threshold: 0.1,
            detectedAt: 1234,
            message: 'Computed snapshot balance exceeds live balance.',
          },
        },
      },
    };

    await renderHarness({wallets: [walletFactory()]});

    expect(latestResult?.storedWallets).toEqual([]);
    expect(latestResult?.eligibleWallets).toEqual([]);
    expect(latestResult?.sortedWalletIds).toEqual([]);
  });

  it('refreshes the chart data revision when an existing wallet object balance is mutated', async () => {
    const wallet = walletFactory();
    const wallets = [wallet];

    const view = await renderHarness({wallets});

    expectChartRevision();

    wallet.balance = {
      sat: 700,
    };

    await act(async () => {
      view!.update(<HookHarness wallets={wallets} />);
    });

    expectChartRevision('700');
  });

  it('includes the scope identity key in the scope id so different chart series do not collide', async () => {
    const view = await renderHarness({
      scopeIdentityKey: 'balance_history_chart:89',
      wallets: [walletFactory()],
    });

    expectScopeIdentity('balance_history_chart:89');

    await act(async () => {
      view!.update(
        <HookHarness
          scopeIdentityKey="balance_gain_loss_summary:2"
          wallets={[walletFactory()]}
        />,
      );
    });

    expectScopeIdentity('balance_gain_loss_summary:2');
  });
});

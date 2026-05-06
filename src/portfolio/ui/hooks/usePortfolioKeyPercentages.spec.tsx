import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {usePortfolioKeyPercentages} from './usePortfolioKeyPercentages';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  buildCurrentRatesByAssetId,
  buildCommittedPortfolioRevisionToken,
  getCurrentRatesByAssetIdSignature,
  getStoredWalletRequestSignature,
  mapWalletsToStoredWallets,
  resolveActivePortfolioDisplayQuoteCurrency,
  resolveCurrentRatesAsOfMs,
  runPortfolioChartQuery,
} from '../common';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('../common', () => ({
  buildCurrentRatesByAssetId: jest.fn(() => ({
    'btc:btc': 100,
  })),
  buildCommittedPortfolioRevisionToken: jest.fn(
    ({lastPopulatedAt}: {lastPopulatedAt?: number}) =>
      typeof lastPopulatedAt === 'number'
        ? String(lastPopulatedAt)
        : 'uncommitted',
  ),
  getCurrentRatesByAssetIdSignature: jest.fn(() => 'btc:btc:100'),
  getLastFiniteNumber: jest.fn((values: Array<number | null | undefined>) =>
    Array.isArray(values)
      ? values.find(value => typeof value === 'number')
      : undefined,
  ),
  getStoredWalletRequestSignature: jest.fn(() => 'wallet-1'),
  mapWalletsToStoredWallets: jest.fn(
    ({
      wallets,
    }: {
      wallets: Array<{id: string; chain: string; currencyAbbreviation: string}>;
    }) => ({
      eligibleWallets: wallets,
      storedWallets: wallets.map(wallet => ({
        walletId: wallet.id,
        addedAt: 0,
        summary: {
          walletId: wallet.id,
          walletName: wallet.id,
          chain: wallet.chain,
          network: 'livenet',
          currencyAbbreviation: wallet.currencyAbbreviation,
          balanceAtomic: '0',
          balanceFormatted: '0',
        },
        credentials: {},
      })),
    }),
  ),
  resolveActivePortfolioDisplayQuoteCurrency: jest.fn(
    ({defaultAltCurrencyIsoCode}: {defaultAltCurrencyIsoCode?: string}) =>
      defaultAltCurrencyIsoCode || 'USD',
  ),
  resolveCurrentRatesAsOfMs: jest.fn(
    ({ratesUpdatedAt}: {ratesUpdatedAt?: number}) => ratesUpdatedAt ?? 0,
  ),
  runPortfolioChartQuery: jest.fn(() => new Promise<never>(() => undefined)),
}));

const mockUseAppDispatch = useAppDispatch as jest.Mock;
const mockUseAppSelector = useAppSelector as jest.Mock;

let latestResult: Record<string, number | null> | undefined;
let mockState: any;

const keyFactory = () =>
  ({
    id: 'key-1',
    totalBalance: 123,
    wallets: [
      {
        id: 'wallet-1',
        chain: 'btc',
        currencyAbbreviation: 'btc',
        hideWallet: false,
        hideWalletByAccount: false,
      },
    ],
  } as any);

const mockRunPortfolioChartQuery = runPortfolioChartQuery as jest.Mock;
const mockBuildCurrentRatesByAssetId = buildCurrentRatesByAssetId as jest.Mock;
const mockBuildCommittedPortfolioRevisionToken =
  buildCommittedPortfolioRevisionToken as jest.Mock;
const mockGetCurrentRatesByAssetIdSignature =
  getCurrentRatesByAssetIdSignature as jest.Mock;
const mockGetStoredWalletRequestSignature =
  getStoredWalletRequestSignature as jest.Mock;
const mockMapWalletsToStoredWallets = mapWalletsToStoredWallets as jest.Mock;
const mockResolveActivePortfolioDisplayQuoteCurrency =
  resolveActivePortfolioDisplayQuoteCurrency as jest.Mock;
const mockResolveCurrentRatesAsOfMs = resolveCurrentRatesAsOfMs as jest.Mock;

const HookHarness = ({enabled, keys}: {enabled?: boolean; keys: any[]}) => {
  latestResult = usePortfolioKeyPercentages({enabled, keys});
  return null;
};

describe('usePortfolioKeyPercentages', () => {
  beforeEach(() => {
    latestResult = undefined;
    mockUseAppDispatch.mockReset();
    mockUseAppDispatch.mockReturnValue(jest.fn());
    mockUseAppSelector.mockReset();
    mockBuildCurrentRatesByAssetId.mockClear();
    mockBuildCommittedPortfolioRevisionToken.mockClear();
    mockGetCurrentRatesByAssetIdSignature.mockClear();
    mockGetStoredWalletRequestSignature.mockClear();
    mockMapWalletsToStoredWallets.mockClear();
    mockResolveActivePortfolioDisplayQuoteCurrency.mockClear();
    mockResolveCurrentRatesAsOfMs.mockClear();
    mockRunPortfolioChartQuery.mockClear();
    mockState = {
      APP: {
        defaultAltCurrency: {isoCode: 'USD'},
      },
      PORTFOLIO: {
        lastPopulatedAt: 1,
      },
      RATE: {
        rates: {},
        ratesUpdatedAt: 1234,
      },
    };
    mockUseAppSelector.mockImplementation(selector => selector(mockState));
  });

  it('keeps the empty loading map reference stable across a fiat switch while percentages are still loading', async () => {
    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(<HookHarness keys={[keyFactory()]} />);
    });

    const firstResult = latestResult;
    expect(firstResult).toEqual({});

    mockState = {
      ...mockState,
      APP: {
        defaultAltCurrency: {isoCode: 'EUR'},
      },
    };

    await act(async () => {
      view!.update(<HookHarness keys={[keyFactory()]} />);
    });

    expect(latestResult).toBe(firstResult);
  });

  it('does not build chart setup or start chart queries when disabled', async () => {
    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(
        <HookHarness enabled={false} keys={[keyFactory()]} />,
      );
    });

    const firstResult = latestResult;
    expect(latestResult).toEqual({});
    expect(mockBuildCommittedPortfolioRevisionToken).not.toHaveBeenCalled();
    expect(
      mockResolveActivePortfolioDisplayQuoteCurrency,
    ).not.toHaveBeenCalled();
    expect(mockResolveCurrentRatesAsOfMs).not.toHaveBeenCalled();
    expect(mockMapWalletsToStoredWallets).not.toHaveBeenCalled();
    expect(mockBuildCurrentRatesByAssetId).not.toHaveBeenCalled();
    expect(mockGetCurrentRatesByAssetIdSignature).not.toHaveBeenCalled();
    expect(mockGetStoredWalletRequestSignature).not.toHaveBeenCalled();
    expect(mockRunPortfolioChartQuery).not.toHaveBeenCalled();

    mockState = {
      ...mockState,
      APP: {
        defaultAltCurrency: {isoCode: 'EUR'},
      },
      RATE: {
        rates: {'btc:btc:EUR': 91},
        ratesUpdatedAt: 5678,
      },
    };

    await act(async () => {
      view!.update(<HookHarness enabled={false} keys={[keyFactory()]} />);
    });

    expect(latestResult).toBe(firstResult);
    expect(mockBuildCommittedPortfolioRevisionToken).not.toHaveBeenCalled();
    expect(
      mockResolveActivePortfolioDisplayQuoteCurrency,
    ).not.toHaveBeenCalled();
    expect(mockResolveCurrentRatesAsOfMs).not.toHaveBeenCalled();
    expect(mockMapWalletsToStoredWallets).not.toHaveBeenCalled();
    expect(mockBuildCurrentRatesByAssetId).not.toHaveBeenCalled();
    expect(mockGetCurrentRatesByAssetIdSignature).not.toHaveBeenCalled();
    expect(mockGetStoredWalletRequestSignature).not.toHaveBeenCalled();
    expect(mockRunPortfolioChartQuery).not.toHaveBeenCalled();
  });
});

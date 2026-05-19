import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import useExchangeRateSharedModel from './useExchangeRateSharedModel';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let latestSharedModel:
  | ReturnType<typeof useExchangeRateSharedModel>
  | undefined;
let mockRouteParams: any;
let mockState: any;
const mockDispatch = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    setOptions: mockSetOptions,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('styled-components/native', () => {
  const styled = (Component: any) => () => Component;

  return {
    __esModule: true,
    default: styled,
    useTheme: () => ({
      dark: false,
    }),
  };
});

jest.mock('../../../../components/back/HeaderBackButton', () => () => null);
jest.mock('../../../../components/styled/Text', () => ({
  HeaderTitle: 'HeaderTitle',
}));

jest.mock('../../../../constants/currencies', () => ({
  BitpaySupportedCoins: {
    btc: {
      name: 'Bitcoin',
      img: 'btc-image',
      theme: {},
    },
    eth: {
      name: 'Ethereum',
      img: 'eth-image',
      theme: {},
    },
  },
}));

jest.mock('../../../../constants/SupportedCurrencyOptions', () => ({
  SupportedCurrencyOptions: [],
}));

jest.mock('../../../../store/market-stats', () => ({
  fetchMarketStats: jest.fn((args: unknown) => ({
    type: 'FETCH_MARKET_STATS',
    payload: args,
  })),
  getMarketStatsCacheKey: jest.fn(() => 'market-stats-key'),
}));

jest.mock('../../../../store/wallet/utils/wallet', () => ({
  buildUIFormattedWallet: jest.fn(() => ({
    fiatBalance: 0,
    fiatBalanceFormat: '$0.00',
  })),
}));

jest.mock('../../../../utils/helper-methods', () => ({
  formatCurrencyAbbreviation: jest.fn((value: string) =>
    String(value || '').toUpperCase(),
  ),
  formatFiat: jest.fn(() => '$0.00'),
  formatFiatAmount: jest.fn((value: number) => String(value)),
  getRateByCurrencyName: jest.fn(
    (
      rates: Record<string, Array<{code: string; rate: number}>>,
      currencyAbbreviation: string,
    ) => rates[currencyAbbreviation] || [],
  ),
}));

jest.mock('../../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: any) => any) => selector(mockState),
}));

jest.mock('../../../../utils/portfolio/assetTheme', () => ({
  getAssetTheme: jest.fn(() => undefined),
}));

jest.mock('../../../../portfolio/ui/common', () => ({
  resolveCurrentRatesAsOfMs: jest.fn(() => 1234),
}));

jest.mock(
  '../../../../portfolio/ui/hooks/usePortfolioWalletSnapshotPresence',
  () =>
    jest.fn(() => ({
      checked: true,
      hasAllSnapshots: false,
      hasAnySnapshots: false,
      hasSnapshotsByWalletId: {},
      loading: false,
    })),
);

jest.mock('../../../../utils/portfolio/assets', () => ({
  findSupportedCurrencyOptionForAsset: jest.fn(() => undefined),
  getWalletLiveFiatBalance: jest.fn(() => 0),
  getWalletsMatchingExchangeRateAsset: jest.fn(() => []),
  getVisibleWalletsForKey: jest.fn(() => []),
  getVisibleWalletsFromKeys: jest.fn(() => []),
}));

jest.mock('../../../../utils/portfolio/core/pnl/rates', () => ({
  normalizeFiatRateSeriesCoin: jest.fn((value: string) =>
    String(value || '').toLowerCase(),
  ),
}));

jest.mock('../../../../store/wallet/utils/currency', () => ({
  IsSVMChain: jest.fn(() => false),
}));

jest.mock('../ExchangeRate.utils', () => ({
  formatCompactCurrency: jest.fn(() => '--'),
  formatSupply: jest.fn(() => '--'),
  POLYGON_ABOUT_FALLBACK: '',
}));

const HookHarness = () => {
  latestSharedModel = useExchangeRateSharedModel();
  return null;
};

const mockPortfolioAssets = jest.requireMock(
  '../../../../utils/portfolio/assets',
);
const mockGetWalletsMatchingExchangeRateAsset =
  mockPortfolioAssets.getWalletsMatchingExchangeRateAsset as jest.Mock;
const mockGetVisibleWalletsForKey =
  mockPortfolioAssets.getVisibleWalletsForKey as jest.Mock;
const mockGetVisibleWalletsFromKeys =
  mockPortfolioAssets.getVisibleWalletsFromKeys as jest.Mock;
const mockUsePortfolioWalletSnapshotPresence = jest.requireMock(
  '../../../../portfolio/ui/hooks/usePortfolioWalletSnapshotPresence',
) as jest.Mock;

describe('useExchangeRateSharedModel', () => {
  beforeEach(() => {
    latestSharedModel = undefined;
    mockDispatch.mockReset();
    mockSetOptions.mockReset();
    mockGetWalletsMatchingExchangeRateAsset.mockReset();
    mockGetWalletsMatchingExchangeRateAsset.mockImplementation(
      ({wallets}: {wallets?: unknown[]}) => wallets || [],
    );
    mockGetVisibleWalletsForKey.mockReset();
    mockGetVisibleWalletsForKey.mockImplementation(
      (key: {wallets?: unknown[]} | undefined) => key?.wallets || [],
    );
    mockGetVisibleWalletsFromKeys.mockReset();
    mockGetVisibleWalletsFromKeys.mockReturnValue([]);
    mockUsePortfolioWalletSnapshotPresence.mockReset();
    mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
      checked: true,
      hasAllSnapshots: false,
      hasAnySnapshots: false,
      hasSnapshotsByWalletId: {},
      loading: false,
    });
    mockRouteParams = {
      currencyAbbreviation: 'eth',
      chain: 'eth',
      currencyName: 'Ethereum',
    };
    mockState = {
      APP: {
        defaultAltCurrency: {isoCode: 'EUR'},
        hideAllBalances: false,
        homeCarouselConfig: undefined,
        showPortfolioValue: true,
      },
      MARKET_STATS: {
        itemsByKey: {},
      },
      PORTFOLIO: {
        quoteCurrency: 'USD',
      },
      RATE: {
        rates: {
          eth: [
            {code: 'USD', rate: 2000},
            {code: 'EUR', rate: 999999},
          ],
          btc: [
            {code: 'USD', rate: 40000},
            {code: 'EUR', rate: 36000},
          ],
        },
        ratesUpdatedAt: 1234,
      },
      WALLET: {
        keys: {},
      },
    };
  });

  it('derives the live display-quote spot rate from canonical USD plus the BTC bridge', async () => {
    await act(async () => {
      TestRenderer.create(<HookHarness />);
    });

    expect(latestSharedModel?.resolvedQuoteCurrency).toBe('EUR');
    expect(latestSharedModel?.currentFiatRate).toBeCloseTo(1800, 8);
  });

  it('scopes asset wallets to the route key when opening asset details from key All Assets', async () => {
    const keyWallet = {
      id: 'wallet-in-key',
      currencyAbbreviation: 'eth',
      chain: 'eth',
    };
    const otherKeyWallet = {
      id: 'wallet-outside-key',
      currencyAbbreviation: 'eth',
      chain: 'eth',
    };

    mockRouteParams = {
      ...mockRouteParams,
      chartType: 'assetBalanceHistory',
      keyId: 'key-a',
    };
    mockState.WALLET.keys = {
      'key-a': {
        id: 'key-a',
        wallets: [keyWallet],
      },
      'key-b': {
        id: 'key-b',
        wallets: [otherKeyWallet],
      },
    };
    mockGetVisibleWalletsFromKeys.mockReturnValue([keyWallet, otherKeyWallet]);

    await act(async () => {
      TestRenderer.create(<HookHarness />);
    });

    expect(mockGetVisibleWalletsForKey).toHaveBeenCalledWith(
      mockState.WALLET.keys['key-a'],
    );
    expect(mockGetVisibleWalletsFromKeys).not.toHaveBeenCalled();
    expect(latestSharedModel?.assetWallets).toEqual([keyWallet]);
    expect(
      latestSharedModel?.walletsForAsset.map(({wallet}) => wallet),
    ).toEqual([keyWallet]);
  });

  it('includes zero-balance asset wallets with snapshots in asset balance details', async () => {
    const liveWallet = {
      id: 'wallet-live',
      balance: {sat: 1},
      currencyAbbreviation: 'eth',
      chain: 'eth',
    };
    const zeroHistoricalWallet = {
      id: 'wallet-zero-history',
      balance: {sat: 0},
      currencyAbbreviation: 'eth',
      chain: 'eth',
    };
    const zeroEmptyWallet = {
      id: 'wallet-zero-empty',
      balance: {sat: 0},
      currencyAbbreviation: 'eth',
      chain: 'eth',
    };

    mockRouteParams = {
      ...mockRouteParams,
      chartType: 'assetBalanceHistory',
    };
    mockGetVisibleWalletsFromKeys.mockReturnValue([
      liveWallet,
      zeroHistoricalWallet,
      zeroEmptyWallet,
    ]);
    mockGetWalletsMatchingExchangeRateAsset.mockImplementation(
      ({
        includeZeroBalance,
        wallets,
      }: {
        includeZeroBalance?: boolean;
        wallets?: Array<{balance?: {sat?: number}}>;
      }) => {
        return (wallets || []).filter(wallet => {
          return includeZeroBalance || Number(wallet.balance?.sat || 0) > 0;
        });
      },
    );
    mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
      checked: true,
      hasAllSnapshots: false,
      hasAnySnapshots: true,
      hasSnapshotsByWalletId: {
        'wallet-zero-history': true,
        'wallet-zero-empty': false,
      },
      loading: false,
    });

    await act(async () => {
      TestRenderer.create(<HookHarness />);
    });

    expect(latestSharedModel?.assetWallets).toEqual([
      liveWallet,
      zeroHistoricalWallet,
      zeroEmptyWallet,
    ]);
    expect(mockUsePortfolioWalletSnapshotPresence).toHaveBeenCalledWith({
      wallets: [liveWallet, zeroHistoricalWallet, zeroEmptyWallet],
      enabled: true,
    });
    expect(
      latestSharedModel?.walletsForAsset.map(({wallet}) => wallet),
    ).toEqual([liveWallet, zeroHistoricalWallet]);
  });

  it('includes zero-balance asset wallets with snapshots in exchange rate details', async () => {
    const liveWallet = {
      id: 'exchange-wallet-live',
      balance: {sat: 1},
      currencyAbbreviation: 'eth',
      chain: 'eth',
    };
    const zeroHistoricalWallet = {
      id: 'exchange-wallet-zero-history',
      balance: {sat: 0},
      currencyAbbreviation: 'eth',
      chain: 'eth',
    };
    const zeroEmptyWallet = {
      id: 'exchange-wallet-zero-empty',
      balance: {sat: 0},
      currencyAbbreviation: 'eth',
      chain: 'eth',
    };

    mockGetVisibleWalletsFromKeys.mockReturnValue([
      liveWallet,
      zeroHistoricalWallet,
      zeroEmptyWallet,
    ]);
    mockGetWalletsMatchingExchangeRateAsset.mockImplementation(
      ({
        includeZeroBalance,
        wallets,
      }: {
        includeZeroBalance?: boolean;
        wallets?: Array<{balance?: {sat?: number}}>;
      }) => {
        return (wallets || []).filter(wallet => {
          return includeZeroBalance || Number(wallet.balance?.sat || 0) > 0;
        });
      },
    );
    mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
      checked: true,
      hasAllSnapshots: false,
      hasAnySnapshots: true,
      hasSnapshotsByWalletId: {
        'exchange-wallet-zero-history': true,
        'exchange-wallet-zero-empty': false,
      },
      loading: false,
    });

    await act(async () => {
      TestRenderer.create(<HookHarness />);
    });

    expect(latestSharedModel?.assetWallets).toEqual([liveWallet]);
    expect(mockUsePortfolioWalletSnapshotPresence).toHaveBeenCalledWith({
      wallets: [liveWallet, zeroHistoricalWallet, zeroEmptyWallet],
      enabled: true,
    });
    expect(
      latestSharedModel?.walletsForAsset.map(({wallet}) => wallet),
    ).toEqual([liveWallet, zeroHistoricalWallet]);
  });
});

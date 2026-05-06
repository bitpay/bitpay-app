jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((options: Record<string, unknown>) => options.ios),
  },
}));

jest.mock('react-native-device-info', () => ({
  getDeviceType: jest.fn(() => 'Handset'),
}));

jest.mock('../../store/wallet/utils/currency', () => ({
  IsSVMChain: jest.fn(() => false),
}));

jest.mock('../../store/wallet/utils/wallet', () => ({
  getWalletStableDeduplicationId: jest.fn(
    (wallet: {id?: string}) => wallet?.id || '',
  ),
  isWalletVisibleForKey: jest.fn(() => true),
}));

jest.mock('../helper-methods', () => ({
  formatCurrencyAbbreviation: jest.fn((value: string) =>
    String(value || '').toUpperCase(),
  ),
  formatFiatAmount: jest.fn((value: number, currency: string) => {
    return `${currency}:${value.toFixed(2)}`;
  }),
  getCurrencyAbbreviation: jest.fn((name: string, _chain: string) =>
    String(name || '').toLowerCase(),
  ),
  getRateByCurrencyName: jest.fn(
    (
      rates: Record<string, Array<{code: string; rate: number}>>,
      currencyAbbreviation: string,
    ) => rates[currencyAbbreviation] || [],
  ),
  calculatePercentageDifference: jest.fn(() => 0),
  unitStringToAtomicBigInt: jest.fn((value: string, unitDecimals: number) => {
    const [intPartRaw, fracPartRaw = ''] = String(value || '0').split('.');
    const intPart = BigInt(intPartRaw || '0');
    const fracPart = (fracPartRaw + '0'.repeat(unitDecimals)).slice(
      0,
      unitDecimals,
    );
    return intPart * 10n ** BigInt(unitDecimals) + BigInt(fracPart || '0');
  }),
}));

import type {Wallet} from '../../store/wallet/wallet.models';
import {
  buildAssetPreviewRowItemsFromWallets,
  getWalletsMatchingExchangeRateAsset,
  getWalletLiveFiatBalance,
  sortAssetRowItemsByAssetFiatPriority,
  sortWalletsByAssetFiatPriority,
} from './assets';

describe('sortWalletsByAssetFiatPriority', () => {
  const makeWallet = (args: {id: string; coin: string; fiat: number}): Wallet =>
    ({
      id: args.id,
      currencyAbbreviation: args.coin,
      chain: args.coin,
      network: 'livenet',
      balance: {
        fiat: args.fiat,
      },
    } as Wallet);

  it('prioritizes wallets by aggregated asset fiat balance', () => {
    const wallets = [
      makeWallet({id: 'btc-1', coin: 'btc', fiat: 100}),
      makeWallet({id: 'doge-1', coin: 'doge', fiat: 250}),
      makeWallet({id: 'btc-2', coin: 'btc', fiat: 300}),
      makeWallet({id: 'eth-1', coin: 'eth', fiat: 200}),
    ];

    expect(
      sortWalletsByAssetFiatPriority(wallets).map(wallet => wallet.id),
    ).toEqual(['btc-2', 'btc-1', 'doge-1', 'eth-1']);
  });

  it('preserves input order when asset and wallet fiat balances tie', () => {
    const wallets = [
      makeWallet({id: 'doge-1', coin: 'doge', fiat: 100}),
      makeWallet({id: 'doge-2', coin: 'doge', fiat: 100}),
      makeWallet({id: 'btc-1', coin: 'btc', fiat: 50}),
      makeWallet({id: 'btc-2', coin: 'btc', fiat: 50}),
    ];

    expect(
      sortWalletsByAssetFiatPriority(wallets).map(wallet => wallet.id),
    ).toEqual(['doge-1', 'doge-2', 'btc-1', 'btc-2']);
  });
});

describe('sortAssetRowItemsByAssetFiatPriority', () => {
  const wallets = [
    {
      id: 'doge-wallet',
      currencyAbbreviation: 'doge',
      chain: 'doge',
      network: 'livenet',
      balance: {fiat: 500},
    } as Wallet,
    {
      id: 'btc-wallet',
      currencyAbbreviation: 'btc',
      chain: 'btc',
      network: 'livenet',
      balance: {fiat: 100},
    } as Wallet,
  ];

  it('sorts asset rows by aggregated wallet fiat priority', () => {
    expect(
      sortAssetRowItemsByAssetFiatPriority({
        wallets,
        items: [
          {
            key: 'btc',
            currencyAbbreviation: 'btc',
            chain: 'btc',
            name: 'BTC',
            cryptoAmount: '1',
            fiatAmount: '$100',
            deltaFiat: '+$1',
            deltaPercent: '+1%',
            isPositive: true,
            hasRate: true,
            hasPnl: true,
          },
          {
            key: 'doge',
            currencyAbbreviation: 'doge',
            chain: 'doge',
            name: 'DOGE',
            cryptoAmount: '2',
            fiatAmount: '$500',
            deltaFiat: '+$5',
            deltaPercent: '+2%',
            isPositive: true,
            hasRate: true,
            hasPnl: true,
          },
        ],
      }).map(item => item.key),
    ).toEqual(['doge', 'btc']);
  });
});

describe('buildAssetPreviewRowItemsFromWallets', () => {
  const makeWallet = (args: {
    id: string;
    coin: string;
    chain?: string;
    currencyName?: string;
    fiat: number;
    crypto: string;
    tokenAddress?: string;
  }): Wallet =>
    ({
      id: args.id,
      currencyAbbreviation: args.coin,
      chain: args.chain || args.coin,
      currencyName: args.currencyName,
      tokenAddress: args.tokenAddress,
      network: 'livenet',
      balance: {
        fiat: args.fiat,
        crypto: args.crypto,
      },
    } as Wallet);

  it('reuses an externally supplied asset order while aggregating live balances', () => {
    const rows = buildAssetPreviewRowItemsFromWallets({
      wallets: [
        makeWallet({
          id: 'btc-1',
          coin: 'btc',
          currencyName: 'Bitcoin',
          fiat: 100,
          crypto: '1',
        }),
        makeWallet({
          id: 'doge-1',
          coin: 'doge',
          currencyName: 'Dogecoin',
          fiat: 200,
          crypto: '10',
        }),
        makeWallet({
          id: 'btc-2',
          coin: 'btc',
          currencyName: 'Bitcoin',
          fiat: 50,
          crypto: '0.25',
        }),
      ],
      quoteCurrency: 'USD',
      orderedAssetKeys: ['doge', 'btc'],
      showScopedPnlLoading: true,
    });

    expect(rows.map(row => row.key)).toEqual(['doge', 'btc']);
    expect(rows).toEqual([
      expect.objectContaining({
        key: 'doge',
        cryptoAmount: '10',
        hasRate: true,
        hasPnl: false,
        showScopedPnlLoading: true,
      }),
      expect.objectContaining({
        key: 'btc',
        cryptoAmount: '1.25',
        hasRate: true,
        hasPnl: false,
        showScopedPnlLoading: true,
      }),
    ]);
  });

  it('prefers a native wallet as the representative row identity for collapsed assets', () => {
    const rows = buildAssetPreviewRowItemsFromWallets({
      wallets: [
        makeWallet({
          id: 'eth-base',
          coin: 'eth',
          chain: 'base',
          currencyName: 'Ethereum on Base',
          fiat: 25,
          crypto: '0.1',
        }),
        makeWallet({
          id: 'eth-native',
          coin: 'eth',
          chain: 'eth',
          currencyName: 'Ethereum',
          fiat: 75,
          crypto: '0.2',
        }),
      ],
      quoteCurrency: 'USD',
    });

    expect(rows).toEqual([
      expect.objectContaining({
        key: 'eth',
        chain: 'eth',
        tokenAddress: undefined,
        name: 'ETH',
        cryptoAmount: '0.3',
      }),
    ]);
  });
});

describe('getWalletLiveFiatBalance', () => {
  it('uses the portfolio live balance basis instead of raw balance.sat', () => {
    const wallet = {
      id: 'btc-wallet',
      currencyAbbreviation: 'btc',
      chain: 'btc',
      network: 'livenet',
      balance: {
        sat: 100000000,
        satConfirmed: 100000000,
        satPending: 50000000,
        crypto: '1.5',
      },
    } as Wallet;

    const fiatBalance = getWalletLiveFiatBalance({
      wallet,
      quoteCurrency: 'USD',
      rates: {
        btc: [{code: 'USD', rate: 100}],
      } as any,
    });

    expect(fiatBalance).toBe(150);
  });

  it('derives non-USD live fiat balances from canonical USD rates plus the BTC bridge', () => {
    const wallet = {
      id: 'eth-wallet',
      currencyAbbreviation: 'eth',
      chain: 'eth',
      network: 'livenet',
      balance: {
        sat: 0,
        satConfirmed: 0,
        satPending: 0,
        crypto: '2',
      },
    } as Wallet;

    const fiatBalance = getWalletLiveFiatBalance({
      wallet,
      quoteCurrency: 'EUR',
      rates: {
        eth: [{code: 'USD', rate: 2000}],
        btc: [
          {code: 'USD', rate: 40000},
          {code: 'EUR', rate: 36000},
        ],
      } as any,
    });

    expect(fiatBalance).toBeCloseTo(3600, 8);
  });
});

describe('getWalletsMatchingExchangeRateAsset', () => {
  const makeWallet = (args: {
    id: string;
    coin: string;
    chain?: string;
    tokenAddress?: string;
    sat?: number;
    network?: string;
  }): Wallet =>
    ({
      id: args.id,
      currencyAbbreviation: args.coin,
      chain: args.chain || args.coin,
      tokenAddress: args.tokenAddress,
      network: args.network || 'livenet',
      balance: {
        sat: args.sat ?? 0,
        satConfirmed: args.sat ?? 0,
        satPending: 0,
        crypto: String((args.sat ?? 0) / 100000000),
      },
    } as Wallet);

  it('excludes zero-balance wallets by default', () => {
    const wallets = [
      makeWallet({id: 'btc-funded', coin: 'btc', sat: 1000}),
      makeWallet({id: 'btc-empty', coin: 'btc', sat: 0}),
    ];

    expect(
      getWalletsMatchingExchangeRateAsset({
        wallets,
        currencyAbbreviation: 'btc',
      }).map(wallet => wallet.id),
    ).toEqual(['btc-funded']);
  });

  it('can include zero-balance wallets for historical asset scope', () => {
    const wallets = [
      makeWallet({id: 'btc-funded', coin: 'btc', sat: 1000}),
      makeWallet({id: 'btc-empty', coin: 'btc', sat: 0}),
      makeWallet({id: 'eth-funded', coin: 'eth', sat: 2000}),
    ];

    expect(
      getWalletsMatchingExchangeRateAsset({
        wallets,
        currencyAbbreviation: 'btc',
        includeZeroBalance: true,
      }).map(wallet => wallet.id),
    ).toEqual(['btc-funded', 'btc-empty']);
  });
});

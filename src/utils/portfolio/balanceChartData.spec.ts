jest.mock('./assets', () => ({
  getPortfolioWalletChainLower: jest.fn(() => 'btc'),
  getPortfolioWalletTokenAddress: jest.fn(() => undefined),
}));

jest.mock('./displayCurrency', () => ({
  getAssetCurrentDisplayQuoteRate: jest.fn(() => undefined),
}));

import {
  buildBalanceChartHistoricalRateRequests,
  buildHydratedSeriesFromBalanceChartViewModel,
  getBalanceChartHistoricalRateCacheKeys,
  getBalanceChartHistoricalRateCacheKeysFromRequestGroups,
} from './balanceChartData';

const makeStoredWallet = (args: {
  walletId: string;
  coin: string;
  chain?: string;
  tokenAddress?: string;
}) =>
  ({
    summary: {
      walletId: args.walletId,
      currencyAbbreviation: args.coin,
      chain: args.chain || args.coin,
      tokenAddress: args.tokenAddress,
    },
  } as any);

describe('balanceChartData historical rate deps', () => {
  it('requests canonical USD asset histories plus only the BTC bridge for non-USD display quotes', () => {
    const wallets = [
      makeStoredWallet({walletId: 'w-btc', coin: 'btc'}),
      makeStoredWallet({
        walletId: 'w-usdc',
        coin: 'usdc',
        chain: 'eth',
        tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      }),
    ];

    expect(
      buildBalanceChartHistoricalRateRequests({
        wallets,
        quoteCurrency: 'EUR',
        timeframes: ['1D', '1M'],
      }),
    ).toEqual([
      {
        quoteCurrency: 'EUR',
        requests: [
          {
            coin: 'btc',
            intervals: ['1D', '1M'],
          },
        ],
      },
      {
        quoteCurrency: 'USD',
        requests: [
          {
            coin: 'btc',
            intervals: ['1D', '1M'],
          },
          {
            coin: 'usdc',
            chain: 'eth',
            tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            intervals: ['1D', '1M'],
          },
        ],
      },
    ]);
  });

  it('uses only canonical USD asset histories when the display quote is USD', () => {
    const wallets = [makeStoredWallet({walletId: 'w-eth', coin: 'eth'})];

    expect(
      buildBalanceChartHistoricalRateRequests({
        wallets,
        quoteCurrency: 'USD',
        timeframes: ['1D'],
      }),
    ).toEqual([
      {
        quoteCurrency: 'USD',
        requests: [
          {
            coin: 'eth',
            intervals: ['1D'],
          },
        ],
      },
    ]);
  });

  it('requests 1D alongside ALL so all-time charts can use intraday rates', () => {
    const wallets = [makeStoredWallet({walletId: 'w-btc', coin: 'btc'})];

    expect(
      buildBalanceChartHistoricalRateRequests({
        wallets,
        quoteCurrency: 'USD',
        timeframes: ['ALL'],
      }),
    ).toEqual([
      {
        quoteCurrency: 'USD',
        requests: [
          {
            coin: 'btc',
            intervals: ['1D', 'ALL'],
          },
        ],
      },
    ]);
  });

  it('builds cache keys from the canonical-plus-bridge dependency set', () => {
    const wallets = [
      makeStoredWallet({walletId: 'w-eth', coin: 'eth'}),
      makeStoredWallet({
        walletId: 'w-usdc',
        coin: 'usdc',
        chain: 'eth',
        tokenAddress: '0xABCDef',
      }),
    ];

    expect(
      getBalanceChartHistoricalRateCacheKeys({
        wallets,
        quoteCurrency: 'EUR',
        timeframes: ['1D'],
      }),
    ).toEqual([
      'EUR:btc:1D',
      'USD:btc:1D',
      'USD:eth:1D',
      'USD:usdc:1D:eth:0xabcdef',
    ]);
  });

  it('builds all-time cache keys for both 1D and ALL intervals', () => {
    const wallets = [makeStoredWallet({walletId: 'w-eth', coin: 'eth'})];

    expect(
      getBalanceChartHistoricalRateCacheKeys({
        wallets,
        quoteCurrency: 'USD',
        timeframes: ['ALL'],
      }),
    ).toEqual(['USD:eth:1D', 'USD:eth:ALL']);
  });

  it('builds cache keys from precomputed request groups', () => {
    expect(
      getBalanceChartHistoricalRateCacheKeysFromRequestGroups([
        {
          quoteCurrency: 'USD',
          requests: [
            {
              coin: 'btc',
              intervals: ['ALL', '1D'],
            },
          ],
        },
        {
          quoteCurrency: 'EUR',
          requests: [
            {
              coin: 'usdc',
              chain: 'eth',
              tokenAddress: '0xABCDef',
              intervals: ['1D'],
            },
          ],
        },
      ]),
    ).toEqual(['EUR:usdc:1D:eth:0xabcdef', 'USD:btc:1D', 'USD:btc:ALL']);
  });
});

describe('balanceChartData view model hydration', () => {
  it('coerces bridge DTO numeric strings before building graph points', () => {
    const hydrated = buildHydratedSeriesFromBalanceChartViewModel({
      timeframe: '1D',
      quoteCurrency: 'USD',
      walletIds: ['wallet-1'],
      dataRevisionSig: 'revision-1',
      balanceOffset: 0,
      graphPoints: [
        {ts: '1000', value: '100'},
        {ts: '2000', value: '105'},
      ],
      analysisPoints: [
        {
          timestamp: '1000',
          totalFiatBalance: '100',
          totalRemainingCostBasisFiat: '80',
          totalUnrealizedPnlFiat: '20',
          totalPnlChange: '10',
          totalPnlPercent: '10',
        },
        {
          timestamp: '2000',
          totalFiatBalance: '105',
          totalRemainingCostBasisFiat: '80',
          totalUnrealizedPnlFiat: '25',
          totalPnlChange: '15',
          totalPnlPercent: '15',
        },
      ],
      minMax: {
        minIndex: '0',
        maxIndex: '1',
        minPoint: {ts: '1000', value: '100'},
        maxPoint: {ts: '2000', value: '105'},
      },
    } as any);

    expect(hydrated?.graphPoints[0].date.getTime()).toBe(1000);
    expect(hydrated?.graphPoints[0].value).toBe(100);
    expect(typeof hydrated?.graphPoints[0].value).toBe('number');
    expect(hydrated?.analysisPoints[0].totalFiatBalance).toBe(100);
    expect(typeof hydrated?.analysisPoints[0].totalFiatBalance).toBe('number');
    expect(hydrated?.minIndex).toBe(0);
    expect(hydrated?.maxIndex).toBe(1);
    expect(hydrated?.minPoint).toBe(hydrated?.graphPoints[0]);
    expect(hydrated?.maxPoint).toBe(hydrated?.graphPoints[1]);
  });

  it('uses render timestamps for selection mapping while keeping analysis timestamps intact', () => {
    const viewModel = {
      timeframe: '1D',
      quoteCurrency: 'USD',
      walletIds: ['wallet-1'],
      dataRevisionSig: 'revision-1',
      balanceOffset: 0,
      graphPoints: [
        {ts: 1000, value: 100},
        {ts: 1000, value: 110},
        {ts: 900, value: 120},
      ],
      analysisPoints: [
        {
          timestamp: 1000,
          totalFiatBalance: 100,
          totalRemainingCostBasisFiat: 90,
          totalUnrealizedPnlFiat: 10,
          totalPnlChange: 0,
          totalPnlPercent: 0,
        },
        {
          timestamp: 1000,
          totalFiatBalance: 110,
          totalRemainingCostBasisFiat: 95,
          totalUnrealizedPnlFiat: 15,
          totalPnlChange: 10,
          totalPnlPercent: 10,
        },
        {
          timestamp: 900,
          totalFiatBalance: 120,
          totalRemainingCostBasisFiat: 100,
          totalUnrealizedPnlFiat: 20,
          totalPnlChange: 20,
          totalPnlPercent: 20,
        },
      ],
    };

    const hydrated = buildHydratedSeriesFromBalanceChartViewModel(
      viewModel as any,
    );

    expect(hydrated?.graphPoints.map(point => point.date.getTime())).toEqual([
      1000, 1001, 1002,
    ]);
    expect(hydrated?.analysisPoints.map(point => point.timestamp)).toEqual([
      1000, 1000, 900,
    ]);
    expect(hydrated?.pointByTimestamp.get(1001)?.timestamp).toBe(1000);
    expect(hydrated?.pointByTimestamp.get(1002)?.timestamp).toBe(900);
  });
});

import {
  LEGACY_ETH_MATIC_TOKEN_ADDRESS,
  buildFiatRateCacheRequestKey,
  getFiatRateAssetRef,
  getFiatRateRuntimeStorageKey,
  getFiatRateSeriesAssetKey,
  getFiatRateSeriesReduxCacheKey,
  getFiatRateSeriesRuntimeCacheKey,
  normalizeFiatRateCacheRequests,
  normalizeFiatRateSeriesCoin,
  normalizeFiatRateSeriesTokenAddress,
} from './fiatRateIdentity';

describe('fiatRateIdentity', () => {
  it('normalizes wrapped and migrated coin symbols', () => {
    expect(normalizeFiatRateSeriesCoin('wbtc')).toBe('btc');
    expect(normalizeFiatRateSeriesCoin('WBTC')).toBe('btc');
    expect(normalizeFiatRateSeriesCoin('weth')).toBe('eth');
    expect(normalizeFiatRateSeriesCoin('WETH')).toBe('eth');
    expect(normalizeFiatRateSeriesCoin('matic')).toBe('pol');
    expect(normalizeFiatRateSeriesCoin('POL')).toBe('pol');
  });

  it('normalizes legacy Ethereum MATIC token identity to native POL', () => {
    expect(
      getFiatRateAssetRef({
        currencyAbbreviation: 'MATIC',
        chain: 'ETH',
        tokenAddress: LEGACY_ETH_MATIC_TOKEN_ADDRESS.toUpperCase(),
      }),
    ).toEqual({coin: 'pol'});

    expect(
      getFiatRateSeriesRuntimeCacheKey('USD', 'matic', '1D', {
        chain: 'eth',
        tokenAddress: LEGACY_ETH_MATIC_TOKEN_ADDRESS,
      }),
    ).toBe('USD:pol:1D');
  });

  it('lowercases EVM token addresses and preserves Solana token address case', () => {
    expect(normalizeFiatRateSeriesTokenAddress('eth', '0xABCDef')).toBe(
      '0xabcdef',
    );

    const solanaAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    expect(normalizeFiatRateSeriesTokenAddress('sol', solanaAddress)).toBe(
      solanaAddress,
    );
  });

  it('keeps runtime cache keys and legacy Redux cache keys explicit', () => {
    const identity = {
      chain: 'ARB',
      tokenAddress: '0xFd086bC7CD5C481DCC9c85EBE478A1C0b69FCbb9',
    };

    expect(
      getFiatRateSeriesRuntimeCacheKey('usd', 'USDT', '1D', identity),
    ).toBe('USD:usdt:1D:arb:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9');
    expect(getFiatRateSeriesReduxCacheKey('usd', 'USDT', '1D', identity)).toBe(
      'USD:usdt|arb|0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9:1D',
    );
    expect(
      getFiatRateRuntimeStorageKey({
        quoteCurrency: 'usd',
        coin: 'btc',
        interval: 'ALL',
      }),
    ).toBe('rate:v1:USD:btc:ALL');
  });

  it('builds stable asset and request de-dupe keys from normalized identity', () => {
    expect(
      getFiatRateSeriesAssetKey('USDC', {
        chain: 'ETH',
        tokenAddress: '0xABCDef',
      }),
    ).toBe('usdc|eth|0xabcdef');

    expect(
      normalizeFiatRateCacheRequests([
        {
          coin: ' WBTC ',
          chain: 'eth',
          intervals: ['1W', '1D', '1D'],
        },
        {
          coin: 'btc',
          intervals: ['1M'],
        },
      ]),
    ).toEqual([
      {
        coin: 'btc',
        intervals: ['1D', '1M', '1W'],
      },
    ]);

    expect(
      buildFiatRateCacheRequestKey({
        quoteCurrency: 'eur',
        maxAgeMs: 1000,
        requests: [
          {
            coin: 'weth',
            intervals: ['ALL'],
          },
        ],
      }),
    ).toBe('EUR|1000|eth|||ALL');
  });
});

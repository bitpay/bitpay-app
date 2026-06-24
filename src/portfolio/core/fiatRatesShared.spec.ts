import {
  DEFAULT_STORED_FIAT_RATE_INTERVALS,
  getFiatRateSeriesCacheKey,
  getFiatRateSeriesUrl,
  normalizeFiatRateSeriesTokenAddress,
  resolveStoredFiatRateInterval,
} from './fiatRatesShared';

describe('fiatRatesShared interval storage policy', () => {
  it('stores only the distinct persisted intervals by default', () => {
    expect(DEFAULT_STORED_FIAT_RATE_INTERVALS).toEqual([
      '1D',
      '1W',
      '1M',
      'ALL',
    ]);
  });

  it('maps long-range chart intervals to ALL storage', () => {
    expect(resolveStoredFiatRateInterval('1D')).toBe('1D');
    expect(resolveStoredFiatRateInterval('1W')).toBe('1W');
    expect(resolveStoredFiatRateInterval('1M')).toBe('1M');
    expect(resolveStoredFiatRateInterval('3M')).toBe('ALL');
    expect(resolveStoredFiatRateInterval('1Y')).toBe('ALL');
    expect(resolveStoredFiatRateInterval('5Y')).toBe('ALL');
    expect(resolveStoredFiatRateInterval('ALL')).toBe('ALL');
  });

  it('adds chain and tokenAddress for token rate URLs and cache keys', () => {
    expect(
      getFiatRateSeriesUrl(
        {baseUrl: 'https://bws.bitpay.com/bws/api'},
        'USD',
        '1D',
        {
          chain: 'arb',
          tokenAddress: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
        },
      ),
    ).toBe(
      'https://bws.bitpay.com/bws/api/v4/fiatrates/USD?days=1&chain=arb&tokenAddress=0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    );

    expect(
      getFiatRateSeriesCacheKey('USD', 'usdt', '1D', {
        chain: 'arb',
        tokenAddress: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
      }),
    ).toBe('USD:usdt:1D:arb:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9');
  });

  it('normalizes wrapped coins in runtime cache keys', () => {
    expect(getFiatRateSeriesCacheKey('USD', 'WBTC', '1D')).toBe('USD:btc:1D');
    expect(getFiatRateSeriesCacheKey('USD', 'WETH', '1D')).toBe('USD:eth:1D');
  });

  it('omits chain params for native-coin rate URLs even when a wallet chain is present', () => {
    expect(
      getFiatRateSeriesUrl(
        {baseUrl: 'https://bws.bitpay.com/bws/api'},
        'USD',
        '1W',
        {
          chain: 'bch',
        },
      ),
    ).toBe('https://bws.bitpay.com/bws/api/v4/fiatrates/USD?days=7');

    expect(getFiatRateSeriesCacheKey('USD', 'bch', '1W', {chain: 'bch'})).toBe(
      'USD:bch:1W',
    );
  });

  it('preserves Solana token address case for URLs and cache keys', () => {
    const tokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    expect(
      getFiatRateSeriesUrl(
        {baseUrl: 'https://bws.bitpay.com/bws/api'},
        'USD',
        '1D',
        {
          chain: 'sol',
          tokenAddress,
        },
      ),
    ).toBe(
      `https://bws.bitpay.com/bws/api/v4/fiatrates/USD?days=1&chain=sol&tokenAddress=${tokenAddress}`,
    );

    expect(
      getFiatRateSeriesCacheKey('USD', 'usdc', '1D', {
        chain: 'sol',
        tokenAddress,
      }),
    ).toBe(`USD:usdc:1D:sol:${tokenAddress}`);

    expect(normalizeFiatRateSeriesTokenAddress('sol', tokenAddress)).toBe(
      tokenAddress,
    );
  });
});

import {
  CANONICAL_FIAT_QUOTE,
  getFiatRateSeriesCacheKey,
  type FiatRateSeries,
} from '../fiatRatesShared';
import {
  getFiatRateSeriesFromCacheWithFx,
  getFiatRateSeriesWithFx,
} from './fxRates';

const getSeriesMap = () => {
  const seriesByKey: Record<string, FiatRateSeries> = {
    [getFiatRateSeriesCacheKey(CANONICAL_FIAT_QUOTE, 'eth', '1D')]: {
      fetchedOn: 10,
      points: [
        {ts: 1, rate: 2000},
        {ts: 2, rate: 2100},
        {ts: 3, rate: 2200},
      ],
    },
    [getFiatRateSeriesCacheKey(CANONICAL_FIAT_QUOTE, 'btc', '1D')]: {
      fetchedOn: 10,
      points: [
        {ts: 1, rate: 40000},
        {ts: 2, rate: 41000},
        {ts: 3, rate: 42000},
      ],
    },
    [getFiatRateSeriesCacheKey('EUR', 'btc', '1D')]: {
      fetchedOn: 10,
      points: [
        {ts: 1, rate: 36000},
        {ts: 2, rate: 36900},
        {ts: 3, rate: 37800},
      ],
    },
    // Stale/sparse direct target-quote asset history that must be ignored for
    // portfolio bridge projections.
    [getFiatRateSeriesCacheKey('EUR', 'eth', '1D')]: {
      fetchedOn: 1,
      points: [
        {ts: 1, rate: 1700},
        {ts: 2, rate: 1710},
      ],
    },
  };

  return seriesByKey;
};

describe('fxRates', () => {
  it('uses direct canonical series for canonical quotes', async () => {
    const seriesByKey = getSeriesMap();

    await expect(
      getFiatRateSeriesWithFx({
        getSeries: async args =>
          seriesByKey[
            getFiatRateSeriesCacheKey(
              args.quoteCurrency,
              args.coin,
              args.interval,
              {
                chain: args.chain,
                tokenAddress: args.tokenAddress,
              },
            )
          ] || null,
        quoteCurrency: 'USD',
        coin: 'eth',
        interval: '1D',
      }),
    ).resolves.toEqual(
      seriesByKey[getFiatRateSeriesCacheKey('USD', 'eth', '1D')],
    );
  });

  it('ignores stored direct non-canonical asset series and derives via the BTC bridge', async () => {
    const seriesByKey = getSeriesMap();

    const asyncSeries = await getFiatRateSeriesWithFx({
      getSeries: async args =>
        seriesByKey[
          getFiatRateSeriesCacheKey(
            args.quoteCurrency,
            args.coin,
            args.interval,
            {
              chain: args.chain,
              tokenAddress: args.tokenAddress,
            },
          )
        ] || null,
      quoteCurrency: 'EUR',
      coin: 'eth',
      interval: '1D',
    });

    const cachedSeries = getFiatRateSeriesFromCacheWithFx({
      fiatRateSeriesCache: seriesByKey,
      quoteCurrency: 'EUR',
      coin: 'eth',
      interval: '1D',
    });

    expect(asyncSeries?.points).toEqual([
      {ts: 1, rate: 1800},
      {ts: 2, rate: 1890},
      {ts: 3, rate: 1980},
    ]);
    expect(cachedSeries?.points).toEqual([
      {ts: 1, rate: 1800},
      {ts: 2, rate: 1890},
      {ts: 3, rate: 1980},
    ]);
  });
});

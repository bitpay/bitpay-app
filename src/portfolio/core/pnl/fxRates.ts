import type {
  FiatRateInterval,
  FiatRatePoint,
  FiatRateSeries,
  FiatRateSeriesCache,
} from '../fiatRatesShared';
import {
  CANONICAL_FIAT_QUOTE,
  FX_BRIDGE_COIN,
  getFiatRateSeriesCacheKey,
  resolveStoredFiatRateInterval,
} from '../fiatRatesShared';
import {normalizeFiatRateSeriesCoin} from '../fiatRateIdentity';
import {makeNearestFinder} from './fiatRateLookupCore';

type SeriesGetter = (args: {
  quoteCurrency: string;
  coin: string;
  interval: FiatRateInterval;
  chain?: string;
  tokenAddress?: string;
}) => Promise<FiatRateSeries | null>;

function normalizePoints(
  pointsRaw: FiatRatePoint[] | undefined,
): FiatRatePoint[] {
  'worklet';

  if (!Array.isArray(pointsRaw) || !pointsRaw.length) return [];
  return pointsRaw
    .map(p => ({ts: Number(p.ts), rate: Number(p.rate)}))
    .filter(p => Number.isFinite(p.ts) && Number.isFinite(p.rate))
    .sort((a, b) => a.ts - b.ts);
}

function makeNearestRateGetter(
  pointsRaw: FiatRatePoint[],
): (ts: number) => number | undefined {
  'worklet';

  const points = normalizePoints(pointsRaw);
  const nearest = makeNearestFinder(points);

  return (targetTs: number) => {
    'worklet';

    return nearest(targetTs)?.rate;
  };
}

function getSeriesFromCache(args: {
  fiatRateSeriesCache: FiatRateSeriesCache;
  quoteCurrency: string;
  coin: string;
  interval: FiatRateInterval;
  chain?: string;
  tokenAddress?: string;
}): FiatRateSeries | null {
  'worklet';

  const key = getFiatRateSeriesCacheKey(
    args.quoteCurrency,
    args.coin,
    args.interval,
    {
      chain: args.chain,
      tokenAddress: args.tokenAddress,
    },
  );
  const series = args.fiatRateSeriesCache?.[key];
  return series?.points?.length ? series : null;
}

function deriveTargetSeries(args: {
  quoteCurrency: string;
  interval: FiatRateInterval;
  canonicalQuote?: string;
  baseCoinSeries: FiatRateSeries;
  bridgeTargetSeries: FiatRateSeries;
  bridgeCanonicalSeries: FiatRateSeries;
}): FiatRateSeries | null {
  'worklet';

  const quoteCurrency = String(args.quoteCurrency || '').toUpperCase();
  const canonicalQuote = String(
    args.canonicalQuote || CANONICAL_FIAT_QUOTE,
  ).toUpperCase();

  if (quoteCurrency === canonicalQuote) {
    return {
      fetchedOn:
        Number(args.baseCoinSeries.fetchedOn ?? Date.now()) || Date.now(),
      points: normalizePoints(args.baseCoinSeries.points),
    };
  }

  const basePoints = normalizePoints(args.baseCoinSeries.points);
  const bridgeTargetPoints = normalizePoints(args.bridgeTargetSeries.points);
  const bridgeCanonicalPoints = normalizePoints(
    args.bridgeCanonicalSeries.points,
  );
  if (
    !basePoints.length ||
    !bridgeTargetPoints.length ||
    !bridgeCanonicalPoints.length
  )
    return null;

  const bridgeTargetRateAt = makeNearestRateGetter(bridgeTargetPoints);
  const bridgeCanonicalRateAt = makeNearestRateGetter(bridgeCanonicalPoints);

  const derivedPoints: FiatRatePoint[] = [];
  for (const p of basePoints) {
    const bridgeTargetRate = bridgeTargetRateAt(p.ts);
    const bridgeCanonicalRate = bridgeCanonicalRateAt(p.ts);
    if (
      !Number.isFinite(bridgeTargetRate) ||
      !Number.isFinite(bridgeCanonicalRate) ||
      (bridgeCanonicalRate as number) <= 0
    ) {
      continue;
    }

    const rate =
      (p.rate * (bridgeTargetRate as number)) / (bridgeCanonicalRate as number);
    if (!Number.isFinite(rate)) continue;
    derivedPoints.push({ts: p.ts, rate});
  }

  if (!derivedPoints.length) return null;

  return {
    fetchedOn: Math.max(
      Number(args.baseCoinSeries.fetchedOn ?? 0) || 0,
      Number(args.bridgeTargetSeries.fetchedOn ?? 0) || 0,
      Number(args.bridgeCanonicalSeries.fetchedOn ?? 0) || 0,
    ),
    points: derivedPoints,
  };
}

export async function getFiatRateSeriesWithFx(args: {
  getSeries: SeriesGetter;
  quoteCurrency: string;
  coin: string;
  interval: FiatRateInterval;
  chain?: string;
  tokenAddress?: string;
  canonicalQuote?: string;
  bridgeCoin?: string;
  preferDirectTargetSeries?: boolean;
}): Promise<FiatRateSeries | null> {
  'worklet';

  const quoteCurrency = String(args.quoteCurrency || '').toUpperCase();
  const canonicalQuote = String(
    args.canonicalQuote || CANONICAL_FIAT_QUOTE,
  ).toUpperCase();
  const coin = normalizeFiatRateSeriesCoin(args.coin);
  const bridgeCoin = normalizeFiatRateSeriesCoin(
    args.bridgeCoin || FX_BRIDGE_COIN,
  );
  const storedInterval = resolveStoredFiatRateInterval(args.interval);

  const shouldReadDirectTargetSeries =
    quoteCurrency === canonicalQuote || args.preferDirectTargetSeries === true;

  if (shouldReadDirectTargetSeries) {
    const direct = await args.getSeries({
      quoteCurrency,
      coin,
      interval: storedInterval,
      chain: args.chain,
      tokenAddress: args.tokenAddress,
    });
    if (direct?.points?.length) {
      return direct;
    }
  }

  if (quoteCurrency === canonicalQuote) return null;

  const [baseCoinSeries, bridgeTargetSeries, bridgeCanonicalSeries] =
    await Promise.all([
      args.getSeries({
        quoteCurrency: canonicalQuote,
        coin,
        interval: storedInterval,
        chain: args.chain,
        tokenAddress: args.tokenAddress,
      }),
      args.getSeries({
        quoteCurrency,
        coin: bridgeCoin,
        interval: storedInterval,
      }),
      args.getSeries({
        quoteCurrency: canonicalQuote,
        coin: bridgeCoin,
        interval: storedInterval,
      }),
    ]);

  if (!baseCoinSeries || !bridgeTargetSeries || !bridgeCanonicalSeries)
    return null;

  return deriveTargetSeries({
    quoteCurrency,
    interval: storedInterval,
    canonicalQuote,
    baseCoinSeries,
    bridgeTargetSeries,
    bridgeCanonicalSeries,
  });
}

export function getFiatRateSeriesFromCacheWithFx(args: {
  fiatRateSeriesCache: FiatRateSeriesCache;
  quoteCurrency: string;
  coin: string;
  interval: FiatRateInterval;
  chain?: string;
  tokenAddress?: string;
  canonicalQuote?: string;
  bridgeCoin?: string;
  preferDirectTargetSeries?: boolean;
}): FiatRateSeries | null {
  'worklet';

  const quoteCurrency = String(args.quoteCurrency || '').toUpperCase();
  const canonicalQuote = String(
    args.canonicalQuote || CANONICAL_FIAT_QUOTE,
  ).toUpperCase();
  const coin = normalizeFiatRateSeriesCoin(args.coin);
  const bridgeCoin = normalizeFiatRateSeriesCoin(
    args.bridgeCoin || FX_BRIDGE_COIN,
  );
  const storedInterval = resolveStoredFiatRateInterval(args.interval);

  const shouldReadDirectTargetSeries =
    quoteCurrency === canonicalQuote || args.preferDirectTargetSeries === true;

  if (shouldReadDirectTargetSeries) {
    const direct = getSeriesFromCache({
      fiatRateSeriesCache: args.fiatRateSeriesCache,
      quoteCurrency,
      coin,
      interval: storedInterval,
      chain: args.chain,
      tokenAddress: args.tokenAddress,
    });
    if (direct?.points?.length) {
      return direct;
    }
  }

  if (quoteCurrency === canonicalQuote) return null;

  const baseCoinSeries = getSeriesFromCache({
    fiatRateSeriesCache: args.fiatRateSeriesCache,
    quoteCurrency: canonicalQuote,
    coin,
    interval: storedInterval,
    chain: args.chain,
    tokenAddress: args.tokenAddress,
  });
  const bridgeTargetSeries = getSeriesFromCache({
    fiatRateSeriesCache: args.fiatRateSeriesCache,
    quoteCurrency,
    coin: bridgeCoin,
    interval: storedInterval,
  });
  const bridgeCanonicalSeries = getSeriesFromCache({
    fiatRateSeriesCache: args.fiatRateSeriesCache,
    quoteCurrency: canonicalQuote,
    coin: bridgeCoin,
    interval: storedInterval,
  });

  if (!baseCoinSeries || !bridgeTargetSeries || !bridgeCanonicalSeries)
    return null;

  return deriveTargetSeries({
    quoteCurrency,
    interval: storedInterval,
    canonicalQuote,
    baseCoinSeries,
    bridgeTargetSeries,
    bridgeCanonicalSeries,
  });
}

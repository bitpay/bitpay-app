import type {
  FiatRateSeriesAssetIdentity,
  FiatRateInterval,
  FiatRateSeriesCache,
} from '../../store/rate/rate.models';
import {getFiatRateSeriesCacheKey} from '../../store/rate/rate.models';
import {getSeriesIntervalForFiatTimeframe} from './fiatTimeframes';

export const getRelevantFiatRateSeriesCacheKeys = (args: {
  fiatCode: string;
  coins?: string[];
  assets?: FiatRateSeriesAssetIdentity[];
  timeframes: FiatRateInterval[];
}): string[] => {
  const keys = new Set<string>();

  const assets =
    args.assets ||
    (args.coins || []).map(coin => ({
      coin,
    }));

  for (const asset of assets) {
    const coin = typeof asset?.coin === 'string' ? asset.coin : '';
    if (!coin.trim()) {
      continue;
    }

    for (const timeframe of args.timeframes || []) {
      keys.add(
        getFiatRateSeriesCacheKey(
          args.fiatCode,
          coin,
          getSeriesIntervalForFiatTimeframe(timeframe),
          {
            chain: asset?.chain,
            tokenAddress: asset?.tokenAddress,
          },
        ),
      );
    }
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b));
};

export const computeFiatRateSeriesCacheRevision = (args: {
  fiatRateSeriesCache?: FiatRateSeriesCache;
  relevantKeys: string[];
}): string => {
  let keysPresentCount = 0;
  let maxFetchedOn = 0;
  const cache = args.fiatRateSeriesCache;
  const relevantKeys = Array.from(new Set(args.relevantKeys || [])).sort(
    (a, b) => a.localeCompare(b),
  );
  const fetchedOnSignatureParts: string[] = [];

  for (const key of relevantKeys) {
    if (!Object.prototype.hasOwnProperty.call(cache || {}, key)) {
      fetchedOnSignatureParts.push(`${key}:missing`);
      continue;
    }

    keysPresentCount += 1;

    const entry = cache?.[key];
    const fetchedOn = entry?.fetchedOn;
    const fetchedOnSig =
      typeof fetchedOn === 'number' && Number.isFinite(fetchedOn)
        ? fetchedOn
        : 'na';
    const points = Array.isArray(entry?.points) ? entry.points : undefined;
    const lastPointTs = points?.length
      ? Number(points[points.length - 1]?.ts)
      : NaN;
    const lastTsSig = Number.isFinite(lastPointTs) ? lastPointTs : 'na';
    fetchedOnSignatureParts.push(`${key}:${fetchedOnSig}:${lastTsSig}`);

    if (typeof fetchedOn === 'number' && Number.isFinite(fetchedOn)) {
      maxFetchedOn = Math.max(maxFetchedOn, fetchedOn);
    }
  }

  return [
    `${keysPresentCount}:${maxFetchedOn}`,
    fetchedOnSignatureParts.join('|'),
  ].join(':');
};

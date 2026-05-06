import {
  getFiatRateSeriesRuntimeCacheKey,
  parseFiatRateSeriesCacheKey as parseFiatRateSeriesCacheKeyCore,
} from '../../../portfolio/core/fiatRateIdentity';
import type {FiatRateSeriesReaderIdentity as CoreFiatRateSeriesReaderIdentity} from '../../../portfolio/core/fiatRateIdentity';

export type CachedFiatRateInterval =
  | '1D'
  | '1W'
  | '1M'
  | '3M'
  | '1Y'
  | '5Y'
  | 'ALL';
export type FiatRateInterval = CachedFiatRateInterval;

export type FiatRatePoint = {
  ts: number; // unix ms
  rate: number;
};

export type FiatRateSeries = {
  fetchedOn: number; // unix ms
  points: FiatRatePoint[];
};

export type FiatRateSeriesCache = {
  [key in string]?: FiatRateSeries;
};

export type {
  FiatRateSeriesAssetIdentity,
  FiatRateSeriesReaderIdentity,
} from '../../../portfolio/core/fiatRateIdentity';
export {
  getFiatRateSeriesAssetKey,
  getFiatRateSeriesReduxCacheKey,
  normalizeFiatRateSeriesChain,
  normalizeFiatRateSeriesCoin,
  normalizeFiatRateSeriesTokenAddress,
  parseFiatRateSeriesAssetKey,
  parseFiatRateSeriesCacheKey,
  parseFiatRateSeriesReduxCacheKey,
  parseFiatRateSeriesRuntimeCacheKey,
} from '../../../portfolio/core/fiatRateIdentity';

export const getFiatRateSeriesCacheKey = (
  fiatCode: string,
  coin: string,
  interval: FiatRateInterval,
  identity?: CoreFiatRateSeriesReaderIdentity,
): string => {
  return getFiatRateSeriesRuntimeCacheKey(fiatCode, coin, interval, identity);
};

const getFiatCodeFromSeriesCacheKey = (
  cacheKey: string,
): string | undefined => {
  return parseFiatRateSeriesCacheKeyCore(cacheKey)?.fiatCode;
};

export function upsertFiatRateSeriesCache(
  current: FiatRateSeriesCache,
  updates: FiatRateSeriesCache,
  opts?: {
    maxFiatsPersisted?: number;
  },
): FiatRateSeriesCache {
  const maxFiatsPersisted = Math.max(1, opts?.maxFiatsPersisted ?? 1);
  const merged: FiatRateSeriesCache = {...current, ...updates};
  const mergedEntries = Object.entries(merged).map(([cacheKey, series]) => ({
    cacheKey,
    fiatCode: getFiatCodeFromSeriesCacheKey(cacheKey),
    series: series as FiatRateSeries,
  }));

  // Keep only the most recently-fetched fiat(s).
  const lastFetchedByFiat: Record<string, number> = {};

  for (const {fiatCode, series} of mergedEntries) {
    if (!fiatCode) continue;
    const fetchedOn = (series as any)?.fetchedOn;
    if (typeof fetchedOn !== 'number') continue;
    const prev = lastFetchedByFiat[fiatCode];
    if (!prev || fetchedOn > prev) {
      lastFetchedByFiat[fiatCode] = fetchedOn;
    }
  }

  const keepFiats = new Set<string>();
  const fetchedByFiat = Object.entries(lastFetchedByFiat);

  if (maxFiatsPersisted === 1) {
    let mostRecentFiat: string | undefined;
    let mostRecentFetchedOn = -Infinity;

    // `fetchedByFiat` follows object insertion order, which keeps tie behavior
    // equivalent to stable sort in the previous implementation.
    for (const [fiatCode, fetchedOn] of fetchedByFiat) {
      if (fetchedOn > mostRecentFetchedOn) {
        mostRecentFiat = fiatCode;
        mostRecentFetchedOn = fetchedOn;
      }
    }

    if (mostRecentFiat) keepFiats.add(mostRecentFiat);
  } else {
    for (const [fiatCode] of fetchedByFiat
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxFiatsPersisted)) {
      keepFiats.add(fiatCode);
    }
  }

  const pruned: FiatRateSeriesCache = {};
  for (const {cacheKey, fiatCode, series} of mergedEntries) {
    if (!fiatCode || keepFiats.has(fiatCode)) {
      pruned[cacheKey] = series;
    }
  }

  return pruned;
}

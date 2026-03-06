import type {
  FiatRatePoint,
  FiatRateSeriesCache,
  FiatRateInterval,
} from '../fiatRateSeries';
import {getFiatRateSeriesCacheKey} from '../fiatRateSeries';
import {
  PREF_1D,
  PREF_1W,
  PREF_1M,
  PREF_3M,
  PREF_1Y,
  PREF_5Y,
  PREF_ALL,
} from './intervalPrefs';

export const normalizeFiatRateSeriesCoin = (
  currencyAbbreviation?: string,
): string => {
  switch ((currencyAbbreviation || '').toLowerCase()) {
    case 'matic':
    case 'pol':
      return 'pol';
    default:
      return (currencyAbbreviation || '').toLowerCase();
  }
};

type Finder = (targetTs: number) => FiatRatePoint | null;

const makeNearestFinder = (points: FiatRatePoint[]): Finder => {
  // points MUST be sorted by ts asc.
  let lastIdx = 0;
  let lastTarget = -Infinity;

  const clampIdx = (i: number) => Math.max(0, Math.min(points.length - 1, i));

  const binarySearchInsertion = (ts: number): number => {
    // first index with points[i].ts >= ts
    let lo = 0;
    let hi = points.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid].ts < ts) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  return (targetTs: number) => {
    if (!Number.isFinite(targetTs) || points.length === 0) return null;

    // Fast path for monotonic queries (we build snapshots in ascending time).
    if (targetTs >= lastTarget) {
      // Advance while next ts is <= target.
      while (
        lastIdx + 1 < points.length &&
        points[lastIdx + 1].ts <= targetTs
      ) {
        lastIdx++;
      }
    } else {
      // Fallback for non-monotonic: do a binary search.
      const ins = binarySearchInsertion(targetTs);
      lastIdx = clampIdx(ins === 0 ? 0 : ins - 1);
    }

    lastTarget = targetTs;

    const left = points[lastIdx];
    const right = lastIdx + 1 < points.length ? points[lastIdx + 1] : null;

    if (!right) return left;

    const dl = Math.abs(targetTs - left.ts);
    const dr = Math.abs(right.ts - targetTs);

    // Tie-break: prefer the earlier (left) point.
    return dr < dl ? right : left;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

const intervalPreferenceForAge = (
  ageMs: number,
): readonly FiatRateInterval[] => {
  if (!Number.isFinite(ageMs) || ageMs < 0) return PREF_1D;

  if (ageMs <= 1 * DAY_MS) return PREF_1D;
  if (ageMs <= 7 * DAY_MS) return PREF_1W;
  if (ageMs <= 30 * DAY_MS) return PREF_1M;
  if (ageMs <= 90 * DAY_MS) return PREF_3M;
  if (ageMs <= 365 * DAY_MS) return PREF_1Y;
  if (ageMs <= 1825 * DAY_MS) return PREF_5Y;
  return PREF_ALL;
};

const isSortedByTsAsc = (points: FiatRatePoint[]): boolean => {
  for (let i = 1; i < points.length; i++) {
    if (points[i].ts < points[i - 1].ts) return false;
  }
  return true;
};

export type FiatRateLookup = {
  getNearestRate: (targetTsMs: number) => number | undefined;
};

export const createFiatRateLookup = (args: {
  quoteCurrency: string;
  coin: string;
  cache: FiatRateSeriesCache;
  nowMs: number;
  bridgeQuoteCurrency?: string;
}): FiatRateLookup => {
  const {quoteCurrency, coin, cache, nowMs, bridgeQuoteCurrency} = args;

  const keyByInterval: Record<FiatRateInterval, string> = {
    '1D': getFiatRateSeriesCacheKey(quoteCurrency, coin, '1D'),
    '1W': getFiatRateSeriesCacheKey(quoteCurrency, coin, '1W'),
    '1M': getFiatRateSeriesCacheKey(quoteCurrency, coin, '1M'),
    '3M': getFiatRateSeriesCacheKey(quoteCurrency, coin, '3M'),
    '1Y': getFiatRateSeriesCacheKey(quoteCurrency, coin, '1Y'),
    '5Y': getFiatRateSeriesCacheKey(quoteCurrency, coin, '5Y'),
    ALL: getFiatRateSeriesCacheKey(quoteCurrency, coin, 'ALL'),
  };
  const findersByInterval = new Map<FiatRateInterval, Finder>();

  const getFinderForInterval = (interval: FiatRateInterval): Finder | null => {
    const existing = findersByInterval.get(interval);
    if (existing) return existing;

    const series = cache[keyByInterval[interval]];
    const points = (series as any)?.points as FiatRatePoint[] | undefined;
    if (!Array.isArray(points) || points.length === 0) return null;

    // The cache builder already sorts points by timestamp ascending.
    // Avoid a redundant slice+sort per interval unless needed.
    const sortedPoints = isSortedByTsAsc(points)
      ? points
      : points.slice().sort((a, b) => a.ts - b.ts);
    const finder = makeNearestFinder(sortedPoints);
    findersByInterval.set(interval, finder);
    return finder;
  };

  const quoteCurrencyUpper = (quoteCurrency || '').toUpperCase();
  const bridgeQuoteCurrencyUpper = (bridgeQuoteCurrency || '').toUpperCase();

  // Optional BTC-bridge fallback: if the requested series is missing for this
  // quoteCurrency+coin, synthesize it from a fully-cached bridgeQuoteCurrency.
  //
  // coin@source = coin@bridge * (BTC@source / BTC@bridge)
  //
  // This lets us keep only BTC series for snapshot quote currencies while
  // still valuing non-BTC assets in those quote currencies.
  const canBridge =
    !!bridgeQuoteCurrencyUpper &&
    bridgeQuoteCurrencyUpper !== quoteCurrencyUpper &&
    (coin || '').toLowerCase() !== 'btc';

  let bridgeCoinLookup: FiatRateLookup | null = null;
  let bridgeBtcLookup: FiatRateLookup | null = null;
  let sourceBtcLookup: FiatRateLookup | null = null;

  const getBridgeCoinLookup = (): FiatRateLookup => {
    if (!bridgeCoinLookup) {
      bridgeCoinLookup = createFiatRateLookup({
        quoteCurrency: bridgeQuoteCurrencyUpper,
        coin,
        cache,
        nowMs,
      });
    }
    return bridgeCoinLookup;
  };

  const getBridgeBtcLookup = (): FiatRateLookup => {
    if (!bridgeBtcLookup) {
      bridgeBtcLookup = createFiatRateLookup({
        quoteCurrency: bridgeQuoteCurrencyUpper,
        coin: 'btc',
        cache,
        nowMs,
      });
    }
    return bridgeBtcLookup;
  };

  const getSourceBtcLookup = (): FiatRateLookup => {
    if (!sourceBtcLookup) {
      sourceBtcLookup = createFiatRateLookup({
        quoteCurrency: quoteCurrencyUpper,
        coin: 'btc',
        cache,
        nowMs,
      });
    }
    return sourceBtcLookup;
  };

  return {
    getNearestRate: (targetTsMs: number) => {
      const ageMs = nowMs - targetTsMs;
      const intervals = intervalPreferenceForAge(ageMs);
      for (const interval of intervals) {
        const finder = getFinderForInterval(interval);
        if (!finder) continue;
        const p = finder(targetTsMs);
        if (p && Number.isFinite(p.rate)) return p.rate;
      }

      if (!canBridge) {
        return undefined;
      }

      const bridgeCoinRate = getBridgeCoinLookup().getNearestRate(targetTsMs);
      const bridgeBtcRate = getBridgeBtcLookup().getNearestRate(targetTsMs);
      const sourceBtcRate = getSourceBtcLookup().getNearestRate(targetTsMs);

      if (
        typeof bridgeCoinRate !== 'number' ||
        !Number.isFinite(bridgeCoinRate) ||
        bridgeCoinRate <= 0 ||
        typeof bridgeBtcRate !== 'number' ||
        !Number.isFinite(bridgeBtcRate) ||
        bridgeBtcRate <= 0 ||
        typeof sourceBtcRate !== 'number' ||
        !Number.isFinite(sourceBtcRate) ||
        sourceBtcRate <= 0
      ) {
        return undefined;
      }

      const fxRatio = sourceBtcRate / bridgeBtcRate;
      const out = bridgeCoinRate * fxRatio;
      return Number.isFinite(out) && out > 0 ? out : undefined;
    },
  };
};

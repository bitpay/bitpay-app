import type {
  FiatRateInterval,
  FiatRatePoint,
  FiatRateSeriesCache,
} from '../fiatRatesShared';

type Finder = (targetTs: number) => FiatRatePoint | null;

export type FiatRateLookup = {
  getNearestRate: (targetTsMs: number) => number | undefined;
};

export const makeNearestFinder = (points: FiatRatePoint[]): Finder => {
  'worklet';

  // points MUST be sorted by ts asc.
  let lastIdx = 0;
  let lastTarget = -Infinity;

  const clampIdx = (i: number) => {
    'worklet';
    return Math.max(0, Math.min(points.length - 1, i));
  };

  const binarySearchInsertion = (ts: number): number => {
    'worklet';

    // first index with points[i].ts >= ts
    let lo = 0;
    let hi = points.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (points[mid].ts < ts) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  return (targetTs: number) => {
    'worklet';

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

// Hoist the preference arrays to avoid per-call allocations.
export const PREF_1D: readonly FiatRateInterval[] = [
  '1D',
  '1W',
  '1M',
  '3M',
  '1Y',
  '5Y',
  'ALL',
];
export const PREF_1W: readonly FiatRateInterval[] = [
  '1W',
  '1M',
  '3M',
  '1Y',
  '5Y',
  'ALL',
  '1D',
];
export const PREF_1M: readonly FiatRateInterval[] = [
  '1M',
  '3M',
  '1Y',
  '5Y',
  'ALL',
  '1W',
  '1D',
];
export const PREF_3M: readonly FiatRateInterval[] = [
  '3M',
  '1Y',
  '5Y',
  'ALL',
  '1M',
  '1W',
  '1D',
];
export const PREF_1Y: readonly FiatRateInterval[] = [
  '1Y',
  '5Y',
  'ALL',
  '3M',
  '1M',
  '1W',
  '1D',
];
export const PREF_5Y: readonly FiatRateInterval[] = [
  '5Y',
  'ALL',
  '1Y',
  '3M',
  '1M',
  '1W',
  '1D',
];
export const PREF_ALL: readonly FiatRateInterval[] = [
  'ALL',
  '5Y',
  '1Y',
  '3M',
  '1M',
  '1W',
  '1D',
];

export const intervalPreferenceForAge = (
  ageMs: number,
): readonly FiatRateInterval[] => {
  'worklet';

  if (!Number.isFinite(ageMs) || ageMs < 0) return PREF_1D;

  if (ageMs <= 1 * DAY_MS) return PREF_1D;
  if (ageMs <= 7 * DAY_MS) return PREF_1W;
  if (ageMs <= 30 * DAY_MS) return PREF_1M;
  if (ageMs <= 90 * DAY_MS) return PREF_3M;
  if (ageMs <= 365 * DAY_MS) return PREF_1Y;
  if (ageMs <= 1825 * DAY_MS) return PREF_5Y;
  return PREF_ALL;
};

export const isSortedByTsAsc = (points: FiatRatePoint[]): boolean => {
  'worklet';

  for (let i = 1; i < points.length; i++) {
    if (points[i].ts < points[i - 1].ts) return false;
  }
  return true;
};

export const createFiatRateLookupCore = (args: {
  cache: FiatRateSeriesCache;
  nowMs: number;
  getCacheKey: (interval: FiatRateInterval) => string;
}): FiatRateLookup => {
  'worklet';

  const {cache, nowMs, getCacheKey} = args;
  const findersByKey = new Map<string, Finder>();

  const getFinderForInterval = (interval: FiatRateInterval): Finder | null => {
    'worklet';

    const key = getCacheKey(interval);
    const existing = findersByKey.get(key);
    if (existing) return existing;

    const series = cache[key];
    const points = (series as any)?.points as FiatRatePoint[] | undefined;
    if (!Array.isArray(points) || points.length === 0) return null;

    // The cache builder already sorts points by timestamp ascending.
    const sortedPoints = isSortedByTsAsc(points)
      ? points
      : points.slice().sort((a, b) => a.ts - b.ts);
    const finder = makeNearestFinder(sortedPoints);
    findersByKey.set(key, finder);
    return finder;
  };

  return {
    getNearestRate: (targetTsMs: number) => {
      'worklet';

      const ageMs = nowMs - targetTsMs;
      const intervals = intervalPreferenceForAge(ageMs);
      for (const interval of intervals) {
        const finder = getFinderForInterval(interval);
        if (!finder) continue;
        const p = finder(targetTsMs);
        if (p && Number.isFinite(p.rate)) return p.rate;
      }
      return undefined;
    },
  };
};

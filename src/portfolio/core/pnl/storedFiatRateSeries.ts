import type {FiatRatePoint, FiatRateSeries} from '../fiatRatesShared';

type StoredFiatRateSeriesV2 = {
  v: 2;
  p: Array<[number, number]>;
};

type StoredFiatRateSeriesV3 = {
  v: 3;
  f: number;
  p: Array<[number, number]>;
};

function toOptionalFiniteNumber(value: unknown): number | undefined {
  'worklet';

  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function normalizeStoredFiatRateSeriesPoints(
  candidate: unknown,
): FiatRatePoint[] {
  'worklet';

  if (!Array.isArray(candidate)) {
    return [];
  }

  const points: FiatRatePoint[] = [];
  for (const entry of candidate) {
    if (Array.isArray(entry)) {
      const ts = Number(entry[0]);
      const rate = Number(entry[1]);
      if (Number.isFinite(ts) && Number.isFinite(rate)) {
        points.push({ts, rate});
      }
      continue;
    }

    if (entry && typeof entry === 'object') {
      const ts = Number((entry as any).ts);
      const rate = Number((entry as any).rate);
      if (Number.isFinite(ts) && Number.isFinite(rate)) {
        points.push({ts, rate});
      }
    }
  }

  points.sort((a, b) => a.ts - b.ts);
  return points;
}

export function hasStoredFiatRateSeriesPersistedFetchedOn(
  series: FiatRateSeries | null | undefined,
): boolean {
  'worklet';

  const fetchedOn = toOptionalFiniteNumber(series?.fetchedOn);
  return typeof fetchedOn === 'number' && fetchedOn > 0;
}

export function decodeStoredFiatRateSeriesValue(
  candidate: unknown,
): FiatRateSeries | null {
  'worklet';

  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    const version = Number((candidate as any).v);
    if (version === 3) {
      const points = normalizeStoredFiatRateSeriesPoints(
        (candidate as StoredFiatRateSeriesV3).p,
      );
      if (!points.length) {
        return null;
      }
      const fetchedOn = toOptionalFiniteNumber(
        (candidate as StoredFiatRateSeriesV3).f,
      );
      return {
        fetchedOn:
          typeof fetchedOn === 'number' && fetchedOn > 0 ? fetchedOn : 0,
        points,
      };
    }

    if (version === 2) {
      const points = normalizeStoredFiatRateSeriesPoints(
        (candidate as StoredFiatRateSeriesV2).p,
      );
      if (!points.length) {
        return null;
      }
      return {
        fetchedOn: 0,
        points,
      };
    }

    const fetchedOn = toOptionalFiniteNumber((candidate as any).fetchedOn);
    const points = normalizeStoredFiatRateSeriesPoints(
      (candidate as any).points,
    );
    if (points.length) {
      return {
        fetchedOn:
          typeof fetchedOn === 'number' && fetchedOn > 0 ? fetchedOn : 0,
        points,
      };
    }
  }

  const directPoints = normalizeStoredFiatRateSeriesPoints(candidate);
  if (!directPoints.length) {
    return null;
  }

  return {
    fetchedOn: 0,
    points: directPoints,
  };
}

export function encodeStoredFiatRateSeriesValue(
  series: FiatRateSeries,
): StoredFiatRateSeriesV3 {
  'worklet';

  const fetchedOn = toOptionalFiniteNumber(series.fetchedOn);
  return {
    v: 3,
    f:
      typeof fetchedOn === 'number' && fetchedOn > 0
        ? Math.trunc(fetchedOn)
        : 0,
    p: normalizeStoredFiatRateSeriesPoints(series.points).map(point => [
      point.ts,
      point.rate,
    ]),
  };
}

export function parseStoredFiatRateSeriesRaw(
  raw: string | null | undefined,
): FiatRateSeries | null {
  'worklet';

  if (!raw) {
    return null;
  }

  try {
    return decodeStoredFiatRateSeriesValue(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function stringifyStoredFiatRateSeries(series: FiatRateSeries): string {
  'worklet';

  try {
    return JSON.stringify(encodeStoredFiatRateSeriesValue(series));
  } catch {
    return 'null';
  }
}

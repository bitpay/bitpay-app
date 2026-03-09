type TimestampPoint = {
  ts: number;
};

type RatePoint = {
  rate: number;
};

export const lowerBoundByTs = <T extends TimestampPoint>(
  points: T[],
  cutoffTs: number,
): number => {
  let left = 0;
  let right = points.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (points[mid].ts < cutoffTs) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
};

export const getMaxRate = <T extends RatePoint>(
  points?: T[],
): number | undefined => {
  if (!points?.length) {
    return undefined;
  }

  let maxRate = Number.NEGATIVE_INFINITY;
  let hasFiniteRate = false;

  for (const point of points) {
    if (!Number.isFinite(point.rate)) {
      continue;
    }

    if (!hasFiniteRate || point.rate > maxRate) {
      maxRate = point.rate;
      hasFiniteRate = true;
    }
  }

  return hasFiniteRate ? maxRate : undefined;
};

export const getMaxRateFromIndex = <T extends RatePoint>(
  points: T[],
  startIdx: number,
): number | undefined => {
  if (!points.length) {
    return undefined;
  }

  const normalizedStartIdx = Math.max(0, startIdx);
  if (normalizedStartIdx >= points.length) {
    return undefined;
  }

  let maxRate = Number.NEGATIVE_INFINITY;
  let hasFiniteRate = false;

  for (let index = normalizedStartIdx; index < points.length; index++) {
    const rate = points[index].rate;
    if (!Number.isFinite(rate)) {
      continue;
    }

    if (!hasFiniteRate || rate > maxRate) {
      maxRate = rate;
      hasFiniteRate = true;
    }
  }

  return hasFiniteRate ? maxRate : undefined;
};

export const isSortedByTsAsc = <T extends TimestampPoint>(
  points: readonly T[],
): boolean => {
  for (let index = 1; index < points.length; index++) {
    if (points[index - 1].ts > points[index].ts) {
      return false;
    }
  }
  return true;
};

export const ensureSortedByTsAsc = <T extends TimestampPoint>(
  points: readonly T[],
): T[] =>
  isSortedByTsAsc(points)
    ? (points as T[])
    : [...points].sort((a, b) => a.ts - b.ts);

import {
  ensureSortedByTsAsc,
  getMaxRate,
  getMaxRateFromIndex,
  isSortedByTsAsc,
  lowerBoundByTs,
} from './timeSeries';

describe('lowerBoundByTs', () => {
  it('returns 0 for empty points', () => {
    expect(lowerBoundByTs([], 123)).toBe(0);
  });

  it('returns points length when all points are before cutoff', () => {
    const points = [{ts: 1}, {ts: 2}, {ts: 3}];
    expect(lowerBoundByTs(points, 10)).toBe(3);
  });

  it('returns 0 when all points are after cutoff', () => {
    const points = [{ts: 10}, {ts: 20}, {ts: 30}];
    expect(lowerBoundByTs(points, 5)).toBe(0);
  });

  it('returns the first index whose timestamp equals cutoff', () => {
    const points = [{ts: 1}, {ts: 3}, {ts: 3}, {ts: 5}];
    expect(lowerBoundByTs(points, 3)).toBe(1);
  });
});

describe('getMaxRate', () => {
  it('ignores non-finite rates when finding max', () => {
    const points = [
      {rate: Number.NaN},
      {rate: Number.POSITIVE_INFINITY},
      {rate: -10},
      {rate: 5},
      {rate: Number.NEGATIVE_INFINITY},
    ];

    expect(getMaxRate(points)).toBe(5);
  });

  it('returns undefined when all rates are non-finite', () => {
    const points = [
      {rate: Number.NaN},
      {rate: Number.POSITIVE_INFINITY},
      {rate: Number.NEGATIVE_INFINITY},
    ];

    expect(getMaxRate(points)).toBeUndefined();
  });
});

describe('getMaxRateFromIndex', () => {
  it('returns undefined for empty points', () => {
    expect(getMaxRateFromIndex([], 0)).toBeUndefined();
  });

  it('returns undefined when startIdx >= points.length', () => {
    const points = [{rate: 1}, {rate: 2}];
    expect(getMaxRateFromIndex(points, 2)).toBeUndefined();
  });

  it('treats negative startIdx as 0', () => {
    const points = [{rate: 1}, {rate: 3}, {rate: 2}];
    expect(getMaxRateFromIndex(points, -10)).toBe(3);
  });

  it('ignores non-finite rates (NaN, ±Infinity)', () => {
    const points = [
      {rate: Number.NaN},
      {rate: Number.POSITIVE_INFINITY},
      {rate: -2},
      {rate: 5},
      {rate: Number.NEGATIVE_INFINITY},
    ];

    expect(getMaxRateFromIndex(points, 0)).toBe(5);
  });

  it('returns correct max when startIdx is mid-array', () => {
    const points = [{rate: 2}, {rate: 10}, {rate: 4}, {rate: 7}];
    expect(getMaxRateFromIndex(points, 2)).toBe(7);
  });
});

describe('isSortedByTsAsc', () => {
  it('returns true for ascending timestamps including duplicates', () => {
    expect(isSortedByTsAsc([{ts: 1}, {ts: 2}, {ts: 2}, {ts: 3}])).toBe(true);
  });

  it('returns false when timestamps decrease', () => {
    expect(isSortedByTsAsc([{ts: 1}, {ts: 3}, {ts: 2}])).toBe(false);
  });
});

describe('ensureSortedByTsAsc', () => {
  it('returns same reference when sorted', () => {
    const points = [{ts: 1}, {ts: 2}, {ts: 3}];

    const result = ensureSortedByTsAsc(points);

    expect(result).toBe(points);
  });

  it('returns a new sorted array when unsorted', () => {
    const points = [{ts: 3}, {ts: 1}, {ts: 2}];

    const result = ensureSortedByTsAsc(points);

    expect(result).not.toBe(points);
    expect(result).toEqual([{ts: 1}, {ts: 2}, {ts: 3}]);
    expect(points).toEqual([{ts: 3}, {ts: 1}, {ts: 2}]);
  });
});

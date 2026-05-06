import {
  computePointExtrema,
  GRAPH_DRAWABLE_EPSILON,
  normalizeLineChartPoints,
  toFiniteNumber,
  type LineChartPointFactoryArgs,
} from './lineChartMath';

type RawPoint = {
  ts?: unknown;
  value?: unknown;
  label?: string;
};

type NormalizedPoint = {
  ts: number;
  value: number;
  label?: string;
};

const getTimestamp = (point: RawPoint): unknown => point?.ts;
const getValue = (point: RawPoint): unknown => point?.value;
const makePoint = (
  args: LineChartPointFactoryArgs<RawPoint, NormalizedPoint>,
): NormalizedPoint => ({
  ts: args.timestamp,
  value: args.value,
  label: args.source.label,
});

describe('lineChartMath', () => {
  it('coerces finite numeric values and falls back for non-finite values', () => {
    expect(toFiniteNumber('12.5')).toBe(12.5);
    expect(toFiniteNumber(Number.NaN, 7)).toBe(7);
    expect(toFiniteNumber(Number.POSITIVE_INFINITY, 7)).toBe(7);
  });

  it('normalizes timestamps monotonically and carries forward invalid values', () => {
    const normalized = normalizeLineChartPoints(
      [
        {ts: 'not-a-date', value: '10', label: 'fallback'},
        {ts: 10, value: Number.NaN, label: 'carried'},
        {ts: 10, value: 14, label: 'bumped'},
      ],
      {
        getTimestamp,
        getValue,
        makePoint,
        fallbackTimestamp: 1000,
      },
    );

    expect(normalized).toEqual([
      {ts: 1000, value: 10, label: 'fallback'},
      {ts: 1001, value: 10, label: 'carried'},
      {ts: 1002, value: 14, label: 'bumped'},
    ]);
  });

  it('adds a tiny range to flat multi-point series', () => {
    const normalized = normalizeLineChartPoints(
      [
        {ts: 1000, value: 42},
        {ts: 2000, value: 42},
      ],
      {
        getTimestamp,
        getValue,
        makePoint,
      },
    );

    expect(normalized).toEqual([
      {ts: 1000, value: 42},
      {ts: 2000, value: 42 + GRAPH_DRAWABLE_EPSILON},
    ]);
  });

  it('computes extrema from normalized finite values', () => {
    const points = [
      {ts: 1000, value: 20},
      {ts: 2000, value: 15},
      {ts: 3000, value: 25},
    ];

    expect(computePointExtrema(points, getValue)).toEqual({
      minIndex: 1,
      maxIndex: 2,
      minPoint: points[1],
      maxPoint: points[2],
    });
    expect(computePointExtrema([], getValue)).toBeUndefined();
  });
});

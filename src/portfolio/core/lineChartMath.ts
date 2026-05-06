export const GRAPH_DRAWABLE_EPSILON = 0.0001;

export type LineChartPointFactoryArgs<TInput, TOutput> = {
  source: TInput;
  currentPoint?: TOutput;
  index: number;
  timestamp: number;
  value: number;
};

export type NormalizeLineChartPointsOptions<TInput, TOutput> = {
  getTimestamp: (point: TInput, index: number) => unknown;
  getValue: (point: TInput, index: number) => unknown;
  makePoint: (args: LineChartPointFactoryArgs<TInput, TOutput>) => TOutput;
  fallbackTimestamp?: number;
};

export type LineChartPointExtrema<TPoint> = {
  minIndex: number;
  maxIndex: number;
  minPoint: TPoint;
  maxPoint: TPoint;
};

export function toFiniteNumber(value: unknown, fallback = 0): number {
  'worklet';

  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

export function normalizeLineChartPoints<TInput, TOutput>(
  points: TInput[],
  options: NormalizeLineChartPointsOptions<TInput, TOutput>,
): TOutput[] {
  'worklet';

  if (!points.length) {
    return points as unknown as TOutput[];
  }

  const normalized: TOutput[] = [];
  const normalizedTimestamps: number[] = [];
  const normalizedValues: number[] = [];
  const fallbackTsBase = toFiniteNumber(options.fallbackTimestamp, Date.now());
  let prevTs = Number.NEGATIVE_INFINITY;
  let minV = Number.POSITIVE_INFINITY;
  let maxV = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < points.length; i++) {
    const src = points[i];
    let ts = toFiniteNumber(options.getTimestamp(src, i), fallbackTsBase + i);
    if (Number.isFinite(prevTs) && ts <= prevTs) {
      ts = prevTs + 1;
    }

    const fallbackValue = normalizedValues.length
      ? normalizedValues[normalizedValues.length - 1]
      : 0;
    const value = toFiniteNumber(options.getValue(src, i), fallbackValue);

    normalized.push(
      options.makePoint({
        source: src,
        index: i,
        timestamp: ts,
        value,
      }),
    );
    normalizedTimestamps.push(ts);
    normalizedValues.push(value);
    prevTs = ts;

    if (value < minV) {
      minV = value;
    }
    if (value > maxV) {
      maxV = value;
    }
  }

  if (normalized.length >= 2 && minV === maxV) {
    const lastIndex = normalized.length - 1;
    const value = normalizedValues[lastIndex] + GRAPH_DRAWABLE_EPSILON;
    normalizedValues[lastIndex] = value;
    normalized[lastIndex] = options.makePoint({
      source: points[lastIndex],
      currentPoint: normalized[lastIndex],
      index: lastIndex,
      timestamp: normalizedTimestamps[lastIndex],
      value,
    });
  }

  return normalized;
}

export function computePointExtrema<TPoint>(
  points: TPoint[],
  getValue: (point: TPoint, index: number) => unknown,
): LineChartPointExtrema<TPoint> | undefined {
  'worklet';

  if (!points.length) {
    return undefined;
  }

  let minIndex = 0;
  let maxIndex = 0;
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < points.length; i++) {
    const value = toFiniteNumber(getValue(points[i], i), 0);
    if (value < minValue) {
      minValue = value;
      minIndex = i;
    }
    if (value > maxValue) {
      maxValue = value;
      maxIndex = i;
    }
  }

  return {
    minIndex,
    maxIndex,
    minPoint: points[minIndex],
    maxPoint: points[maxIndex],
  };
}

import type {GraphPoint} from 'react-native-graph';

export const GRAPH_DRAWABLE_EPSILON = 0.0001;

export const normalizeGraphPointsForChart = (
  points: GraphPoint[],
): GraphPoint[] => {
  if (!points.length) {
    return points;
  }

  const normalized: GraphPoint[] = [];
  const fallbackTsBase = Date.now();
  let prevTs = Number.NEGATIVE_INFINITY;
  let minV = Number.POSITIVE_INFINITY;
  let maxV = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < points.length; i++) {
    const src = points[i];
    const rawTs =
      src?.date instanceof Date
        ? src.date.getTime()
        : Number((src as {date?: unknown})?.date);
    let ts = Number.isFinite(rawTs) ? rawTs : fallbackTsBase + i;
    if (Number.isFinite(prevTs) && ts <= prevTs) {
      ts = prevTs + 1;
    }

    const fallbackValue = normalized.length
      ? normalized[normalized.length - 1].value
      : 0;
    const value = Number.isFinite(src?.value) ? src.value : fallbackValue;

    normalized.push({
      date: new Date(ts),
      value,
    });
    prevTs = ts;

    if (value < minV) {
      minV = value;
    }
    if (value > maxV) {
      maxV = value;
    }
  }

  // react-native-graph may render nothing when all values are identical (0 range).
  // Add a tiny epsilon to the last point to guarantee a drawable range without
  // affecting formatted labels.
  if (normalized.length >= 2 && minV === maxV) {
    normalized[normalized.length - 1] = {
      ...normalized[normalized.length - 1],
      value: normalized[normalized.length - 1].value + GRAPH_DRAWABLE_EPSILON,
    };
  }

  return normalized;
};

export const recomputeMinMaxFromGraphPoints = (points: GraphPoint[]) => {
  let minIndex = 0;
  let maxIndex = 0;
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < points.length; i++) {
    const value = points[i]?.value;
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
};

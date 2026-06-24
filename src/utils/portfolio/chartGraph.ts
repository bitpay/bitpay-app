import type {GraphPoint} from 'react-native-graph';
import {
  computePointExtrema,
  GRAPH_DRAWABLE_EPSILON,
  normalizeLineChartPoints,
  type LineChartPointFactoryArgs,
} from '../../portfolio/core/lineChartMath';

export {GRAPH_DRAWABLE_EPSILON};

function getGraphPointTimestamp(point: GraphPoint): unknown {
  'worklet';

  const date = (point as {date?: unknown})?.date;
  return date instanceof Date ? date.getTime() : date;
}

function getGraphPointValue(point: GraphPoint): unknown {
  'worklet';

  return point?.value;
}

function makeGraphPoint(
  args: LineChartPointFactoryArgs<GraphPoint, GraphPoint>,
): GraphPoint {
  'worklet';

  return {
    date: new Date(args.timestamp),
    value: args.value,
  };
}

export const normalizeGraphPointsForChart = (
  points: GraphPoint[],
): GraphPoint[] =>
  normalizeLineChartPoints(points, {
    getTimestamp: getGraphPointTimestamp,
    getValue: getGraphPointValue,
    makePoint: makeGraphPoint,
  });

export const recomputeMinMaxFromGraphPoints = (points: GraphPoint[]) => {
  const extrema = computePointExtrema(points, getGraphPointValue);

  return (
    extrema || {
      minIndex: 0,
      maxIndex: 0,
      minPoint: points[0],
      maxPoint: points[0],
    }
  );
};

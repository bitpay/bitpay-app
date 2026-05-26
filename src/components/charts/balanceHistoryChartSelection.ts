import type {GraphPoint} from 'react-native-graph';
import type {HydratedBalanceChartSeries} from '../../utils/portfolio/chartCache';
import type {PnlAnalysisPoint} from '../../portfolio/core/pnl/analysisStreaming';
import {formatFiatAmount} from '../../utils/helper-methods';

export type ChangeRowData = {
  percent: number;
  deltaFiatFormatted?: string;
  rangeLabel?: string;
};

type SeriesLike = Pick<
  HydratedBalanceChartSeries,
  'analysisPoints' | 'pointByTimestamp'
>;

export const getSelectedBalanceHistoryAnalysisPoint = (args: {
  selectedPoint?: GraphPoint;
  activeSeries?: SeriesLike;
}): PnlAnalysisPoint | undefined => {
  return args.selectedPoint && args.activeSeries
    ? args.activeSeries.pointByTimestamp.get(args.selectedPoint.date.getTime())
    : undefined;
};

export const getLastBalanceHistoryAnalysisPoint = (
  series?: Pick<HydratedBalanceChartSeries, 'analysisPoints'>,
): PnlAnalysisPoint | undefined => {
  const points = series?.analysisPoints || [];
  return points.length ? points[points.length - 1] : undefined;
};

export const getDisplayedBalanceHistoryAnalysisPoint = (args: {
  selectedPoint?: GraphPoint;
  activeSeries?: SeriesLike;
}): PnlAnalysisPoint | undefined => {
  return (
    getSelectedBalanceHistoryAnalysisPoint(args) ||
    getLastBalanceHistoryAnalysisPoint(args.activeSeries)
  );
};

export const buildBalanceHistoryChartChangeRowData = (args: {
  displayedAnalysisPoint?: Pick<
    PnlAnalysisPoint,
    'totalPnlChange' | 'totalPnlPercent'
  >;
  quoteCurrency: string;
  label?: string;
}): ChangeRowData | undefined => {
  return args.displayedAnalysisPoint
    ? {
        percent: args.displayedAnalysisPoint.totalPnlPercent ?? 0,
        deltaFiatFormatted: formatFiatAmount(
          args.displayedAnalysisPoint.totalPnlChange ?? 0,
          args.quoteCurrency,
          {
            currencyDisplay: 'symbol',
          },
        ),
        rangeLabel: args.label,
      }
    : undefined;
};

export const getSelectedBalanceHistoryValue = (args: {
  point: GraphPoint;
  activeSeries?: SeriesLike;
  balanceOffset: number;
}): number => {
  const analysisPoint = args.activeSeries?.pointByTimestamp.get(
    args.point.date.getTime(),
  );
  return typeof analysisPoint?.totalFiatBalance === 'number'
    ? analysisPoint.totalFiatBalance + args.balanceOffset
    : args.point.value;
};

import type {GraphPoint} from 'react-native-graph';
import type {HydratedBalanceChartSeries} from '../../utils/portfolio/chartCache';
import type {PnlAnalysisPoint} from '../../utils/portfolio/core/pnl/analysis';
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
  if (!args.selectedPoint || !args.activeSeries) {
    return undefined;
  }

  return args.activeSeries.pointByTimestamp.get(
    args.selectedPoint.date.getTime(),
  );
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
  cachedSelectedSeries?: Pick<HydratedBalanceChartSeries, 'analysisPoints'>;
}): PnlAnalysisPoint | undefined => {
  return (
    getSelectedBalanceHistoryAnalysisPoint({
      selectedPoint: args.selectedPoint,
      activeSeries: args.activeSeries,
    }) ||
    getLastBalanceHistoryAnalysisPoint(args.activeSeries) ||
    getLastBalanceHistoryAnalysisPoint(args.cachedSelectedSeries)
  );
};

export const buildBalanceHistoryChartChangeRowData = (args: {
  displayedAnalysisPoint?: PnlAnalysisPoint;
  quoteCurrency: string;
  label?: string;
}): ChangeRowData | undefined => {
  if (!args.displayedAnalysisPoint) {
    return undefined;
  }

  return {
    percent: args.displayedAnalysisPoint.totalPnlPercent ?? 0,
    deltaFiatFormatted: formatFiatAmount(
      args.displayedAnalysisPoint.totalUnrealizedPnlFiat ?? 0,
      args.quoteCurrency,
      {
        customPrecision: 'minimal',
        currencyDisplay: 'symbol',
      },
    ),
    rangeLabel: args.label,
  };
};

export const areBalanceHistoryChartChangeRowDataEqual = (
  a?: ChangeRowData,
  b?: ChangeRowData,
): boolean => {
  return (
    a?.percent === b?.percent &&
    a?.deltaFiatFormatted === b?.deltaFiatFormatted &&
    a?.rangeLabel === b?.rangeLabel
  );
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

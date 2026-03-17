import React, {useCallback, useRef} from 'react';
import type {HydratedBalanceChartSeries} from '../../utils/portfolio/chartCache';
import type {NumberSharedValue} from './sharedValueGuards';
import ChartAxisLabel from './ChartAxisLabel';
import type {InteractiveLineChartAxisLabelProps} from './InteractiveLineChart';

export const useStableBalanceHistoryChartAxisLabels = (args: {
  activeSeries?: HydratedBalanceChartSeries;
  axisLabelOpacity?: number | NumberSharedValue;
  quoteCurrency: string;
}) => {
  const activeSeriesRef = useRef(args.activeSeries);
  activeSeriesRef.current = args.activeSeries;

  const axisLabelOpacityRef = useRef(args.axisLabelOpacity);
  axisLabelOpacityRef.current = args.axisLabelOpacity;

  const quoteCurrencyRef = useRef(args.quoteCurrency);
  quoteCurrencyRef.current = args.quoteCurrency;

  const MaxAxisLabel = useCallback(
    ({width}: InteractiveLineChartAxisLabelProps) => {
      const series = activeSeriesRef.current;
      if (!series?.graphPoints.length) {
        return null;
      }

      return (
        <ChartAxisLabel
          width={width}
          value={series.maxPoint.value}
          index={series.maxIndex}
          arrayLength={series.graphPoints.length}
          quoteCurrency={quoteCurrencyRef.current}
          currencyAbbreviation={undefined}
          type="max"
          contentOpacity={axisLabelOpacityRef.current}
        />
      );
    },
    [],
  );

  const MinAxisLabel = useCallback(
    ({width}: InteractiveLineChartAxisLabelProps) => {
      const series = activeSeriesRef.current;
      if (!series?.graphPoints.length) {
        return null;
      }

      return (
        <ChartAxisLabel
          width={width}
          value={series.minPoint.value}
          index={series.minIndex}
          arrayLength={series.graphPoints.length}
          quoteCurrency={quoteCurrencyRef.current}
          currencyAbbreviation={undefined}
          type="min"
          contentOpacity={axisLabelOpacityRef.current}
        />
      );
    },
    [],
  );

  return {
    MaxAxisLabel,
    MinAxisLabel,
  };
};

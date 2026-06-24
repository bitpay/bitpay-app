import {useRef} from 'react';
import type {HydratedBalanceChartSeries} from '../../utils/portfolio/chartCache';
import type {NumberSharedValue} from './sharedValueGuards';
import {useStableChartAxisLabels} from './useStableChartAxisLabels';

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

  return useStableChartAxisLabels({
    getMaxPayload: () => {
      const series = activeSeriesRef.current;
      if (!series?.graphPoints.length) {
        return undefined;
      }

      return {
        value: series.maxPoint.value,
        index: series.maxIndex,
        arrayLength: series.graphPoints.length,
      };
    },
    getMinPayload: () => {
      const series = activeSeriesRef.current;
      if (!series?.graphPoints.length) {
        return undefined;
      }

      return {
        value: series.minPoint.value,
        index: series.minIndex,
        arrayLength: series.graphPoints.length,
      };
    },
    quoteCurrencyRef,
    contentOpacityRef: axisLabelOpacityRef,
  });
};

import type {FiatRateInterval} from '../../store/rate/rate.models';
import {
  FIAT_TIMEFRAME_VALUES,
  getFiatTimeframeMetadata,
  getFiatTimeframeSeriesInterval,
} from '../../utils/fiatTimeframes';

export const FIAT_CHART_TIMEFRAME_VALUES: FiatRateInterval[] =
  FIAT_TIMEFRAME_VALUES.slice();

export const getFiatChartTimeframeOptions = (
  t: (key: string) => string,
): Array<{label: string; value: FiatRateInterval}> => {
  return FIAT_CHART_TIMEFRAME_VALUES.map(value => ({
    value,
    label: t(getFiatTimeframeMetadata(value).displayLabel),
  }));
};

export const getSeriesIntervalForFiatTimeframe = (
  timeframe: FiatRateInterval,
): FiatRateInterval => {
  return getFiatTimeframeSeriesInterval(timeframe);
};

export const getRangeLabelForFiatTimeframe = (
  t: (key: string) => string,
  timeframe: FiatRateInterval,
): string => {
  return t(getFiatTimeframeMetadata(timeframe).rangeLabel);
};

export const formatRangeOrSelectedPointLabel = (args: {
  rangeLabel: string;
  selectedTimeframe: FiatRateInterval;
  selectedDate?: Date;
}): string => {
  const {rangeLabel, selectedTimeframe, selectedDate} = args;
  if (!selectedDate) {
    return rangeLabel;
  }

  const date = selectedDate;
  if (selectedTimeframe === '1D') {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (selectedTimeframe === '1W' || selectedTimeframe === '1M') {
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

import type {FiatRateInterval} from '../../store/rate/rate.models';
import {
  getFiatTimeframeMetadata,
  getFiatTimeframeSeriesInterval,
} from '../../utils/fiatTimeframes';

export const FIAT_CHART_DISPLAY_ORDER = [
  '1D',
  '1W',
  '1M',
  '3M',
  '1Y',
  '5Y',
  'ALL',
] as const satisfies ReadonlyArray<FiatRateInterval>;

export const DEFAULT_BALANCE_CHART_TIMEFRAME = FIAT_CHART_DISPLAY_ORDER[0];

export const getFiatChartTimeframeOptions = (
  t: (key: string) => string,
): Array<{label: string; value: FiatRateInterval}> => {
  return FIAT_CHART_DISPLAY_ORDER.map(value => ({
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

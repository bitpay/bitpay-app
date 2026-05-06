import type {FiatRateInterval} from '../../store/rate/rate.models';
import {
  getFiatTimeframeMetadata,
  getFiatTimeframeWindowMs,
} from '../../utils/fiatTimeframes';

const DAY_MS = getFiatTimeframeWindowMs('1D') || 24 * 60 * 60 * 1000;
const THREE_MONTHS_MS = getFiatTimeframeWindowMs('3M') || 90 * DAY_MS;

export type SelectedPointLabelFormatMode = 'time' | 'dateTime' | 'date';

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
  displayedRangeMs?: number;
}): string => {
  const {rangeLabel, selectedTimeframe, selectedDate} = args;
  if (!selectedDate) {
    return rangeLabel;
  }

  const date = selectedDate;
  const formatMode = getSelectedPointLabelFormatMode({
    selectedTimeframe,
    displayedRangeMs: args.displayedRangeMs,
  });

  if (formatMode === 'time') {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (formatMode === 'dateTime') {
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

export const getSelectedPointLabelFormatMode = (args: {
  selectedTimeframe: FiatRateInterval;
  displayedRangeMs?: number;
}): SelectedPointLabelFormatMode => {
  if (args.selectedTimeframe === '1D') {
    return 'time';
  }

  if (args.selectedTimeframe === '1W' || args.selectedTimeframe === '1M') {
    return 'dateTime';
  }

  if (args.selectedTimeframe === 'ALL') {
    const displayedRangeMs = args.displayedRangeMs;
    if (
      typeof displayedRangeMs === 'number' &&
      Number.isFinite(displayedRangeMs)
    ) {
      if (displayedRangeMs < DAY_MS) {
        return 'time';
      }
      if (displayedRangeMs < THREE_MONTHS_MS) {
        return 'dateTime';
      }
    }
  }

  return 'date';
};

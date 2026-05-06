import React, {useCallback, useRef} from 'react';
import ChartAxisLabel from './ChartAxisLabel';
import type {InteractiveLineChartAxisLabelProps} from './InteractiveLineChart';
import type {NumberSharedValue} from './sharedValueGuards';

type LatestRef<T> = {
  current: T;
};

type ChartAxisLabelType = 'min' | 'max';

export type StableChartAxisLabelPayload = {
  value: number;
  index: number;
  arrayLength: number;
};

type GetStableChartAxisLabelPayload = () =>
  | StableChartAxisLabelPayload
  | null
  | undefined;

export const useStableChartAxisLabels = (args: {
  getMinPayload: GetStableChartAxisLabelPayload;
  getMaxPayload: GetStableChartAxisLabelPayload;
  quoteCurrencyRef: LatestRef<string>;
  currencyAbbreviationRef?: LatestRef<string | undefined>;
  contentOpacityRef?: LatestRef<number | NumberSharedValue | undefined>;
}) => {
  const getMinPayloadRef = useRef(args.getMinPayload);
  getMinPayloadRef.current = args.getMinPayload;

  const getMaxPayloadRef = useRef(args.getMaxPayload);
  getMaxPayloadRef.current = args.getMaxPayload;

  const quoteCurrencyRef = useRef(args.quoteCurrencyRef);
  quoteCurrencyRef.current = args.quoteCurrencyRef;

  const currencyAbbreviationRef = useRef(args.currencyAbbreviationRef);
  currencyAbbreviationRef.current = args.currencyAbbreviationRef;

  const contentOpacityRef = useRef(args.contentOpacityRef);
  contentOpacityRef.current = args.contentOpacityRef;

  const renderAxisLabel = useCallback(
    (type: ChartAxisLabelType, width?: number) => {
      const payload =
        type === 'min'
          ? getMinPayloadRef.current()
          : getMaxPayloadRef.current();

      if (!payload) {
        return null;
      }

      return (
        <ChartAxisLabel
          width={width}
          value={payload.value}
          index={payload.index}
          arrayLength={payload.arrayLength}
          quoteCurrency={quoteCurrencyRef.current.current}
          currencyAbbreviation={currencyAbbreviationRef.current?.current}
          type={type}
          contentOpacity={contentOpacityRef.current?.current}
        />
      );
    },
    [],
  );

  const MinAxisLabel = useCallback(
    ({width}: InteractiveLineChartAxisLabelProps) =>
      renderAxisLabel('min', width),
    [renderAxisLabel],
  );

  const MaxAxisLabel = useCallback(
    ({width}: InteractiveLineChartAxisLabelProps) =>
      renderAxisLabel('max', width),
    [renderAxisLabel],
  );

  return {
    MinAxisLabel,
    MaxAxisLabel,
  };
};

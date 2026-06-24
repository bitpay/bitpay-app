import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import type {GraphPoint} from 'react-native-graph';
import {useTheme} from 'styled-components/native';
import ChartSelectionDot from '../../../../components/charts/ChartSelectionDot';
import InteractiveLineChart from '../../../../components/charts/InteractiveLineChart';
import TimeframeSelector from '../../../../components/charts/TimeframeSelector';
import {useStableChartAxisLabels} from '../../../../components/charts/useStableChartAxisLabels';
import {
  DEFAULT_BALANCE_CHART_TIMEFRAME,
  formatRangeOrSelectedPointLabel,
  getFiatChartTimeframeOptions,
  getRangeLabelForFiatTimeframe,
} from '../../../../components/charts/fiatTimeframes';
import {ScreenGutter} from '../../../../components/styled/Containers';
import haptic from '../../../../components/haptic-feedback/haptic';
import {HISTORIC_RATES_CACHE_DURATION} from '../../../../constants/wallet';
import {
  CachedFiatRateInterval,
  FiatRateInterval,
  FIAT_RATE_SERIES_CACHED_INTERVALS,
  getFiatRateSeriesCacheKey,
} from '../../../../store/rate/rate.models';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {shouldUseCompactFiatAmountText} from '../../../../utils/fiatAmountText';
import {
  calculatePercentageDifferenceRaw,
  getFiatRateSeriesIntervalForTimeframe,
} from '../../../../utils/portfolio/rate';
import {White} from '../../../../styles/colors';
import useRuntimeFiatRateSeriesCache from '../../../../portfolio/ui/hooks/useRuntimeFiatRateSeriesCache';
import useExchangeRateChartData, {
  type ChartDataType,
  defaultDisplayData,
} from '../../hooks/useExchangeRateChartData';
import {getExchangeRateTimeframeChange} from '../ExchangeRate.utils';
import ExchangeRateScreenLayout from './ExchangeRateScreenLayout';
import useAssetScreenRefresh from './useAssetScreenRefresh';
import type {ExchangeRateSharedModel} from './useExchangeRateSharedModel';
import UkExchangeRateDisclosures from './UkExchangeRateDisclosures';

type ExchangeRateScreenProps = {
  shared: ExchangeRateSharedModel;
};

const ExchangeRateScreen = ({shared}: ExchangeRateScreenProps) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const [selectedTimeframe, setSelectedTimeframe] = useState<FiatRateInterval>(
    DEFAULT_BALANCE_CHART_TIMEFRAME,
  );
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [displayData, setDisplayData] =
    useState<ChartDataType>(defaultDisplayData);
  const displayDataRef = useRef(displayData);
  displayDataRef.current = displayData;
  const gestureStarted = useRef(false);
  const [selectedPoint, setSelectedPoint] = useState<
    | {
        date: Date;
        price: number;
        priceChange: number;
        percentChange: number;
      }
    | undefined
  >(undefined);
  const isMountedRef = useRef(false);
  const gestureEndRafRef = useRef<number | null>(null);

  const fiatChartTimeframeOptions = useMemo(
    () => getFiatChartTimeframeOptions(t),
    [t],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (gestureEndRafRef.current != null) {
        cancelAnimationFrame(gestureEndRafRef.current);
        gestureEndRafRef.current = null;
      }
    };
  }, []);

  const seriesDataInterval = useMemo<CachedFiatRateInterval>(
    () => getFiatRateSeriesIntervalForTimeframe(selectedTimeframe),
    [selectedTimeframe],
  );

  const historicalRateRequests = useMemo(
    () =>
      shared.hasValidNormalizedCoin
        ? [
            {
              coin: shared.normalizedCoin,
              chain: shared.historicalRateIdentity.chain,
              tokenAddress: shared.historicalRateIdentity.tokenAddress,
              intervals: [...FIAT_RATE_SERIES_CACHED_INTERVALS],
            },
          ]
        : [],
    [
      shared.hasValidNormalizedCoin,
      shared.historicalRateIdentity.chain,
      shared.historicalRateIdentity.tokenAddress,
      shared.normalizedCoin,
    ],
  );

  const {
    cache: fiatRateSeriesCache,
    loading: isFiatRateSeriesCacheLoading,
    reload: reloadFiatRateSeriesCache,
  } = useRuntimeFiatRateSeriesCache({
    quoteCurrency: shared.resolvedQuoteCurrency,
    requests: historicalRateRequests,
    maxAgeMs: HISTORIC_RATES_CACHE_DURATION * 1000,
    enabled: !!shared.resolvedQuoteCurrency && shared.hasValidNormalizedCoin,
    clearOnRequestChange: true,
  });

  const selectedSeriesKey = useMemo(() => {
    return getFiatRateSeriesCacheKey(
      shared.resolvedQuoteCurrency,
      shared.normalizedCoin,
      seriesDataInterval,
      shared.historicalRateIdentity,
    );
  }, [
    seriesDataInterval,
    shared.historicalRateIdentity,
    shared.normalizedCoin,
    shared.resolvedQuoteCurrency,
  ]);

  const selectedSeries = fiatRateSeriesCache[selectedSeriesKey];

  const {
    pointsForChartRaw,
    displayData: derivedDisplayData,
    displayedRangeMs,
  } = useExchangeRateChartData({
    selectedSeriesPoints: selectedSeries?.points,
    selectedTimeframe,
    seriesDataInterval,
    currentFiatRate: shared.currentFiatRate,
    nowMs: shared.asOfMs,
  });

  useEffect(() => {
    if (
      typeof pointsForChartRaw !== 'undefined' &&
      typeof derivedDisplayData !== 'undefined'
    ) {
      setDisplayData(derivedDisplayData);
      setIsChartLoading(false);
      return;
    }

    const hasUsableData = !!displayDataRef.current.data.length;
    setIsChartLoading(isFiatRateSeriesCacheLoading && !hasUsableData);
  }, [derivedDisplayData, isFiatRateSeriesCacheLoading, pointsForChartRaw]);

  const rangeLabel = useMemo(() => {
    return getRangeLabelForFiatTimeframe(t, selectedTimeframe);
  }, [selectedTimeframe, t]);

  const rangeOrSelectedPointLabel = useMemo(() => {
    return formatRangeOrSelectedPointLabel({
      rangeLabel,
      selectedTimeframe,
      selectedDate: selectedPoint?.date,
      displayedRangeMs,
    });
  }, [displayedRangeMs, rangeLabel, selectedPoint?.date, selectedTimeframe]);

  const fallbackHistoricalPrice = useMemo(() => {
    if (displayData.data.length) {
      return displayData.data[displayData.data.length - 1].value;
    }
    return undefined;
  }, [displayData.data]);

  const latestPriceValue = shared.currentFiatRate ?? fallbackHistoricalPrice;

  const formattedTopPrice = shared.formatDisplayPrice(
    selectedPoint?.price ?? latestPriceValue ?? fallbackHistoricalPrice,
  );

  const formattedMarketPrice = shared.formatDisplayPrice(
    latestPriceValue ?? fallbackHistoricalPrice,
  );

  const topValueIsLarge = useMemo(() => {
    return shouldUseCompactFiatAmountText(formattedTopPrice);
  }, [formattedTopPrice]);

  const timeframeChange = useMemo(() => {
    return getExchangeRateTimeframeChange({
      fiatRateSeriesCache,
      fiatCode: shared.resolvedQuoteCurrency,
      normalizedCoin: shared.normalizedCoin,
      timeframe: selectedTimeframe,
      currentRate: shared.currentFiatRate,
      historicalRateIdentity: shared.historicalRateIdentity,
      nowMs: shared.asOfMs,
    });
  }, [
    fiatRateSeriesCache,
    shared.asOfMs,
    selectedTimeframe,
    shared.currentFiatRate,
    shared.historicalRateIdentity,
    shared.normalizedCoin,
    shared.resolvedQuoteCurrency,
  ]);

  const percentChangeToDisplay = useMemo(() => {
    if (selectedPoint) {
      return selectedPoint.percentChange;
    }
    if (timeframeChange) {
      return timeframeChange.percentChange;
    }
    if (displayData.data.length) {
      return displayData.percentChange;
    }
    return 0;
  }, [
    displayData.data.length,
    displayData.percentChange,
    selectedPoint,
    timeframeChange,
  ]);

  const priceChangeToDisplay = useMemo(() => {
    if (selectedPoint) {
      return formatFiatAmount(
        selectedPoint.priceChange,
        shared.resolvedQuoteCurrency,
        {
          customPrecision: 'minimal',
          currencyAbbreviation: shared.assetContext.currencyAbbreviation,
        },
      );
    }
    if (timeframeChange) {
      return formatFiatAmount(
        timeframeChange.priceChange,
        shared.resolvedQuoteCurrency,
        {
          customPrecision: 'minimal',
          currencyAbbreviation: shared.assetContext.currencyAbbreviation,
        },
      );
    }
    if (displayData.data.length) {
      return formatFiatAmount(
        displayData.priceChange,
        shared.resolvedQuoteCurrency,
        {
          customPrecision: 'minimal',
          currencyAbbreviation: shared.assetContext.currencyAbbreviation,
        },
      );
    }
    return undefined;
  }, [
    displayData.data.length,
    displayData.priceChange,
    selectedPoint,
    shared.assetContext.currencyAbbreviation,
    shared.resolvedQuoteCurrency,
    timeframeChange,
  ]);

  const chartPoints = displayData.data;
  const currencyAbbreviationRef = useRef(shared.currencyAbbreviation);
  currencyAbbreviationRef.current = shared.currencyAbbreviation;
  const quoteCurrencyRef = useRef(shared.resolvedQuoteCurrency);
  quoteCurrencyRef.current = shared.resolvedQuoteCurrency;

  useEffect(() => {
    gestureStarted.current = false;
    setSelectedPoint(undefined);
  }, [chartPoints]);

  const {MinAxisLabel, MaxAxisLabel} = useStableChartAxisLabels({
    getMinPayload: () => {
      const nextDisplayData = displayDataRef.current;
      if (
        !nextDisplayData.data.length ||
        nextDisplayData.renderedMinPoint?.point.value == null
      ) {
        return undefined;
      }

      return {
        value: nextDisplayData.renderedMinPoint.point.value,
        index: nextDisplayData.renderedMinPoint.index,
        arrayLength: nextDisplayData.data.length,
      };
    },
    getMaxPayload: () => {
      const nextDisplayData = displayDataRef.current;
      if (
        !nextDisplayData.data.length ||
        nextDisplayData.renderedMaxPoint?.point.value == null
      ) {
        return undefined;
      }

      return {
        value: nextDisplayData.renderedMaxPoint.point.value,
        index: nextDisplayData.renderedMaxPoint.index,
        arrayLength: nextDisplayData.data.length,
      };
    },
    quoteCurrencyRef,
    currencyAbbreviationRef,
  });

  const onPointSelected = useCallback(
    (point: GraphPoint) => {
      if (!gestureStarted.current || !chartPoints.length) {
        return;
      }
      const baselineValue =
        timeframeChange?.baselineRate ?? chartPoints[0]?.value ?? point.value;
      const percentChangeAtPoint = calculatePercentageDifferenceRaw(
        point.value,
        baselineValue,
      );
      setSelectedPoint({
        date: point.date,
        price: point.value,
        priceChange: point.value - baselineValue,
        percentChange: percentChangeAtPoint,
      });
      haptic('impactLight');
    },
    [chartPoints, timeframeChange?.baselineRate],
  );

  const onGestureEnd = useCallback(() => {
    if (!gestureStarted.current) {
      return;
    }
    if (gestureEndRafRef.current != null) {
      cancelAnimationFrame(gestureEndRafRef.current);
    }
    gestureEndRafRef.current = requestAnimationFrame(() => {
      gestureEndRafRef.current = null;
      gestureStarted.current = false;
      if (!isMountedRef.current) {
        return;
      }
      setSelectedPoint(undefined);
      haptic('impactLight');
    });
  }, []);

  const onGestureStarted = useCallback(() => {
    if (!chartPoints.length) {
      return;
    }
    gestureStarted.current = true;
    haptic('impactLight');
  }, [chartPoints.length]);

  const refreshChartSeries = useCallback(async () => {
    if (!shared.hasValidNormalizedCoin) {
      return;
    }

    await reloadFiatRateSeriesCache({force: true}).catch(() => ({}));
  }, [reloadFiatRateSeriesCache, shared.hasValidNormalizedCoin]);

  const {isRefreshing, onRefresh} = useAssetScreenRefresh(shared, {
    afterBaseRefresh: refreshChartSeries,
  });

  return (
    <ExchangeRateScreenLayout
      chartSection={
        <>
          <InteractiveLineChart
            points={chartPoints}
            animated={true}
            gradientFillColors={[
              shared.gradientBackgroundColor,
              theme.dark ? 'transparent' : White,
            ]}
            enablePanGesture={true}
            panGestureDelay={100}
            onGestureStart={onGestureStarted}
            onPointSelected={onPointSelected}
            onGestureEnd={onGestureEnd}
            TopAxisLabel={MaxAxisLabel}
            BottomAxisLabel={MinAxisLabel}
            SelectionDot={ChartSelectionDot}
            color={shared.chartLineColor}
            isLoading={isChartLoading}
          />

          <UkExchangeRateDisclosures />

          <TimeframeSelector
            options={fiatChartTimeframeOptions}
            selected={selectedTimeframe}
            horizontalInset={ScreenGutter}
            onSelect={setSelectedTimeframe}
          />
        </>
      }
      changeRow={{
        percent: percentChangeToDisplay,
        deltaFiatFormatted: priceChangeToDisplay,
        rangeLabel: rangeOrSelectedPointLabel,
      }}
      isRefreshing={isRefreshing}
      marketPriceDisplay={formattedMarketPrice}
      onRefresh={onRefresh}
      shared={shared}
      topValue={formattedTopPrice}
      topValueIsLarge={topValueIsLarge}
    />
  );
};

export default ExchangeRateScreen;

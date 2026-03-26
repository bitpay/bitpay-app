import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import type {GraphPoint} from 'react-native-graph';
import {useTheme} from 'styled-components/native';
import ChartAxisLabel from '../../../../components/charts/ChartAxisLabel';
import ChartSelectionDot from '../../../../components/charts/ChartSelectionDot';
import InteractiveLineChart, {
  type InteractiveLineChartAxisLabelProps,
} from '../../../../components/charts/InteractiveLineChart';
import TimeframeSelector from '../../../../components/charts/TimeframeSelector';
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
import {
  fetchFiatRateSeriesAllIntervals,
  fetchFiatRateSeriesInterval,
  refreshFiatRateSeries,
} from '../../../../store/wallet/effects';
import {isCacheKeyStale} from '../../../../store/wallet/utils/wallet';
import {
  calculatePercentageDifference,
  formatFiatAmount,
} from '../../../../utils/helper-methods';
import {useAppDispatch} from '../../../../utils/hooks';
import {shouldUseCompactFiatAmountText} from '../../../../utils/fiatAmountText';
import {getFiatRateSeriesIntervalForTimeframe} from '../../../../utils/portfolio/rate';
import {White} from '../../../../styles/colors';
import useExchangeRateChartData, {
  type ChartDataType,
  defaultDisplayData,
} from '../../hooks/useExchangeRateChartData';
import {getExchangeRateTimeframeChange} from '../ExchangeRate.utils';
import ExchangeRateScreenLayout from './ExchangeRateScreenLayout';
import useAssetScreenRefresh from './useAssetScreenRefresh';
import type {ExchangeRateSharedModel} from './useExchangeRateSharedModel';

type ExchangeRateScreenProps = {
  shared: ExchangeRateSharedModel;
};

const ExchangeRateScreen = ({shared}: ExchangeRateScreenProps) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const fiatRateSeriesCacheRef = useRef(shared.fiatRateSeriesCache);
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
  const allIntervalsFetchRequestIdRef = useRef(0);
  const allIntervalsFetchInFlightRef = useRef(false);
  const [allIntervalsFetchCycle, setAllIntervalsFetchCycle] = useState(0);

  const fiatChartTimeframeOptions = useMemo(
    () => getFiatChartTimeframeOptions(t),
    [t],
  );

  useEffect(() => {
    fiatRateSeriesCacheRef.current = shared.fiatRateSeriesCache;
  }, [shared.fiatRateSeriesCache]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      allIntervalsFetchInFlightRef.current = false;
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

  const selectedSeries = shared.fiatRateSeriesCache[selectedSeriesKey];

  useEffect(() => {
    const requestId = allIntervalsFetchRequestIdRef.current + 1;
    allIntervalsFetchRequestIdRef.current = requestId;

    if (!shared.resolvedQuoteCurrency || !shared.hasValidNormalizedCoin) {
      allIntervalsFetchInFlightRef.current = false;
      return;
    }

    const hasFreshAllIntervals = FIAT_RATE_SERIES_CACHED_INTERVALS.every(
      interval => {
        const cacheKey = getFiatRateSeriesCacheKey(
          shared.resolvedQuoteCurrency,
          shared.normalizedCoin,
          interval,
          shared.historicalRateIdentity,
        );
        const cachedSeries = fiatRateSeriesCacheRef.current[cacheKey];
        if (!cachedSeries?.fetchedOn) {
          return false;
        }

        return !isCacheKeyStale(
          cachedSeries.fetchedOn,
          HISTORIC_RATES_CACHE_DURATION,
        );
      },
    );
    if (hasFreshAllIntervals) {
      allIntervalsFetchInFlightRef.current = false;
      return;
    }

    allIntervalsFetchInFlightRef.current = true;

    dispatch(
      fetchFiatRateSeriesAllIntervals({
        fiatCode: shared.resolvedQuoteCurrency,
        currencyAbbreviation: shared.assetContext.currencyAbbreviation,
        ...shared.historicalRateIdentity,
      }),
    ).finally(() => {
      if (allIntervalsFetchRequestIdRef.current !== requestId) {
        return;
      }
      allIntervalsFetchInFlightRef.current = false;
      if (!isMountedRef.current) {
        return;
      }
      setAllIntervalsFetchCycle(current => current + 1);
    });
  }, [
    dispatch,
    shared.assetContext.currencyAbbreviation,
    shared.hasValidNormalizedCoin,
    shared.historicalRateIdentity,
    shared.normalizedCoin,
    shared.resolvedQuoteCurrency,
  ]);

  useEffect(() => {
    if (!shared.resolvedQuoteCurrency || !shared.hasValidNormalizedCoin) {
      return;
    }

    if (allIntervalsFetchInFlightRef.current) {
      return;
    }

    const hasFreshPoints = Boolean(
      selectedSeries?.points?.length &&
        selectedSeries?.fetchedOn &&
        !isCacheKeyStale(
          selectedSeries.fetchedOn,
          HISTORIC_RATES_CACHE_DURATION,
        ),
    );
    if (hasFreshPoints) {
      return;
    }

    dispatch(
      fetchFiatRateSeriesInterval({
        fiatCode: shared.resolvedQuoteCurrency,
        interval: seriesDataInterval,
        coinForCacheCheck: shared.normalizedCoin,
        ...shared.historicalRateIdentity,
      }),
    );
  }, [
    allIntervalsFetchCycle,
    dispatch,
    selectedSeries,
    seriesDataInterval,
    shared.hasValidNormalizedCoin,
    shared.historicalRateIdentity,
    shared.normalizedCoin,
    shared.resolvedQuoteCurrency,
  ]);

  const {pointsForChartRaw, displayData: derivedDisplayData} =
    useExchangeRateChartData({
      selectedSeriesPoints: selectedSeries?.points,
      selectedTimeframe,
      seriesDataInterval,
      currentFiatRate: shared.currentFiatRate,
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
    setIsChartLoading(!hasUsableData);
  }, [derivedDisplayData, pointsForChartRaw]);

  const rangeLabel = useMemo(() => {
    return getRangeLabelForFiatTimeframe(t, selectedTimeframe);
  }, [selectedTimeframe, t]);

  const rangeOrSelectedPointLabel = useMemo(() => {
    const firstTimestamp = selectedSeries?.points?.[0]?.ts;
    const lastTimestamp =
      selectedSeries?.points?.[(selectedSeries.points?.length || 1) - 1]?.ts;
    const displayedRangeMs =
      typeof firstTimestamp === 'number' &&
      typeof lastTimestamp === 'number' &&
      Number.isFinite(firstTimestamp) &&
      Number.isFinite(lastTimestamp)
        ? Math.max(0, lastTimestamp - firstTimestamp)
        : undefined;

    return formatRangeOrSelectedPointLabel({
      rangeLabel,
      selectedTimeframe,
      selectedDate: selectedPoint?.date,
      displayedRangeMs,
    });
  }, [
    rangeLabel,
    selectedPoint?.date,
    selectedSeries?.points,
    selectedTimeframe,
  ]);

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
      fiatRateSeriesCache: shared.fiatRateSeriesCache,
      fiatCode: shared.resolvedQuoteCurrency,
      normalizedCoin: shared.normalizedCoin,
      timeframe: selectedTimeframe,
      currentRate: shared.currentFiatRate,
      historicalRateIdentity: shared.historicalRateIdentity,
    });
  }, [
    selectedTimeframe,
    shared.currentFiatRate,
    shared.fiatRateSeriesCache,
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

  const MinAxisLabel = useCallback(
    ({width}: InteractiveLineChartAxisLabelProps) => {
      const nextDisplayData = displayDataRef.current;
      if (
        !nextDisplayData.data.length ||
        nextDisplayData.renderedMinPoint?.point.value == null
      ) {
        return null;
      }

      return (
        <ChartAxisLabel
          width={width}
          value={nextDisplayData.renderedMinPoint.point.value}
          index={nextDisplayData.renderedMinPoint.index}
          arrayLength={nextDisplayData.data.length}
          quoteCurrency={quoteCurrencyRef.current}
          currencyAbbreviation={currencyAbbreviationRef.current}
          type="min"
        />
      );
    },
    [],
  );

  const MaxAxisLabel = useCallback(
    ({width}: InteractiveLineChartAxisLabelProps) => {
      const nextDisplayData = displayDataRef.current;
      if (
        !nextDisplayData.data.length ||
        nextDisplayData.renderedMaxPoint?.point.value == null
      ) {
        return null;
      }

      return (
        <ChartAxisLabel
          width={width}
          value={nextDisplayData.renderedMaxPoint.point.value}
          index={nextDisplayData.renderedMaxPoint.index}
          arrayLength={nextDisplayData.data.length}
          quoteCurrency={quoteCurrencyRef.current}
          currencyAbbreviation={currencyAbbreviationRef.current}
          type="max"
        />
      );
    },
    [],
  );

  const onPointSelected = useCallback(
    (point: GraphPoint) => {
      if (!gestureStarted.current || !chartPoints.length) {
        return;
      }
      const baselineValue =
        timeframeChange?.baselineRate ?? chartPoints[0]?.value ?? point.value;
      const percentChangeAtPoint = calculatePercentageDifference(
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

    const cacheKey = getFiatRateSeriesCacheKey(
      shared.resolvedQuoteCurrency,
      shared.normalizedCoin,
      seriesDataInterval,
      shared.historicalRateIdentity,
    );
    const cached = shared.fiatRateSeriesCache[cacheKey];
    const isStale = cached
      ? isCacheKeyStale(cached.fetchedOn, HISTORIC_RATES_CACHE_DURATION)
      : true;

    if (!cached?.points?.length || isStale) {
      await dispatch(
        fetchFiatRateSeriesInterval({
          fiatCode: shared.resolvedQuoteCurrency,
          interval: seriesDataInterval,
          coinForCacheCheck: shared.normalizedCoin,
          force: true,
          ...shared.historicalRateIdentity,
        }),
      );
      return;
    }

    const didAppend = await dispatch(
      refreshFiatRateSeries({
        fiatCode: shared.resolvedQuoteCurrency,
        currencyAbbreviation: shared.assetContext.currencyAbbreviation,
        interval: seriesDataInterval,
        spotRate: shared.currentFiatRate,
        ...shared.historicalRateIdentity,
      }),
    );
    if (!didAppend) {
      await dispatch(
        fetchFiatRateSeriesInterval({
          fiatCode: shared.resolvedQuoteCurrency,
          interval: seriesDataInterval,
          coinForCacheCheck: shared.normalizedCoin,
          force: true,
          ...shared.historicalRateIdentity,
        }),
      );
    }
  }, [
    dispatch,
    seriesDataInterval,
    shared.assetContext.currencyAbbreviation,
    shared.currentFiatRate,
    shared.fiatRateSeriesCache,
    shared.hasValidNormalizedCoin,
    shared.historicalRateIdentity,
    shared.normalizedCoin,
    shared.resolvedQuoteCurrency,
  ]);

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

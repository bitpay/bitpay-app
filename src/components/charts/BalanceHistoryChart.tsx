import React from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from 'styled-components/native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import type {FiatRateInterval, Rates} from '../../store/rate/rate.models';
import type {Wallet} from '../../store/wallet/wallet.models';
import {
  DEFAULT_BALANCE_CHART_TIMEFRAME,
  getFiatChartTimeframeOptions,
} from './fiatTimeframes';
import TimeframeSelector from './TimeframeSelector';
import InteractiveLineChart, {
  type InteractiveLineChartAxisLabelProps,
} from './InteractiveLineChart';
import ChartSelectionDot from './ChartSelectionDot';
import ChartChangeRow from './ChartChangeRow';
import {Action, LinkBlue, White} from '../../styles/colors';
import {isNumberSharedValue, type NumberSharedValue} from './sharedValueGuards';
import {
  BALANCE_HISTORY_CHART_SCOPE_IDENTITY_KEY,
  type HydratedBalanceChartSeries,
} from '../../utils/portfolio/chartCache';
import {useStableBalanceHistoryChartAxisLabels} from './useStableBalanceHistoryChartAxisLabels';
import {usePortfolioBalanceChartScope} from '../../portfolio/ui/hooks/usePortfolioBalanceChartScope';
import useBalanceChartDisplayModel, {
  type BalanceChartCallbackAnalysisPoint,
} from './useBalanceChartDisplayModel';
import type {ChangeRowData} from './balanceHistoryChartSelection';

const ZERO_BALANCE_AXIS_LABEL_FADE_MS = 180;

export type BalanceHistoryChartProps = {
  wallets: Wallet[];
  quoteCurrency: string;
  initialSelectedTimeframe?: FiatRateInterval;
  rates?: Rates;
  lineColor?: string;
  lineThickness?: number;
  strokeScale?: number | NumberSharedValue;
  minStrokeScale?: number;
  gradientStartColor?: string;
  showLoaderWhenNoSnapshots?: boolean;
  renderZeroBalanceWhenNoSnapshots?: boolean;
  isBalanceChartDataReadyToQuery?: boolean;
  balanceOffset?: number;
  onSelectedBalanceChange?: (balance?: number) => void;
  preChartContent?: React.ReactNode;
  preChartContentTopMargin?: number;
  postChartContent?: React.ReactNode;
  changeRowStyle?: StyleProp<ViewStyle>;
  showChangeRow?: boolean;
  showTimeframeSelector?: boolean;
  timeframeSelectorOpacity?: number | NumberSharedValue;
  timeframeSelectorHorizontalInset?: string;
  timeframeSelectorWidth?: number;
  disablePanGesture?: boolean;
  onChangeRowData?: (data: ChangeRowData | undefined) => void;
  onDisplayedAnalysisPointChange?: (
    point?: BalanceChartCallbackAnalysisPoint,
  ) => void;
  onRenderableSeriesChange?: (hasRenderableSeries: boolean) => void;
  axisLabelOpacity?: number | NumberSharedValue;
  onSelectedTimeframeChange?: (timeframe: FiatRateInterval) => void;
  onSelectionActiveChange?: (active: boolean) => void;
};

const isZeroBalanceSeries = (series?: HydratedBalanceChartSeries): boolean => {
  const points = series?.graphPoints || [];
  return (
    points.length >= 2 && points.every(point => Number(point?.value) === 0)
  );
};

const BalanceHistoryChart = ({
  wallets,
  quoteCurrency,
  initialSelectedTimeframe = DEFAULT_BALANCE_CHART_TIMEFRAME,
  rates: _rates,
  lineColor,
  lineThickness,
  strokeScale,
  minStrokeScale,
  gradientStartColor,
  showLoaderWhenNoSnapshots = false,
  renderZeroBalanceWhenNoSnapshots = false,
  isBalanceChartDataReadyToQuery = true,
  balanceOffset = 0,
  onSelectedBalanceChange,
  preChartContent,
  preChartContentTopMargin = 22,
  postChartContent,
  changeRowStyle,
  showChangeRow = true,
  showTimeframeSelector = true,
  timeframeSelectorOpacity = 1,
  timeframeSelectorHorizontalInset,
  timeframeSelectorWidth,
  disablePanGesture = false,
  onChangeRowData,
  onDisplayedAnalysisPointChange,
  onRenderableSeriesChange,
  axisLabelOpacity = 1,
  onSelectedTimeframeChange,
  onSelectionActiveChange,
}: BalanceHistoryChartProps): React.ReactElement | null => {
  const {t} = useTranslation();
  const theme = useTheme();
  const scope = usePortfolioBalanceChartScope({
    wallets,
    balanceOffset,
    scopeIdentityKey: BALANCE_HISTORY_CHART_SCOPE_IDENTITY_KEY,
    quoteCurrency,
    rates: _rates,
  });
  const displayModel = useBalanceChartDisplayModel({
    scope,
    initialSelectedTimeframe,
    balanceOffset,
    showLoaderWhenNoSnapshots,
    renderZeroBalanceWhenNoSnapshots,
    isBalanceChartDataReadyToQuery,
    t,
    onSelectedBalanceChange,
    onChangeRowData,
    onDisplayedAnalysisPointChange,
    onSelectedTimeframeChange,
    onSelectionActiveChange,
  });

  React.useEffect(() => {
    onRenderableSeriesChange?.(displayModel.hasRenderableSeries);
  }, [displayModel.hasRenderableSeries, onRenderableSeriesChange]);

  const {MaxAxisLabel, MinAxisLabel} = useStableBalanceHistoryChartAxisLabels({
    activeSeries: displayModel.visibleSeries,
    axisLabelOpacity,
    quoteCurrency: displayModel.visibleQuoteCurrency,
  });
  const shouldHideAxisLabels = isZeroBalanceSeries(displayModel.visibleSeries);
  const zeroBalanceAxisLabelOpacity = useDerivedValue(
    () =>
      withTiming(shouldHideAxisLabels ? 0 : 1, {
        duration: ZERO_BALANCE_AXIS_LABEL_FADE_MS,
      }),
    [shouldHideAxisLabels],
  );
  const maxAxisLabelZeroBalanceAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: zeroBalanceAxisLabelOpacity.value,
    }),
    [zeroBalanceAxisLabelOpacity],
  );
  const minAxisLabelZeroBalanceAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: zeroBalanceAxisLabelOpacity.value,
    }),
    [zeroBalanceAxisLabelOpacity],
  );
  const FadingMaxAxisLabel = React.useCallback(
    (props: InteractiveLineChartAxisLabelProps) => (
      <Animated.View
        style={[{width: '100%'}, maxAxisLabelZeroBalanceAnimatedStyle]}>
        <MaxAxisLabel {...props} />
      </Animated.View>
    ),
    [MaxAxisLabel, maxAxisLabelZeroBalanceAnimatedStyle],
  );
  const FadingMinAxisLabel = React.useCallback(
    (props: InteractiveLineChartAxisLabelProps) => (
      <Animated.View
        style={[{width: '100%'}, minAxisLabelZeroBalanceAnimatedStyle]}>
        <MinAxisLabel {...props} />
      </Animated.View>
    ),
    [MinAxisLabel, minAxisLabelZeroBalanceAnimatedStyle],
  );

  const chartColor = lineColor || (theme.dark ? LinkBlue : Action);
  const gradientBackgroundColor =
    gradientStartColor || (theme.dark ? 'transparent' : White);

  const sharedTimeframeSelectorOpacity = isNumberSharedValue(
    timeframeSelectorOpacity,
  )
    ? timeframeSelectorOpacity
    : undefined;
  const timeframeSelectorOpacityNumber =
    typeof timeframeSelectorOpacity === 'number' &&
    Number.isFinite(timeframeSelectorOpacity)
      ? timeframeSelectorOpacity
      : 1;

  const timeframeSelectorAnimatedStyle = useAnimatedStyle(() => {
    const sharedOpacity = sharedTimeframeSelectorOpacity?.value;
    return {
      opacity:
        typeof sharedOpacity === 'number' && Number.isFinite(sharedOpacity)
          ? sharedOpacity
          : timeframeSelectorOpacityNumber,
    };
  }, [sharedTimeframeSelectorOpacity, timeframeSelectorOpacityNumber]);

  if (
    !preChartContent &&
    (!displayModel.hasAnyWallets ||
      (!displayModel.hasRenderableSeries && !displayModel.shouldShowLoader))
  ) {
    return null;
  }

  return (
    <>
      {showChangeRow ? (
        <ChartChangeRow
          percent={displayModel.displayedChangeRowData?.percent ?? 0}
          deltaFiatFormatted={
            displayModel.displayedChangeRowData?.deltaFiatFormatted
          }
          rangeLabel={displayModel.displayedChangeRowData?.rangeLabel}
          style={[
            changeRowStyle,
            !displayModel.displayedChangeRowData ? {opacity: 0} : null,
          ]}
        />
      ) : null}

      {preChartContent ? (
        <View style={{marginTop: preChartContentTopMargin}}>
          {preChartContent}
        </View>
      ) : null}

      <InteractiveLineChart
        points={displayModel.visibleSeries?.graphPoints || []}
        color={chartColor}
        lineThickness={lineThickness}
        strokeScale={strokeScale}
        minStrokeScale={minStrokeScale}
        gradientFillColors={[
          gradientBackgroundColor,
          theme.dark ? 'transparent' : White,
        ]}
        showFirstPointGuideLine={displayModel.hasRenderableSeries}
        firstPointGuideLineOpacity={zeroBalanceAxisLabelOpacity}
        isLoading={displayModel.shouldShowLoader}
        hideLineWhileLoading={!displayModel.hasRenderableSeries}
        enablePanGesture={
          !displayModel.isLoading &&
          !disablePanGesture &&
          displayModel.hasRenderableSeries
        }
        animated={true}
        SelectionDot={ChartSelectionDot}
        TopAxisLabel={FadingMaxAxisLabel}
        BottomAxisLabel={FadingMinAxisLabel}
        onGestureStart={displayModel.onGestureStarted}
        onGestureEnd={displayModel.onGestureEnded}
        onPointSelected={displayModel.onPointSelected}
      />

      {postChartContent}

      {showTimeframeSelector ? (
        <Animated.View style={timeframeSelectorAnimatedStyle}>
          <TimeframeSelector
            options={getFiatChartTimeframeOptions(t)}
            selected={displayModel.selectedTimeframe}
            width={timeframeSelectorWidth}
            horizontalInset={timeframeSelectorHorizontalInset}
            onSelect={displayModel.onTimeframeSelect}
          />
        </Animated.View>
      ) : null}
    </>
  );
};

export default BalanceHistoryChart;

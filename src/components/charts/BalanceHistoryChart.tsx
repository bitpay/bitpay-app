import React from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../contexts';
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
import {ZERO_BALANCE_AXIS_LABEL_FADE_MS} from './chartLayout';
import BalanceChartSkeleton, {
  BalanceChartErrorCaption,
  BalanceChartPopulateCaption,
  type BalanceChartSkeletonVariant,
} from './BalanceChartSkeleton';
import {useAppDispatch} from '../../utils/hooks';
import {maybePopulatePortfolioForWallets} from '../../store/portfolio';
import type {PortfolioPopulateProgress} from '../../utils/portfolio/assets';
import {formatUnknownError} from '../../utils/errors/formatUnknownError';
import {logManager} from '../../managers/LogManager';

export type BalanceHistoryChartProps = {
  enabled?: boolean;
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
  preserveVisibleSeriesWhileNotReady?: boolean;
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
  /**
   * Reports when the chart is showing its own error state (no line, query
   * failed). Screens that hide the chart behind a loading placeholder use it
   * to reveal the chart so the Retry action is reachable.
   */
  onErrorStateChange?: (showErrorState: boolean) => void;
  /** Populate wallet counts for this chart's scope, shown under the skeleton. */
  populateProgress?: PortfolioPopulateProgress;
  /**
   * Loading skeleton animation. Screens that keep this chart mounted invisibly
   * behind their own loading placeholder pass `static` so only one ghost line
   * animates. The error state is always static.
   */
  skeletonVariant?: BalanceChartSkeletonVariant;
  /**
   * Hide the skeleton caption (populate counts, error message + Retry), e.g.
   * while the Home chart is collapsed to a non-interactive thumbnail.
   */
  hideSkeletonCaption?: boolean;
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
  enabled = true,
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
  preserveVisibleSeriesWhileNotReady = false,
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
  onErrorStateChange,
  populateProgress,
  skeletonVariant = 'drawing',
  hideSkeletonCaption = false,
  axisLabelOpacity = 1,
  onSelectedTimeframeChange,
  onSelectionActiveChange,
}: BalanceHistoryChartProps): React.ReactElement | null => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const activeScope = usePortfolioBalanceChartScope({
    enabled,
    wallets,
    balanceOffset,
    scopeIdentityKey: BALANCE_HISTORY_CHART_SCOPE_IDENTITY_KEY,
    quoteCurrency,
    rates: _rates,
  });
  const lastEnabledScopeRef = React.useRef(activeScope);
  if (enabled) {
    lastEnabledScopeRef.current = activeScope;
  }
  const scope = enabled ? activeScope : lastEnabledScopeRef.current;
  const displayModel = useBalanceChartDisplayModel({
    enabled,
    scope,
    initialSelectedTimeframe,
    balanceOffset,
    showLoaderWhenNoSnapshots,
    renderZeroBalanceWhenNoSnapshots,
    isBalanceChartDataReadyToQuery,
    preserveVisibleSeriesWhileNotReady,
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

  React.useEffect(() => {
    onErrorStateChange?.(displayModel.showErrorState);
  }, [displayModel.showErrorState, onErrorStateChange]);

  const walletsRef = React.useRef(wallets);
  walletsRef.current = wallets;
  const retryDisplayModelQuery = displayModel.retry;
  const onRetry = React.useCallback(() => {
    retryDisplayModelQuery();
    // Same scoped populate the Key/Account/Wallet pull-to-refresh runs. It is
    // a no-op when the scope's history is already current.
    const walletIds = (walletsRef.current || [])
      .map(wallet => wallet?.id)
      .filter((walletId): walletId is string => !!walletId);
    if (!walletIds.length) {
      return;
    }
    Promise.resolve(
      dispatch(
        maybePopulatePortfolioForWallets({
          walletIds,
          quoteCurrency,
          forceRetryQuarantined: true,
        }) as any,
      ),
    ).catch(error => {
      logManager.warn(
        `[portfolio] Failed balance chart retry populate: ${formatUnknownError(
          error,
        )}`,
      );
    });
  }, [dispatch, quoteCurrency, retryDisplayModelQuery]);

  const hasPopulateCaption =
    !hideSkeletonCaption &&
    displayModel.showSkeleton &&
    !!populateProgress?.total;
  const populateCompleted = hasPopulateCaption
    ? populateProgress?.completed ?? 0
    : 0;
  const populateTotal = hasPopulateCaption ? populateProgress?.total ?? 0 : 0;
  const chartPlaceholder = React.useMemo(() => {
    if (displayModel.showErrorState) {
      return (
        <BalanceChartSkeleton
          variant="static"
          isLoading={false}
          caption={
            hideSkeletonCaption ? undefined : (
              <BalanceChartErrorCaption onRetry={onRetry} />
            )
          }
        />
      );
    }
    if (displayModel.showSkeleton) {
      return (
        <BalanceChartSkeleton
          variant={skeletonVariant}
          caption={
            populateTotal > 0 ? (
              <BalanceChartPopulateCaption
                completed={populateCompleted}
                total={populateTotal}
              />
            ) : undefined
          }
        />
      );
    }
    return null;
  }, [
    displayModel.showErrorState,
    displayModel.showSkeleton,
    hideSkeletonCaption,
    onRetry,
    populateCompleted,
    populateTotal,
    skeletonVariant,
  ]);

  const {MaxAxisLabel, MinAxisLabel} = useStableBalanceHistoryChartAxisLabels({
    activeSeries: displayModel.visibleSeries,
    axisLabelOpacity,
    quoteCurrency: displayModel.visibleQuoteCurrency,
  });
  const shouldHideAxisLabels =
    !displayModel.hasRenderableSeries ||
    isZeroBalanceSeries(displayModel.visibleSeries);
  const zeroBalanceAxisLabelOpacity = useDerivedValue(() =>
    withTiming(shouldHideAxisLabels ? 0 : 1, {
      duration: ZERO_BALANCE_AXIS_LABEL_FADE_MS,
    }),
  );
  const maxAxisLabelZeroBalanceAnimatedStyle = useAnimatedStyle(() => ({
    opacity: zeroBalanceAxisLabelOpacity.value,
  }));
  const minAxisLabelZeroBalanceAnimatedStyle = useAnimatedStyle(() => ({
    opacity: zeroBalanceAxisLabelOpacity.value,
  }));
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
  });

  if (
    !preChartContent &&
    (!displayModel.hasAnyWallets ||
      (!displayModel.hasRenderableSeries &&
        !displayModel.showSkeleton &&
        !displayModel.showErrorState))
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
          maskDeltaWhenBalancesHidden
          visible={!!displayModel.displayedChangeRowData}
          style={changeRowStyle}
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
        firstPointGuideLineOpacity={
          zeroBalanceAxisLabelOpacity as NumberSharedValue
        }
        isLoading={displayModel.showSkeleton || displayModel.isRefreshing}
        hideLineWhileLoading={!displayModel.hasRenderableSeries}
        placeholder={chartPlaceholder}
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

export default React.memo(BalanceHistoryChart);

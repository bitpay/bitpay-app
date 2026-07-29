import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useTheme} from '../../../../contexts';
import {BaseText, H2} from '../../../../components/styled/Text';
import {SlateDark, White} from '../../../../styles/colors';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {shouldUseCompactFiatAmountText} from '../../../../utils/fiatAmountText';
import InfoSvg from './InfoSvg';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {
  setHomeChartCollapsed,
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../../store/app/app.actions';
import {selectShowPortfolioValue} from '../../../../store/app/app.selectors';
import BalanceHistoryChart, {
  type BalanceHistoryChartProps,
} from '../../../../components/charts/BalanceHistoryChart';
import {DEFAULT_BALANCE_CHART_TIMEFRAME} from '../../../../components/charts/fiatTimeframes';
import {useHasCachedBalanceHistoryChartSeries} from '../../../../components/charts/balanceHistoryChartSeriesCache';
import Percentage from '../../../../components/percentage/Percentage';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  StyleSheet,
  View,
  type LayoutRectangle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  HIDDEN_BALANCE_MASK,
  maskIfHidden,
} from '../../../../utils/hideBalances';
import {
  getVisibleKeysFromKeys,
  getVisibleWalletsFromKeys,
} from '../../../../utils/portfolio/assets';
import {resolveActivePortfolioDisplayQuoteCurrency} from '../../../../portfolio/ui/common';
import usePortfolioBalanceChartSurface from '../../../../portfolio/ui/hooks/usePortfolioBalanceChartSurface';
import usePortfolioBalanceChartReadiness from '../../../../portfolio/ui/hooks/usePortfolioBalanceChartReadiness';
import usePortfolioBalanceChartEligibleWallets from '../../../../portfolio/ui/hooks/usePortfolioBalanceChartEligibleWallets';
import type {FiatRateInterval} from '../../../../store/rate/rate.models';
import type {Key, Wallet} from '../../../../store/wallet/wallet.models';
import type {Rates} from '../../../../store/rate/rate.models';
import CollapseContentButton from './CollapseContentButton';
import useLegacyLastDayChangeRowData from '../../../../components/charts/useLegacyLastDayChangeRowData';

const portfolioStyles = StyleSheet.create({
  portfolioContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  portfolioTopContent: {
    width: '100%',
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  chartStage: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  collapseButtonContainer: {
    position: 'absolute',
    right: 12,
    top: 27,
    zIndex: 30,
  },
});

const PortfolioContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={portfolioStyles.portfolioContainer}>{children}</View>;

const PortfolioTopContent: React.FC<{
  $leftAligned?: boolean;
  children?: React.ReactNode;
}> = ({$leftAligned, children}) => (
  <View
    style={[
      portfolioStyles.portfolioTopContent,
      {alignItems: $leftAligned ? 'flex-start' : 'center'},
    ]}>
    {children}
  </View>
);

const ChartStage: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[portfolioStyles.chartStage, style]} {...rest} />;

const CollapseButtonContainer: React.FC<
  React.ComponentProps<typeof Animated.View>
> = ({style, ...rest}) => (
  <Animated.View
    style={[portfolioStyles.collapseButtonContainer, style]}
    {...rest}
  />
);

const HOME_BALANCE_LINE_CHART_HEIGHT = 220;
const HOME_BALANCE_TIMEFRAME_SELECTOR_TOP_MARGIN = 5;
const HOME_BALANCE_TIMEFRAME_SELECTOR_HEIGHT = 34;
const HOME_BALANCE_EXPANDED_CHART_HEIGHT =
  HOME_BALANCE_LINE_CHART_HEIGHT +
  HOME_BALANCE_TIMEFRAME_SELECTOR_TOP_MARGIN +
  HOME_BALANCE_TIMEFRAME_SELECTOR_HEIGHT;
const EMPTY_BACKGROUND_KEYS: Record<string, Key> = {};
const EMPTY_BACKGROUND_RATES: Rates = {};

const headerStyles = StyleSheet.create({
  portfolioBalanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioBalanceTitle: {
    marginRight: 3,
    fontSize: 13,
    lineHeight: 18,
  },
  portfolioBalanceText: {
    fontWeight: '700',
    marginVertical: 2,
  },
  hiddenBalance: {
    lineHeight: 50,
    marginVertical: 6,
  },
  portfolioBalanceChangeRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const PortfolioBalanceHeader: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity
    style={[headerStyles.portfolioBalanceHeader, style]}
    {...rest}
  />
);

const PortfolioBalanceTitle: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        headerStyles.portfolioBalanceTitle,
        {color: theme.dark ? White : SlateDark},
      ]}>
      {children}
    </BaseText>
  );
};

const PortfolioBalanceText: React.FC<{
  $isCompact?: boolean;
  children?: React.ReactNode;
}> = ({$isCompact, children}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        headerStyles.portfolioBalanceText,
        {
          fontSize: $isCompact ? 26 : 39,
          lineHeight: $isCompact ? 38 : 59,
          color: theme.colors.text,
        },
      ]}>
      {children}
    </BaseText>
  );
};

const HiddenBalance: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <H2 style={headerStyles.hiddenBalance}>{children}</H2>
);

const PortfolioBalanceChangeRowContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View
    style={[headerStyles.portfolioBalanceChangeRowContainer, style]}
    {...rest}
  />
);

type PortfolioBalanceChangeRowProps = {
  percent: number;
  deltaFiatFormatted?: string;
  rangeLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const PortfolioBalanceChangeRow = ({
  percent,
  deltaFiatFormatted,
  rangeLabel,
  style,
}: PortfolioBalanceChangeRowProps): React.ReactElement => {
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const displayedDelta =
    hideAllBalances && deltaFiatFormatted
      ? HIDDEN_BALANCE_MASK
      : deltaFiatFormatted;

  return (
    <PortfolioBalanceChangeRowContainer
      testID="portfolio-balance-change-row"
      style={style}>
      <Percentage
        percentageDifference={percent}
        hideArrow
        hideSign
        priceChange={displayedDelta}
        rangeLabel={rangeLabel}
        fractionDigits={2}
      />
    </PortfolioBalanceChangeRowContainer>
  );
};

type PortfolioBalanceProps = {
  active?: boolean;
};

const PortfolioBalanceContent = ({active = true}: PortfolioBalanceProps) => {
  const {t} = useTranslation();
  const coinbaseBalance =
    useAppSelector(({COINBASE}) => COINBASE.balance[COINBASE_ENV]) || 0.0;

  const subscribedKeys = useSelector(({WALLET}: RootState) =>
    active ? WALLET.keys : EMPTY_BACKGROUND_KEYS,
  ) as Record<string, Key>;
  const subscribedRates = useSelector(({RATE}: RootState) =>
    active ? RATE.rates : EMPTY_BACKGROUND_RATES,
  ) as Rates;
  const lastActiveKeysRef = React.useRef(subscribedKeys);
  const lastActiveRatesRef = React.useRef(subscribedRates);
  if (active) {
    lastActiveKeysRef.current = subscribedKeys;
    lastActiveRatesRef.current = subscribedRates;
  }
  const keys = lastActiveKeysRef.current;
  const rates = lastActiveRatesRef.current;

  const showPortfolioValue = useAppSelector(selectShowPortfolioValue);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const persistedHomeChartCollapsed = useAppSelector(
    ({APP}) => APP.homeChartCollapsed,
  );
  const homeChartRemountNonce = useAppSelector(
    ({APP}) => APP.homeChartRemountNonce,
  );

  const [isChartCollapsed, setIsChartCollapsed] = useState(
    persistedHomeChartCollapsed,
  );
  const [isCollapseButtonActive, setIsCollapseButtonActive] = useState(false);
  const collapseProgress = useSharedValue(persistedHomeChartCollapsed ? 1 : 0);
  const [chartBlockHeight, setChartBlockHeight] = useState(0);
  const [chartStageWidth, setChartStageWidth] = useState(0);
  const [chartStageY, setChartStageY] = useState(0);
  const collapseButtonPressOpacity = useSharedValue(1);
  const [collapseButtonLayout, setCollapseButtonLayout] =
    useState<LayoutRectangle>();
  const [chartHasRenderableSeries, setChartHasRenderableSeries] =
    useState(false);
  const selectedChartTimeframeRef = React.useRef<FiatRateInterval>(
    DEFAULT_BALANCE_CHART_TIMEFRAME,
  );

  const visibleKeys = useMemo(
    () => getVisibleKeysFromKeys(keys, homeCarouselConfig),
    [homeCarouselConfig, keys],
  );

  const visibleKeyIdsSig = visibleKeys
    .map(key => String(key?.id || ''))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join(',');

  const walletsAcrossKeys: Wallet[] = useMemo(() => {
    return getVisibleWalletsFromKeys(keys, homeCarouselConfig);
  }, [homeCarouselConfig, keys]);

  const visibleCurrentBalance = walletsAcrossKeys.reduce(
    (total, wallet) => total + (Number(wallet?.balance?.fiat) || 0),
    0,
  );
  const totalBalanceIncludingCoinbase: number =
    visibleCurrentBalance + coinbaseBalance;

  const dispatch = useAppDispatch();
  const portfolioChartsRequested = showPortfolioValue === true;
  const quoteCurrency = resolveActivePortfolioDisplayQuoteCurrency({
    defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
  });
  const cacheEligibleHomeWallets = usePortfolioBalanceChartEligibleWallets({
    wallets: walletsAcrossKeys,
    enabled: portfolioChartsRequested,
  });
  const homeChartWalletIds = useMemo(
    () =>
      cacheEligibleHomeWallets
        .map(wallet => wallet.id)
        .filter(Boolean)
        .sort(),
    [cacheEligibleHomeWallets],
  );
  const hasCachedHomeChart = useHasCachedBalanceHistoryChartSeries({
    walletIds: homeChartWalletIds,
    quoteCurrency,
    timeframe: DEFAULT_BALANCE_CHART_TIMEFRAME,
  });

  const activeBalanceChartReadiness = usePortfolioBalanceChartReadiness({
    wallets: cacheEligibleHomeWallets,
    enabled: active && portfolioChartsRequested,
  });
  const lastActiveBalanceChartReadinessRef = React.useRef(
    activeBalanceChartReadiness,
  );
  if (active) {
    lastActiveBalanceChartReadinessRef.current = activeBalanceChartReadiness;
  }
  const balanceChartReadiness = active
    ? activeBalanceChartReadiness
    : lastActiveBalanceChartReadinessRef.current;
  const chartWalletsAcrossKeys = balanceChartReadiness.chartableWallets;
  const chartWalletIdsSig = chartWalletsAcrossKeys
    .map(wallet => String(wallet?.id || ''))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join(',');
  const balanceChartsEnabled =
    balanceChartReadiness.shouldMountBalanceChart || hasCachedHomeChart;
  const shouldLeftAlignTopSection = balanceChartsEnabled;
  const canCollapseChart = shouldLeftAlignTopSection;
  const shouldApplyChartCollapse =
    shouldLeftAlignTopSection && persistedHomeChartCollapsed;
  const showChartLoaderWhenNoSnapshots =
    !hasCachedHomeChart &&
    (balanceChartReadiness.shouldShowChartLoader ||
      (balanceChartsEnabled &&
        !balanceChartReadiness.shouldPreserveStaleBalanceChart &&
        !chartHasRenderableSeries));
  const collapsedScale = 0.26;
  const fullChartHeight =
    chartBlockHeight || HOME_BALANCE_EXPANDED_CHART_HEIGHT;

  useEffect(() => {
    setIsChartCollapsed(shouldApplyChartCollapse);
    cancelAnimation(collapseProgress);
    collapseProgress.value = shouldApplyChartCollapse ? 1 : 0;
  }, [collapseProgress, shouldApplyChartCollapse]);

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity:
        interpolate(collapseProgress.value, [0, 1], [1, 0]) *
        collapseButtonPressOpacity.value,
    };
  }, []);

  const chartScale = useDerivedValue(() => {
    return interpolate(collapseProgress.value, [0, 1], [1, collapsedScale]);
  }, [collapsedScale]);

  const chartSpacerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(collapseProgress.value, [0, 1], [fullChartHeight, 0]),
    };
  }, [fullChartHeight]);

  const axisLabelOpacity = useDerivedValue(() => {
    return interpolate(collapseProgress.value, [0, 0.08, 1], [1, 0, 0]);
  }, []);

  const timeframeSelectorOpacity = useDerivedValue(() => {
    return interpolate(collapseProgress.value, [0, 0.28, 1], [1, 0, 0]);
  }, []);

  // Fine-tune the final collapsed Y alignment so the mini chart sits perfectly
  // next to the large portfolio balance number (without looking slightly low).
  // Positive values push the chart DOWN; smaller values move it UP.
  const miniChartVerticalNudge = -8;
  const fallbackCollapsedTranslateX = 128;
  const fallbackCollapsedTranslateY =
    -fullChartHeight * 0.72 + miniChartVerticalNudge;
  const targetChartRightInset =
    collapseButtonLayout && chartStageWidth
      ? Math.max(
          0,
          chartStageWidth -
            (collapseButtonLayout.x + collapseButtonLayout.width),
        )
      : 12;
  const collapsedTranslateX =
    chartStageWidth > 0
      ? chartStageWidth * ((1 - collapsedScale) / 2) - targetChartRightInset
      : fallbackCollapsedTranslateX;
  const targetChartTopInStage =
    collapseButtonLayout && chartStageWidth
      ? collapseButtonLayout.y - chartStageY
      : undefined;
  const collapsedTranslateY =
    typeof targetChartTopInStage === 'number'
      ? targetChartTopInStage -
        fullChartHeight * ((1 - collapsedScale) / 2) +
        miniChartVerticalNudge
      : fallbackCollapsedTranslateY;

  const chartWrapperAnimatedStyle = useAnimatedStyle(() => {
    const progress = collapseProgress.value;
    return {
      transform: [
        {
          translateX: interpolate(progress, [0, 1], [0, collapsedTranslateX]),
        },
        {
          translateY: interpolate(progress, [0, 1], [0, collapsedTranslateY]),
        },
        {scale: chartScale.value},
      ],
    };
  }, [collapsedTranslateX, collapsedTranslateY]);

  const persistHomeChartCollapsePreference = useCallback(
    (collapsed: boolean) => {
      dispatch(setHomeChartCollapsed(collapsed));
    },
    [dispatch],
  );

  const runChartCollapseAnimation = useCallback(
    (toCollapsed: boolean) => {
      if (!canCollapseChart) {
        return;
      }
      if (toCollapsed) {
        setIsChartCollapsed(true);
      }

      cancelAnimation(collapseProgress);
      collapseProgress.value = withTiming(
        toCollapsed ? 1 : 0,
        {
          duration: 360,
          easing: Easing.inOut(Easing.cubic),
        },
        finished => {
          if (!finished) {
            return;
          }
          runOnJS(persistHomeChartCollapsePreference)(toCollapsed);
          if (!toCollapsed) {
            runOnJS(setIsChartCollapsed)(false);
          }
        },
      );
    },
    [canCollapseChart, collapseProgress, persistHomeChartCollapsePreference],
  );

  const onCollapseButtonPressIn = useCallback(() => {
    setIsCollapseButtonActive(true);
    cancelAnimation(collapseButtonPressOpacity);
    collapseButtonPressOpacity.value = withTiming(ActiveOpacity, {
      duration: 80,
      easing: Easing.linear,
    });
  }, [collapseButtonPressOpacity]);

  const onCollapseButtonPressOut = useCallback(() => {
    setIsCollapseButtonActive(false);
    cancelAnimation(collapseButtonPressOpacity);
    collapseButtonPressOpacity.value = withTiming(1, {
      duration: 120,
      easing: Easing.linear,
    });
  }, [collapseButtonPressOpacity]);

  const onCollapseChartPress = useCallback(() => {
    setIsCollapseButtonActive(false);
    runChartCollapseAnimation(true);
  }, [runChartCollapseAnimation]);

  const onExpandChartPress = useCallback(() => {
    runChartCollapseAnimation(false);
  }, [runChartCollapseAnimation]);

  const onSelectedChartTimeframeChange = useCallback(
    (timeframe: FiatRateInterval) => {
      selectedChartTimeframeRef.current = timeframe;
    },
    [],
  );

  const collapseChartAccessibilityLabel = t('Collapse portfolio chart');
  const expandChartAccessibilityLabel = t('Expand portfolio chart');
  const chartLifecycleKey = `home-portfolio-charts:${homeChartRemountNonce}:${visibleKeyIdsSig}:${chartWalletIdsSig}`;
  const balanceChartSurface = usePortfolioBalanceChartSurface({
    wallets: chartWalletsAcrossKeys,
    quoteCurrency,
    fallbackBalance: totalBalanceIncludingCoinbase,
    fallbackCurrency: defaultAltCurrency.isoCode,
    enabled: balanceChartsEnabled,
    isBalanceChartDataReadyToQuery:
      balanceChartReadiness.isBalanceChartDataReadyToQuery,
    preserveChartDrivenStateWhileNotReady:
      balanceChartReadiness.shouldPreserveStaleBalanceChart ||
      hasCachedHomeChart,
    resetKey: chartLifecycleKey,
  });
  const commonBalanceHistoryChartProps: BalanceHistoryChartProps = {
    enabled: active,
    wallets: chartWalletsAcrossKeys,
    quoteCurrency,
    initialSelectedTimeframe: selectedChartTimeframeRef.current,
    rates,
    onSelectedTimeframeChange: onSelectedChartTimeframeChange,
    showTimeframeSelector: true,
    timeframeSelectorHorizontalInset: ScreenGutter,
    showLoaderWhenNoSnapshots: showChartLoaderWhenNoSnapshots,
    isBalanceChartDataReadyToQuery:
      balanceChartReadiness.isBalanceChartDataReadyToQuery,
    preserveVisibleSeriesWhileNotReady:
      balanceChartReadiness.shouldPreserveStaleBalanceChart ||
      hasCachedHomeChart,
    // NOTE: Coinbase balance is intentionally excluded from the balance chart
    // (Option B per product requirements) because we do not have historized
    // Coinbase balance snapshots.
    onSelectedBalanceChange:
      balanceChartSurface.chartCallbacks.onSelectedBalanceChange,
    onDisplayedAnalysisPointChange:
      balanceChartSurface.chartCallbacks.onDisplayedAnalysisPointChange,
    onRenderableSeriesChange: setChartHasRenderableSeries,
  };
  const hasInitializedChartLifecycleRef = React.useRef(false);

  useEffect(() => {
    if (!hasInitializedChartLifecycleRef.current) {
      hasInitializedChartLifecycleRef.current = true;
      return;
    }

    setChartHasRenderableSeries(false);
  }, [chartLifecycleKey]);

  useEffect(() => {
    if (balanceChartsEnabled) {
      return;
    }

    setChartHasRenderableSeries(false);
  }, [balanceChartsEnabled]);

  const displayedPortfolioBalance =
    typeof balanceChartSurface.selectedBalance === 'number'
      ? balanceChartSurface.selectedBalance
      : totalBalanceIncludingCoinbase;
  const displayedPortfolioBalanceCurrency = defaultAltCurrency.isoCode;
  const formattedPortfolioBalance = formatFiatAmount(
    displayedPortfolioBalance,
    displayedPortfolioBalanceCurrency,
    {currencyDisplay: 'symbol'},
  );
  const shouldUseCompactPortfolioBalanceText = useMemo(() => {
    return shouldUseCompactFiatAmountText(formattedPortfolioBalance);
  }, [formattedPortfolioBalance]);
  const activeLastDayChangeRowData = useLegacyLastDayChangeRowData({
    wallets: walletsAcrossKeys,
    currentFiatBalance: visibleCurrentBalance,
    quoteCurrency: defaultAltCurrency.isoCode,
    enabled: active && !portfolioChartsRequested,
  });
  const lastDayChangeRowDataRef = React.useRef(activeLastDayChangeRowData);
  if (active) {
    lastDayChangeRowDataRef.current = activeLastDayChangeRowData;
  }
  const lastDayChangeRowData = active
    ? activeLastDayChangeRowData
    : lastDayChangeRowDataRef.current;
  const displayedChangeRowData =
    balanceChartsEnabled && balanceChartSurface.changeRowData
      ? balanceChartSurface.changeRowData
      : lastDayChangeRowData;

  const showPortfolioBalanceInfoModal = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: t('Portfolio balance'),
        message: t(
          'Your Portfolio Balance is the total of all your crypto assets.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: () => null,
            primary: true,
          },
        ],
      }),
    );
  };

  return (
    <PortfolioContainer>
      {canCollapseChart ? (
        <CollapseButtonContainer
          onLayout={e => {
            const nextLayout = e.nativeEvent.layout;
            setCollapseButtonLayout(prev =>
              prev &&
              prev.x === nextLayout.x &&
              prev.y === nextLayout.y &&
              prev.width === nextLayout.width &&
              prev.height === nextLayout.height
                ? prev
                : nextLayout,
            );
          }}
          pointerEvents={isChartCollapsed ? 'none' : 'auto'}
          accessibilityElementsHidden={isChartCollapsed}
          importantForAccessibility={
            isChartCollapsed ? 'no-hide-descendants' : 'yes'
          }
          style={buttonAnimatedStyle}>
          <CollapseContentButton
            isActive={isCollapseButtonActive}
            onPressIn={onCollapseButtonPressIn}
            onPressOut={onCollapseButtonPressOut}
            onPress={onCollapseChartPress}
            accessibilityLabel={collapseChartAccessibilityLabel}
            accessibilityState={{
              expanded: !isChartCollapsed,
              selected: isCollapseButtonActive,
            }}
          />
        </CollapseButtonContainer>
      ) : null}
      <PortfolioTopContent $leftAligned={shouldLeftAlignTopSection}>
        <PortfolioBalanceHeader
          activeOpacity={ActiveOpacity}
          testID="portfolio-balance-info-button"
          accessibilityLabel="Portfolio balance info"
          onPress={showPortfolioBalanceInfoModal}>
          <PortfolioBalanceTitle>
            {t('Portfolio Balance')}
          </PortfolioBalanceTitle>
          <InfoSvg width={16} height={16} />
        </PortfolioBalanceHeader>
        <TouchableOpacity
          testID="portfolio-balance-toggle"
          accessibilityLabel="Toggle balance visibility"
          onLongPress={() => {
            dispatch(toggleHideAllBalances());
          }}>
          {!hideAllBalances ? (
            <>
              <PortfolioBalanceText
                $isCompact={shouldUseCompactPortfolioBalanceText}>
                {formattedPortfolioBalance}
              </PortfolioBalanceText>
            </>
          ) : (
            <HiddenBalance>
              {maskIfHidden(true, totalBalanceIncludingCoinbase)}
            </HiddenBalance>
          )}
        </TouchableOpacity>
      </PortfolioTopContent>

      {displayedChangeRowData || balanceChartsEnabled ? (
        <PortfolioBalanceChangeRow
          percent={displayedChangeRowData?.percent ?? 0}
          deltaFiatFormatted={displayedChangeRowData?.deltaFiatFormatted}
          rangeLabel={displayedChangeRowData?.rangeLabel}
          style={[
            {
              width: '100%',
              justifyContent: shouldLeftAlignTopSection
                ? 'flex-start'
                : 'center',
              paddingLeft: shouldLeftAlignTopSection ? 12 : 0,
            },
            !displayedChangeRowData ? {opacity: 0} : null,
          ]}
        />
      ) : null}

      {balanceChartsEnabled ? (
        <ChartStage
          onLayout={e => {
            const {width, y} = e.nativeEvent.layout;
            if (width > 0 && width !== chartStageWidth) {
              setChartStageWidth(width);
            }
            if (y !== chartStageY) {
              setChartStageY(y);
            }
          }}>
          <Animated.View style={chartSpacerAnimatedStyle} />
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                zIndex: isChartCollapsed ? 20 : 1,
              },
              chartWrapperAnimatedStyle,
            ]}>
            <View
              onLayout={e => {
                const h = Math.round(e.nativeEvent.layout.height);
                if (h > 0 && h !== chartBlockHeight) {
                  setChartBlockHeight(h);
                }
              }}>
              <BalanceHistoryChart
                key={chartLifecycleKey}
                {...commonBalanceHistoryChartProps}
                strokeScale={chartScale}
                minStrokeScale={collapsedScale}
                onChangeRowData={
                  balanceChartSurface.chartCallbacks.onChangeRowData
                }
                axisLabelOpacity={axisLabelOpacity}
                showChangeRow={false}
                timeframeSelectorOpacity={timeframeSelectorOpacity}
                disablePanGesture={isChartCollapsed}
              />
              {isChartCollapsed && canCollapseChart ? (
                <TouchableOpacity
                  touchableLibrary="react-native"
                  activeOpacity={ActiveOpacity}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 50,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={expandChartAccessibilityLabel}
                  accessibilityState={{expanded: false}}
                  onPress={onExpandChartPress}
                />
              ) : null}
            </View>
          </Animated.View>
        </ChartStage>
      ) : null}
    </PortfolioContainer>
  );
};

export default React.memo(PortfolioBalanceContent);

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {BaseText, H2} from '../../../../components/styled/Text';
import {SlateDark, White} from '../../../../styles/colors';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {
  calculatePercentageDifference,
  formatFiatAmount,
} from '../../../../utils/helper-methods';
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
import {selectCanRenderPortfolioBalanceCharts} from '../../../../store/portfolio/portfolio.selectors';
import BalanceHistoryChart, {
  type BalanceHistoryChartProps,
} from '../../../../components/charts/BalanceHistoryChart';
import {DEFAULT_BALANCE_CHART_TIMEFRAME} from '../../../../components/charts/fiatTimeframes';
import Percentage from '../../../../components/percentage/Percentage';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
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
import {maskIfHidden} from '../../../../utils/hideBalances';
import {
  getVisibleKeysFromKeys,
  getVisibleWalletsFromKeys,
  walletsHaveNonZeroLiveBalance,
} from '../../../../utils/portfolio/assets';
import {resolveActivePortfolioDisplayQuoteCurrency} from '../../../../portfolio/ui/common';
import usePortfolioBalanceChartSurface from '../../../../portfolio/ui/hooks/usePortfolioBalanceChartSurface';
import usePortfolioChartableWallets from '../../../../portfolio/ui/hooks/usePortfolioChartableWallets';
import type {FiatRateInterval} from '../../../../store/rate/rate.models';
import type {Wallet} from '../../../../store/wallet/wallet.models';
import CollapseContentButton from './CollapseContentButton';

const PortfolioContainer = styled.View`
  justify-content: center;
  align-items: center;
  width: 100%;
`;

const PortfolioTopContent = styled.View<{$leftAligned?: boolean}>`
  width: 100%;
  padding: 0 ${ScreenGutter};
  align-items: ${({$leftAligned}) => ($leftAligned ? 'flex-start' : 'center')};
`;

const ChartStage = styled.View`
  width: 100%;
  position: relative;
  overflow: visible;
`;

const CollapseButtonContainer = styled(Animated.View)`
  position: absolute;
  right: 12px;
  top: 27px;
  z-index: 30;
`;

const HOME_BALANCE_LINE_CHART_HEIGHT = 220;
const HOME_BALANCE_TIMEFRAME_SELECTOR_TOP_MARGIN = 5;
const HOME_BALANCE_TIMEFRAME_SELECTOR_HEIGHT = 34;
const HOME_BALANCE_EXPANDED_CHART_HEIGHT =
  HOME_BALANCE_LINE_CHART_HEIGHT +
  HOME_BALANCE_TIMEFRAME_SELECTOR_TOP_MARGIN +
  HOME_BALANCE_TIMEFRAME_SELECTOR_HEIGHT;

const PortfolioBalanceHeader = styled(TouchableOpacity)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const PortfolioBalanceTitle = styled(BaseText)`
  margin-right: 3px;
  font-size: 13px;
  line-height: 18px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const PortfolioBalanceText = styled(BaseText)<{$isCompact?: boolean}>`
  font-size: ${({$isCompact}) => ($isCompact ? '26px' : '39px')};
  font-weight: 700;
  line-height: ${({$isCompact}) => ($isCompact ? '38px' : '59px')};
  color: ${({theme}) => theme.colors.text};
  margin: 2px 0;
`;

const HiddenBalance = styled(H2)`
  line-height: 50px;
  margin: 6px 0;
`;

const PortfolioBalanceChangeRowContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

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
  return (
    <PortfolioBalanceChangeRowContainer
      testID="portfolio-balance-change-row"
      style={style}>
      <Percentage
        percentageDifference={percent}
        hideArrow
        hideSign
        priceChange={deltaFiatFormatted}
        rangeLabel={rangeLabel}
        fractionDigits={2}
      />
    </PortfolioBalanceChangeRowContainer>
  );
};

const PortfolioBalanceContent = () => {
  const {t} = useTranslation();
  const coinbaseBalance =
    useAppSelector(({COINBASE}) => COINBASE.balance[COINBASE_ENV]) || 0.0;

  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  const {rates} = useSelector(({RATE}: RootState) => RATE);

  const canRenderPortfolioBalanceCharts = useAppSelector(
    selectCanRenderPortfolioBalanceCharts,
  );
  const showPortfolioValue = useAppSelector(selectShowPortfolioValue);
  const committedPortfolioLastPopulatedAt = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.lastPopulatedAt,
  );
  const populateInProgress = useAppSelector(
    ({PORTFOLIO}) => !!PORTFOLIO.populateStatus?.inProgress,
  );
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const {
    homeChartCollapsed: persistedHomeChartCollapsed,
    homeChartRemountNonce,
  } = useAppSelector(({APP}) => APP);

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

  const visibleCurrentBalance = useMemo(
    () =>
      visibleKeys.reduce((total, key) => total + (key.totalBalance || 0), 0),
    [visibleKeys],
  );
  const visibleLastDayBalance = useMemo(
    () =>
      visibleKeys.reduce(
        (total, key) => total + (key.totalBalanceLastDay || 0),
        0,
      ),
    [visibleKeys],
  );
  const visibleKeyIdsSig = useMemo(() => {
    return visibleKeys
      .map(key => String(key?.id || ''))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join(',');
  }, [visibleKeys]);

  const totalBalanceIncludingCoinbase: number =
    visibleCurrentBalance + coinbaseBalance;

  const dispatch = useAppDispatch();

  const walletsAcrossKeys: Wallet[] = useMemo(() => {
    const allWallets = getVisibleWalletsFromKeys(keys, homeCarouselConfig);

    const byId = new Map<string, Wallet>();
    for (const w of allWallets) {
      if (!w?.id) {
        continue;
      }
      if (!byId.has(w.id)) {
        byId.set(w.id, w);
      }
    }
    return Array.from(byId.values());
  }, [homeCarouselConfig, keys]);

  const chartWalletsAcrossKeys = usePortfolioChartableWallets({
    wallets: walletsAcrossKeys,
    enabled: canRenderPortfolioBalanceCharts,
  });
  const chartWalletIdsSig = useMemo(() => {
    return chartWalletsAcrossKeys
      .map(wallet => String(wallet?.id || ''))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join(',');
  }, [chartWalletsAcrossKeys]);
  const hasAnyChartWalletBalance = useMemo(() => {
    return walletsHaveNonZeroLiveBalance(chartWalletsAcrossKeys);
  }, [chartWalletsAcrossKeys]);
  const balanceChartsEnabled =
    canRenderPortfolioBalanceCharts && hasAnyChartWalletBalance;
  const shouldLeftAlignTopSection = balanceChartsEnabled && !hideAllBalances;
  const canCollapseChart =
    shouldLeftAlignTopSection && chartHasRenderableSeries;
  const shouldApplyChartCollapse =
    shouldLeftAlignTopSection && persistedHomeChartCollapsed;
  const showChartLoaderWhenNoSnapshots =
    balanceChartsEnabled &&
    (populateInProgress ||
      !committedPortfolioLastPopulatedAt ||
      !chartHasRenderableSeries);
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

  const quoteCurrency = resolveActivePortfolioDisplayQuoteCurrency({
    defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
  });
  const collapseChartAccessibilityLabel = t('Collapse portfolio chart');
  const expandChartAccessibilityLabel = t('Expand portfolio chart');
  const chartLifecycleKey = useMemo(
    () =>
      `home-portfolio-charts:${homeChartRemountNonce}:${visibleKeyIdsSig}:${chartWalletIdsSig}`,
    [chartWalletIdsSig, homeChartRemountNonce, visibleKeyIdsSig],
  );
  const balanceChartSurface = usePortfolioBalanceChartSurface({
    wallets: chartWalletsAcrossKeys,
    quoteCurrency,
    fallbackBalance: totalBalanceIncludingCoinbase,
    fallbackCurrency: defaultAltCurrency.isoCode,
    enabled: balanceChartsEnabled,
    resetKey: chartLifecycleKey,
  });
  const commonBalanceHistoryChartProps: BalanceHistoryChartProps = {
    wallets: chartWalletsAcrossKeys,
    quoteCurrency,
    initialSelectedTimeframe: selectedChartTimeframeRef.current,
    rates,
    onSelectedTimeframeChange: onSelectedChartTimeframeChange,
    showTimeframeSelector: true,
    timeframeSelectorHorizontalInset: ScreenGutter,
    showLoaderWhenNoSnapshots: showChartLoaderWhenNoSnapshots,
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
  const formattedPortfolioBalance = useMemo(() => {
    return formatFiatAmount(
      displayedPortfolioBalance,
      displayedPortfolioBalanceCurrency,
      {
        currencyDisplay: 'symbol',
      },
    );
  }, [displayedPortfolioBalance, displayedPortfolioBalanceCurrency]);
  const shouldUseCompactPortfolioBalanceText = useMemo(() => {
    return shouldUseCompactFiatAmountText(formattedPortfolioBalance);
  }, [formattedPortfolioBalance]);
  const lastDayChangeRowData = useMemo(() => {
    if (!(visibleCurrentBalance > 0) || !(visibleLastDayBalance > 0)) {
      return undefined;
    }

    return {
      percent: calculatePercentageDifference(
        visibleCurrentBalance,
        visibleLastDayBalance,
      ),
      deltaFiatFormatted: formatFiatAmount(
        visibleCurrentBalance - visibleLastDayBalance,
        defaultAltCurrency.isoCode,
        {
          customPrecision: 'minimal',
          currencyDisplay: 'symbol',
        },
      ),
      rangeLabel: t('Last Day'),
    };
  }, [
    defaultAltCurrency.isoCode,
    t,
    visibleCurrentBalance,
    visibleLastDayBalance,
  ]);
  const displayedChangeRowData =
    balanceChartsEnabled && balanceChartSurface.changeRowData
      ? balanceChartSurface.changeRowData
      : lastDayChangeRowData;
  const shouldRenderPortfolioBalance = showPortfolioValue === true;

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

  if (!shouldRenderPortfolioBalance) {
    return null;
  }

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

      {!hideAllBalances && displayedChangeRowData ? (
        <PortfolioBalanceChangeRow
          percent={displayedChangeRowData.percent}
          deltaFiatFormatted={displayedChangeRowData.deltaFiatFormatted}
          rangeLabel={displayedChangeRowData.rangeLabel}
          style={[
            {
              width: '100%',
              justifyContent: shouldLeftAlignTopSection
                ? 'flex-start'
                : 'center',
              paddingLeft: shouldLeftAlignTopSection ? 12 : 0,
            },
          ]}
        />
      ) : null}

      {!hideAllBalances && balanceChartsEnabled ? (
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

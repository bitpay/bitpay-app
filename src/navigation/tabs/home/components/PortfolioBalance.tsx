import React, {useCallback, useEffect, useMemo, useState} from 'react';
import styled from 'styled-components/native';
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
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../../store/app/app.actions';
import BalanceHistoryChart from '../../../../components/charts/BalanceHistoryChart';
import ChartChangeRow from '../../../../components/charts/ChartChangeRow';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {View, type LayoutRectangle} from 'react-native';
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
  getQuoteCurrency,
  getVisibleKeysFromKeys,
  getVisibleWalletsFromKeys,
  walletHasNonZeroLiveBalance,
} from '../../../../utils/portfolio/assets';
import {setHomeChartCollapsed} from '../../../../store/portfolio-charts';
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

const PortfolioBalance = () => {
  const {t} = useTranslation();
  const coinbaseBalance =
    useAppSelector(({COINBASE}) => COINBASE.balance[COINBASE_ENV]) || 0.0;

  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  const portfolio = useSelector(({PORTFOLIO}: RootState) => PORTFOLIO);
  const {rates, fiatRateSeriesCache} = useSelector(({RATE}: RootState) => RATE);

  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const {
    homeChartCollapsed: persistedHomeChartCollapsed,
    homeChartRemountNonce,
  } = useAppSelector(({PORTFOLIO_CHARTS}) => PORTFOLIO_CHARTS);

  const [selectedChartBalance, setSelectedChartBalance] = useState<
    number | undefined
  >();
  const [chartChangeRowData, setChartChangeRowData] = useState<{
    percent: number;
    deltaFiatFormatted?: string;
    rangeLabel?: string;
  }>();
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
  const selectedChartTimeframeRef = React.useRef<FiatRateInterval>('1D');

  const visibleKeys = useMemo(
    () => getVisibleKeysFromKeys(keys, homeCarouselConfig),
    [homeCarouselConfig, keys],
  );

  const visibleCurrentBalance = useMemo(
    () =>
      visibleKeys.reduce((total, key) => total + (key.totalBalance || 0), 0),
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
    const snapshotsMap = portfolio?.snapshotsByWalletId || {};

    const byId = new Map<string, Wallet>();
    for (const w of allWallets) {
      if (!w?.id) {
        continue;
      }
      const hasSnaps = !!snapshotsMap[w.id]?.length;
      if (!walletHasNonZeroLiveBalance(w) && !hasSnaps) {
        continue;
      }
      if (!byId.has(w.id)) {
        byId.set(w.id, w);
      }
    }
    return Array.from(byId.values());
  }, [homeCarouselConfig, keys, portfolio?.snapshotsByWalletId]);

  const hasChartData = useMemo(() => {
    const snapshotsMap = portfolio?.snapshotsByWalletId || {};
    return walletsAcrossKeys.some(w => (snapshotsMap[w.id] || []).length > 0);
  }, [portfolio?.snapshotsByWalletId, walletsAcrossKeys]);
  const shouldLeftAlignTopSection = hasChartData && !hideAllBalances;
  const collapsedScale = 0.26;
  const fullChartHeight = chartBlockHeight || 330;

  useEffect(() => {
    const nextCollapsed =
      shouldLeftAlignTopSection && persistedHomeChartCollapsed;
    setIsChartCollapsed(nextCollapsed);
    cancelAnimation(collapseProgress);
    collapseProgress.value = nextCollapsed ? 1 : 0;
  }, [
    collapseProgress,
    persistedHomeChartCollapsed,
    shouldLeftAlignTopSection,
  ]);

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
      if (!shouldLeftAlignTopSection) {
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
    [
      collapseProgress,
      persistHomeChartCollapsePreference,
      shouldLeftAlignTopSection,
    ],
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

  const quoteCurrency = getQuoteCurrency({
    portfolioQuoteCurrency: portfolio?.quoteCurrency,
    defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
  });
  const collapseChartAccessibilityLabel = t('Collapse portfolio chart');
  const expandChartAccessibilityLabel = t('Expand portfolio chart');
  const chartLifecycleKey = useMemo(
    () =>
      `home-portfolio-charts:${quoteCurrency}:${homeChartRemountNonce}:${visibleKeyIdsSig}`,
    [homeChartRemountNonce, quoteCurrency, visibleKeyIdsSig],
  );
  const hasInitializedChartLifecycleRef = React.useRef(false);

  useEffect(() => {
    if (!hasInitializedChartLifecycleRef.current) {
      hasInitializedChartLifecycleRef.current = true;
      return;
    }

    setSelectedChartBalance(undefined);
    setChartChangeRowData(undefined);
  }, [chartLifecycleKey]);

  const displayedPortfolioBalance =
    typeof selectedChartBalance === 'number'
      ? selectedChartBalance
      : totalBalanceIncludingCoinbase;
  const formattedPortfolioBalance = useMemo(() => {
    return formatFiatAmount(
      displayedPortfolioBalance,
      defaultAltCurrency.isoCode,
      {
        currencyDisplay: 'symbol',
      },
    );
  }, [defaultAltCurrency.isoCode, displayedPortfolioBalance]);
  const shouldUseCompactPortfolioBalanceText = useMemo(() => {
    return shouldUseCompactFiatAmountText(formattedPortfolioBalance);
  }, [formattedPortfolioBalance]);

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
      {shouldLeftAlignTopSection ? (
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
          onPress={showPortfolioBalanceInfoModal}>
          <PortfolioBalanceTitle>
            {t('Portfolio Balance')}
          </PortfolioBalanceTitle>
          <InfoSvg width={16} height={16} />
        </PortfolioBalanceHeader>
        <TouchableOpacity
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

      {shouldLeftAlignTopSection ? (
        <ChartChangeRow
          percent={chartChangeRowData?.percent ?? 0}
          deltaFiatFormatted={chartChangeRowData?.deltaFiatFormatted}
          rangeLabel={chartChangeRowData?.rangeLabel}
          style={[
            {
              width: '100%',
              justifyContent: 'flex-start',
              paddingLeft: 12,
            },
            !chartChangeRowData ? {opacity: 0} : null,
          ]}
        />
      ) : null}

      {!hideAllBalances ? (
        hasChartData ? (
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
                  wallets={walletsAcrossKeys}
                  snapshotsByWalletId={portfolio?.snapshotsByWalletId || {}}
                  quoteCurrency={quoteCurrency}
                  initialSelectedTimeframe={selectedChartTimeframeRef.current}
                  rates={rates}
                  fiatRateSeriesCache={fiatRateSeriesCache}
                  strokeScale={chartScale}
                  minStrokeScale={collapsedScale}
                  onChangeRowData={setChartChangeRowData}
                  onSelectedTimeframeChange={onSelectedChartTimeframeChange}
                  axisLabelOpacity={axisLabelOpacity}
                  showChangeRow={false}
                  showTimeframeSelector
                  timeframeSelectorOpacity={timeframeSelectorOpacity}
                  timeframeSelectorHorizontalInset={ScreenGutter}
                  disablePanGesture={isChartCollapsed}
                  // NOTE: Coinbase balance is intentionally excluded from the balance chart
                  // (Option B per product requirements) because we do not have historized
                  // Coinbase balance snapshots.
                  onSelectedBalanceChange={setSelectedChartBalance}
                />
                {isChartCollapsed ? (
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
        ) : (
          <BalanceHistoryChart
            key={chartLifecycleKey}
            wallets={walletsAcrossKeys}
            snapshotsByWalletId={portfolio?.snapshotsByWalletId || {}}
            quoteCurrency={quoteCurrency}
            initialSelectedTimeframe={selectedChartTimeframeRef.current}
            rates={rates}
            fiatRateSeriesCache={fiatRateSeriesCache}
            onSelectedTimeframeChange={onSelectedChartTimeframeChange}
            timeframeSelectorHorizontalInset={ScreenGutter}
            // NOTE: Coinbase balance is intentionally excluded from the balance chart
            // (Option B per product requirements) because we do not have historized
            // Coinbase balance snapshots.
            onSelectedBalanceChange={setSelectedChartBalance}
          />
        )
      ) : null}
    </PortfolioContainer>
  );
};

export default PortfolioBalance;

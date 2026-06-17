import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import BalanceHistoryChart from '../../../../components/charts/BalanceHistoryChart';
import type {ChangeRowData} from '../../../../components/charts/balanceHistoryChartSelection';
import type {BalanceChartCallbackAnalysisPoint} from '../../../../components/charts/useBalanceChartDisplayModel';
import {
  DEFAULT_BALANCE_CHART_TIMEFRAME,
  getRangeLabelForFiatTimeframe,
} from '../../../../components/charts/fiatTimeframes';
import useLegacyLastDayChangeRowData from '../../../../components/charts/useLegacyLastDayChangeRowData';
import {ScreenGutter} from '../../../../components/styled/Containers';
import type {FiatRateInterval} from '../../../../store/rate/rate.models';
import {usePortfolioAnalysis} from '../../../../portfolio/ui/hooks/usePortfolioAnalysis';
import usePortfolioBalanceChartReadiness from '../../../../portfolio/ui/hooks/usePortfolioBalanceChartReadiness';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {shouldUseCompactFiatAmountText} from '../../../../utils/fiatAmountText';
import ExchangeRateScreenLayout from './ExchangeRateScreenLayout';
import {
  buildAssetBalanceHistoryDisplayedSummary,
  buildAssetBalanceHistoryIdleSummary,
} from './assetBalanceHistorySummary';
import useAssetScreenRefresh from './useAssetScreenRefresh';
import type {ExchangeRateSharedModel} from './useExchangeRateSharedModel';
import UkExchangeRateDisclosures from './UkExchangeRateDisclosures';

type AssetBalanceHistoryScreenProps = {
  shared: ExchangeRateSharedModel;
};

type AssetChartChangeRow = ChangeRowData | undefined;

type AssetDisplayedAnalysisPoint =
  | BalanceChartCallbackAnalysisPoint
  | undefined;

const AssetBalanceChartSection = React.memo(
  ({
    shouldRender,
    wallets,
    quoteCurrency,
    initialSelectedTimeframe,
    rates,
    lineColor,
    gradientStartColor,
    showLoaderWhenNoSnapshots,
    isBalanceChartDataReadyToQuery,
    preserveVisibleSeriesWhileNotReady,
    onChangeRowData,
    onDisplayedAnalysisPointChange,
    onSelectionActiveChange,
    onSelectedTimeframeChange,
  }: {
    shouldRender: boolean;
    wallets: ExchangeRateSharedModel['assetWallets'];
    quoteCurrency: string;
    initialSelectedTimeframe: FiatRateInterval;
    rates: ExchangeRateSharedModel['rates'];
    lineColor: string;
    gradientStartColor: string;
    showLoaderWhenNoSnapshots: boolean;
    isBalanceChartDataReadyToQuery?: boolean;
    preserveVisibleSeriesWhileNotReady?: boolean;
    onChangeRowData: (data: AssetChartChangeRow) => void;
    onDisplayedAnalysisPointChange: (
      point: AssetDisplayedAnalysisPoint,
    ) => void;
    onSelectionActiveChange: (active: boolean) => void;
    onSelectedTimeframeChange: (timeframe: FiatRateInterval) => void;
  }) => {
    if (!shouldRender) {
      return null;
    }

    return (
      <View>
        <BalanceHistoryChart
          wallets={wallets}
          quoteCurrency={quoteCurrency}
          initialSelectedTimeframe={initialSelectedTimeframe}
          rates={rates}
          lineColor={lineColor}
          gradientStartColor={gradientStartColor}
          showLoaderWhenNoSnapshots={showLoaderWhenNoSnapshots}
          isBalanceChartDataReadyToQuery={isBalanceChartDataReadyToQuery}
          preserveVisibleSeriesWhileNotReady={
            preserveVisibleSeriesWhileNotReady
          }
          onChangeRowData={onChangeRowData}
          onDisplayedAnalysisPointChange={onDisplayedAnalysisPointChange}
          onSelectionActiveChange={onSelectionActiveChange}
          onSelectedTimeframeChange={onSelectedTimeframeChange}
          showChangeRow={false}
          postChartContent={<UkExchangeRateDisclosures />}
          timeframeSelectorHorizontalInset={ScreenGutter}
        />
      </View>
    );
  },
);

const areChartChangeRowsEqual = (
  a: AssetChartChangeRow,
  b: AssetChartChangeRow,
): boolean =>
  a?.percent === b?.percent &&
  a?.deltaFiatFormatted === b?.deltaFiatFormatted &&
  a?.rangeLabel === b?.rangeLabel;

const areDisplayedAnalysisPointsEqual = (
  a: AssetDisplayedAnalysisPoint,
  b: AssetDisplayedAnalysisPoint,
): boolean =>
  a?.timestamp === b?.timestamp &&
  a?.totalFiatBalance === b?.totalFiatBalance &&
  a?.totalPnlChange === b?.totalPnlChange &&
  a?.totalPnlPercent === b?.totalPnlPercent;

const AssetBalanceHistoryScreen = ({
  shared,
}: AssetBalanceHistoryScreenProps) => {
  const {t} = useTranslation();
  const [displayedTimeframe, setDisplayedTimeframe] =
    useState<FiatRateInterval>(DEFAULT_BALANCE_CHART_TIMEFRAME);
  const [requestedTimeframe, setRequestedTimeframe] =
    useState<FiatRateInterval>(DEFAULT_BALANCE_CHART_TIMEFRAME);
  const [chartChangeRow, setChartChangeRow] =
    useState<AssetChartChangeRow>(undefined);
  const [selectionActive, setSelectionActive] = useState(false);
  const [chartDisplayedPoint, setChartDisplayedPoint] =
    useState<AssetDisplayedAnalysisPoint>(undefined);
  const portfolioChartsEnabled = shared.showPortfolioValue === true;
  const balanceChartReadiness = usePortfolioBalanceChartReadiness({
    wallets: shared.assetWallets,
    enabled: portfolioChartsEnabled && shared.hasWalletsForAsset,
    hideAllBalances: shared.hideAllBalances,
  });
  const chartableAssetWallets = balanceChartReadiness.chartableWallets;
  const balanceHistoryEnabled =
    balanceChartReadiness.shouldMountBalanceChart && shared.hasWalletsForAsset;
  const analysis = usePortfolioAnalysis({
    wallets: chartableAssetWallets,
    timeframe: displayedTimeframe,
    maxPoints: 2,
    enabled: balanceHistoryEnabled,
    freezeWhilePopulate: true,
    allowCurrentWhilePopulate: true,
  });

  const isAssetBalanceChartLoading =
    balanceChartReadiness.shouldShowChartLoader;
  const isAssetBalanceChartDataReadyToQuery =
    balanceChartReadiness.isBalanceChartDataReadyToQuery;
  const shouldPreserveStaleAssetBalanceChart =
    balanceChartReadiness.shouldPreserveStaleBalanceChart;
  const canUseChartDisplayedState =
    isAssetBalanceChartDataReadyToQuery || shouldPreserveStaleAssetBalanceChart;
  const isTimeframeTransitionPending =
    requestedTimeframe !== displayedTimeframe;

  useEffect(() => {
    setChartChangeRow(undefined);
    setSelectionActive(false);
    setChartDisplayedPoint(undefined);
    setDisplayedTimeframe(DEFAULT_BALANCE_CHART_TIMEFRAME);
    setRequestedTimeframe(DEFAULT_BALANCE_CHART_TIMEFRAME);
  }, [
    shared.assetContext.chain,
    shared.assetContext.currencyAbbreviation,
    shared.assetContext.tokenAddress,
  ]);

  const idleRangeLabel = getRangeLabelForFiatTimeframe(t, displayedTimeframe);

  const idleSummary = buildAssetBalanceHistoryIdleSummary({
    storedWallets: analysis.storedWallets,
    analysis: analysis.data,
    quoteCurrency: analysis.quoteCurrency || shared.resolvedQuoteCurrency,
    rangeLabel: idleRangeLabel,
    gainLossMode: displayedTimeframe,
    assetKey: shared.assetContext.currencyAbbreviation.toLowerCase(),
  });

  const {isRefreshing, onRefresh} = useAssetScreenRefresh(shared);

  const effectiveChartDisplayedPoint = canUseChartDisplayedState
    ? chartDisplayedPoint
    : undefined;
  const effectiveChartChangeRow = canUseChartDisplayedState
    ? chartChangeRow
    : undefined;
  const displayedSummary = buildAssetBalanceHistoryDisplayedSummary({
    idleSummary,
    chartDisplayedPoint: effectiveChartDisplayedPoint,
    chartChangeRow: effectiveChartChangeRow,
  });
  const legacyLastDayChangeRowData = useLegacyLastDayChangeRowData({
    wallets: shared.assetWallets,
    currentFiatBalance: shared.assetTotalFiatBalance,
    quoteCurrency: shared.resolvedQuoteCurrency,
    mode: 'representativeAsset',
    representativeAsset: shared.assetContext,
    enabled:
      !portfolioChartsEnabled &&
      !shared.hideAllBalances &&
      shared.hasWalletsForAsset,
  });

  const selectedAssetBalanceToDisplay = !shared.hasWalletsForAsset
    ? undefined
    : selectionActive && displayedSummary.source === 'chart'
    ? displayedSummary.assetBalance ?? shared.assetTotalFiatBalance
    : shared.assetTotalFiatBalance;

  const changeRow = shared.hideAllBalances
    ? undefined
    : portfolioChartsEnabled
    ? displayedSummary.changeRow
    : legacyLastDayChangeRowData;

  const formattedAssetBalance =
    selectedAssetBalanceToDisplay == null
      ? '--'
      : formatFiatAmount(
          selectedAssetBalanceToDisplay,
          shared.resolvedQuoteCurrency,
          {currencyDisplay: 'symbol'},
        );

  const marketPriceDisplay = shared.formatDisplayPrice(shared.currentFiatRate);
  const shouldRenderBalanceChart =
    balanceChartReadiness.shouldMountBalanceChart && shared.hasWalletsForAsset;

  const topValue = shared.hideAllBalances ? '****' : formattedAssetBalance;
  const topValueIsLarge = shouldUseCompactFiatAmountText(formattedAssetBalance);

  const handleChartChangeRowData = useCallback(
    (nextChartChangeRow: AssetChartChangeRow) => {
      setChartChangeRow(prev =>
        areChartChangeRowsEqual(prev, nextChartChangeRow)
          ? prev
          : nextChartChangeRow,
      );
    },
    [],
  );

  const handleDisplayedAnalysisPointChange = useCallback(
    (nextDisplayedPoint: AssetDisplayedAnalysisPoint) => {
      setChartDisplayedPoint(prev =>
        areDisplayedAnalysisPointsEqual(prev, nextDisplayedPoint)
          ? prev
          : nextDisplayedPoint,
      );
    },
    [],
  );

  const handleSelectedTimeframeChange = useCallback(
    (nextTimeframe: FiatRateInterval) => {
      setRequestedTimeframe(prev =>
        prev === nextTimeframe ? prev : nextTimeframe,
      );
      setDisplayedTimeframe(prev =>
        prev === nextTimeframe ? prev : nextTimeframe,
      );
    },
    [],
  );

  return (
    <ExchangeRateScreenLayout
      changeRow={changeRow}
      chartSection={
        <AssetBalanceChartSection
          shouldRender={shouldRenderBalanceChart}
          wallets={chartableAssetWallets}
          quoteCurrency={shared.resolvedQuoteCurrency}
          initialSelectedTimeframe={displayedTimeframe}
          rates={shared.rates}
          lineColor={shared.chartLineColor}
          gradientStartColor={shared.gradientBackgroundColor}
          showLoaderWhenNoSnapshots={
            isAssetBalanceChartLoading ||
            isRefreshing ||
            isTimeframeTransitionPending
          }
          isBalanceChartDataReadyToQuery={isAssetBalanceChartDataReadyToQuery}
          preserveVisibleSeriesWhileNotReady={
            shouldPreserveStaleAssetBalanceChart
          }
          onChangeRowData={handleChartChangeRowData}
          onDisplayedAnalysisPointChange={handleDisplayedAnalysisPointChange}
          onSelectionActiveChange={setSelectionActive}
          onSelectedTimeframeChange={handleSelectedTimeframeChange}
        />
      }
      isRefreshing={isRefreshing}
      marketPriceDisplay={marketPriceDisplay}
      onRefresh={onRefresh}
      reserveChangeRowSpace={shouldRenderBalanceChart}
      shared={shared}
      topValue={topValue}
      topValueIsLarge={topValueIsLarge}
    />
  );
};

export default AssetBalanceHistoryScreen;

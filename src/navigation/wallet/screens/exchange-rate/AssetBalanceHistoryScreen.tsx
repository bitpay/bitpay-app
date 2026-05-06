import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import BalanceHistoryChart from '../../../../components/charts/BalanceHistoryChart';
import {
  DEFAULT_BALANCE_CHART_TIMEFRAME,
  getRangeLabelForFiatTimeframe,
} from '../../../../components/charts/fiatTimeframes';
import {ScreenGutter} from '../../../../components/styled/Containers';
import type {FiatRateInterval} from '../../../../store/rate/rate.models';
import {usePortfolioAnalysis} from '../../../../portfolio/ui/hooks/usePortfolioAnalysis';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {useAppSelector} from '../../../../utils/hooks';
import {selectHasCompletedFullPortfolioPopulate} from '../../../../store/portfolio/portfolio.selectors';
import {
  hasCompletedPopulateForWallets,
  isPopulateLoadingForWallets,
  walletHasNonZeroLiveBalance,
} from '../../../../utils/portfolio/assets';
import {shouldUseCompactFiatAmountText} from '../../../../utils/fiatAmountText';
import ExchangeRateScreenLayout from './ExchangeRateScreenLayout';
import {
  buildAssetBalanceHistoryDisplayedSummary,
  buildAssetBalanceHistoryIdleSummary,
} from './assetBalanceHistorySummary';
import useAssetScreenRefresh from './useAssetScreenRefresh';
import type {ExchangeRateSharedModel} from './useExchangeRateSharedModel';

type AssetBalanceHistoryScreenProps = {
  shared: ExchangeRateSharedModel;
};

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
    onChangeRowData: (
      data:
        | {
            percent: number;
            deltaFiatFormatted?: string;
            rangeLabel?: string;
          }
        | undefined,
    ) => void;
    onDisplayedAnalysisPointChange: (
      point:
        | {
            timestamp?: number;
            totalFiatBalance?: number;
            totalPnlChange?: number;
            totalPnlPercent?: number;
          }
        | undefined,
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
          onChangeRowData={onChangeRowData}
          onDisplayedAnalysisPointChange={onDisplayedAnalysisPointChange}
          onSelectionActiveChange={onSelectionActiveChange}
          onSelectedTimeframeChange={onSelectedTimeframeChange}
          showChangeRow={false}
          timeframeSelectorHorizontalInset={ScreenGutter}
        />
      </View>
    );
  },
);

function areChartChangeRowsEqual(
  a:
    | {
        percent: number;
        deltaFiatFormatted?: string;
        rangeLabel?: string;
      }
    | undefined,
  b:
    | {
        percent: number;
        deltaFiatFormatted?: string;
        rangeLabel?: string;
      }
    | undefined,
): boolean {
  return (
    a?.percent === b?.percent &&
    a?.deltaFiatFormatted === b?.deltaFiatFormatted &&
    a?.rangeLabel === b?.rangeLabel
  );
}

function areDisplayedAnalysisPointsEqual(
  a:
    | {
        timestamp?: number;
        totalFiatBalance?: number;
        totalPnlChange?: number;
        totalPnlPercent?: number;
      }
    | undefined,
  b:
    | {
        timestamp?: number;
        totalFiatBalance?: number;
        totalPnlChange?: number;
        totalPnlPercent?: number;
      }
    | undefined,
): boolean {
  return (
    a?.timestamp === b?.timestamp &&
    a?.totalFiatBalance === b?.totalFiatBalance &&
    a?.totalPnlChange === b?.totalPnlChange &&
    a?.totalPnlPercent === b?.totalPnlPercent
  );
}

const AssetBalanceHistoryScreen = ({
  shared,
}: AssetBalanceHistoryScreenProps) => {
  const {t} = useTranslation();
  const populateStatus = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.populateStatus,
  );
  const [displayedTimeframe, setDisplayedTimeframe] =
    useState<FiatRateInterval>(DEFAULT_BALANCE_CHART_TIMEFRAME);
  const [requestedTimeframe, setRequestedTimeframe] =
    useState<FiatRateInterval>(DEFAULT_BALANCE_CHART_TIMEFRAME);
  const [chartChangeRow, setChartChangeRow] = useState<
    | {
        percent: number;
        deltaFiatFormatted?: string;
        rangeLabel?: string;
      }
    | undefined
  >(undefined);
  const [selectionActive, setSelectionActive] = useState(false);
  const [chartDisplayedPoint, setChartDisplayedPoint] = useState<
    | {
        timestamp?: number;
        totalFiatBalance?: number;
        totalPnlChange?: number;
        totalPnlPercent?: number;
      }
    | undefined
  >(undefined);
  const hasCompletedFullPortfolioPopulate = useAppSelector(
    selectHasCompletedFullPortfolioPopulate,
  );
  const hasCompletedAssetPopulate = useMemo(() => {
    const liveBalanceWallets = shared.assetWallets.filter(
      walletHasNonZeroLiveBalance,
    );

    return (
      hasCompletedFullPortfolioPopulate ||
      hasCompletedPopulateForWallets({
        populateStatus,
        wallets: liveBalanceWallets.length
          ? liveBalanceWallets
          : shared.assetWallets,
        requireAllWalletsInScope: liveBalanceWallets.length > 0,
      })
    );
  }, [hasCompletedFullPortfolioPopulate, populateStatus, shared.assetWallets]);
  const balanceHistoryEnabled =
    shared.showPortfolioValue &&
    hasCompletedAssetPopulate &&
    shared.hasWalletsForAsset;
  const analysis = usePortfolioAnalysis({
    wallets: shared.assetWallets,
    timeframe: displayedTimeframe,
    maxPoints: 2,
    enabled: balanceHistoryEnabled,
    freezeWhilePopulate: true,
    allowCurrentWhilePopulate: true,
  });

  const isAssetBalanceChartLoading = useMemo(() => {
    if (!balanceHistoryEnabled) {
      return false;
    }

    return isPopulateLoadingForWallets({
      populateStatus,
      wallets: shared.assetWallets,
    });
  }, [balanceHistoryEnabled, populateStatus, shared.assetWallets]);
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

  const idleRangeLabel = useMemo(() => {
    return getRangeLabelForFiatTimeframe(t, displayedTimeframe);
  }, [displayedTimeframe, t]);

  const idleSummary = useMemo(() => {
    return buildAssetBalanceHistoryIdleSummary({
      storedWallets: analysis.storedWallets,
      analysis: analysis.data,
      quoteCurrency: analysis.quoteCurrency || shared.resolvedQuoteCurrency,
      rangeLabel: idleRangeLabel,
      gainLossMode: displayedTimeframe,
      assetKey: shared.assetContext.currencyAbbreviation.toLowerCase(),
    });
  }, [
    analysis.data,
    analysis.quoteCurrency,
    analysis.storedWallets,
    displayedTimeframe,
    idleRangeLabel,
    shared.assetContext.currencyAbbreviation,
    shared.resolvedQuoteCurrency,
  ]);

  const {isRefreshing, onRefresh} = useAssetScreenRefresh(shared);

  const displayedSummary = useMemo(() => {
    return buildAssetBalanceHistoryDisplayedSummary({
      idleSummary,
      chartDisplayedPoint,
      chartChangeRow,
    });
  }, [chartChangeRow, chartDisplayedPoint, idleSummary]);

  const selectedAssetBalanceToDisplay = useMemo(() => {
    if (!shared.hasWalletsForAsset) {
      return undefined;
    }

    if (selectionActive && displayedSummary.source === 'chart') {
      return displayedSummary.assetBalance ?? shared.assetTotalFiatBalance;
    }

    return shared.assetTotalFiatBalance;
  }, [
    displayedSummary.assetBalance,
    displayedSummary.source,
    selectionActive,
    shared.assetTotalFiatBalance,
    shared.hasWalletsForAsset,
  ]);

  const changeRow = useMemo(() => {
    if (shared.hideAllBalances) {
      return undefined;
    }

    return displayedSummary.changeRow;
  }, [displayedSummary.changeRow, shared.hideAllBalances]);

  const formattedAssetBalance = useMemo(() => {
    if (selectedAssetBalanceToDisplay == null) {
      return '--';
    }

    return formatFiatAmount(
      selectedAssetBalanceToDisplay,
      shared.resolvedQuoteCurrency,
      {
        currencyDisplay: 'symbol',
      },
    );
  }, [selectedAssetBalanceToDisplay, shared.resolvedQuoteCurrency]);

  const marketPriceDisplay = shared.formatDisplayPrice(shared.currentFiatRate);
  const shouldRenderBalanceChart = useMemo(() => {
    return (
      shared.showPortfolioValue &&
      hasCompletedAssetPopulate &&
      !shared.hideAllBalances &&
      shared.hasWalletsForAsset
    );
  }, [
    hasCompletedAssetPopulate,
    shared.showPortfolioValue,
    shared.hideAllBalances,
    shared.hasWalletsForAsset,
  ]);

  const topValue = shared.hideAllBalances ? '****' : formattedAssetBalance;
  const topValueIsLarge = shouldUseCompactFiatAmountText(formattedAssetBalance);

  const handleChartChangeRowData = useCallback(
    (
      nextChartChangeRow:
        | {
            percent: number;
            deltaFiatFormatted?: string;
            rangeLabel?: string;
          }
        | undefined,
    ) => {
      setChartChangeRow(prev =>
        areChartChangeRowsEqual(prev, nextChartChangeRow)
          ? prev
          : nextChartChangeRow,
      );
    },
    [],
  );

  const handleDisplayedAnalysisPointChange = useCallback(
    (
      nextDisplayedPoint:
        | {
            timestamp?: number;
            totalFiatBalance?: number;
            totalPnlChange?: number;
            totalPnlPercent?: number;
          }
        | undefined,
    ) => {
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
          wallets={shared.assetWallets}
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

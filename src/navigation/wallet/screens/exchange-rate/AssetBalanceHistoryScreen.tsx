import {useIsFocused} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {shallowEqual} from 'react-redux';
import BalanceHistoryChart from '../../../../components/charts/BalanceHistoryChart';
import {ScreenGutter} from '../../../../components/styled/Containers';
import type {RootState} from '../../../../store';
import {maybePopulatePortfolioForWallets} from '../../../../store/portfolio';
import type {
  BalanceSnapshotsByWalletId,
  PortfolioState,
} from '../../../../store/portfolio/portfolio.models';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {isPopulateLoadingForWallets} from '../../../../utils/portfolio/assets';
import {shouldUseCompactFiatAmountText} from '../../../../utils/fiatAmountText';
import ExchangeRateScreenLayout from './ExchangeRateScreenLayout';
import useAssetScreenRefresh from './useAssetScreenRefresh';
import type {ExchangeRateSharedModel} from './useExchangeRateSharedModel';

type AssetHistoryPortfolioSelection = {
  snapshotsByWalletId: BalanceSnapshotsByWalletId;
  populateStatus?: PortfolioState['populateStatus'];
};

const EMPTY_SNAPSHOTS_BY_WALLET_ID: BalanceSnapshotsByWalletId = {};

type AssetBalanceHistoryScreenProps = {
  shared: ExchangeRateSharedModel;
};

const AssetBalanceHistoryScreen = ({
  shared,
}: AssetBalanceHistoryScreenProps) => {
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const {snapshotsByWalletId, populateStatus} = useAppSelector(
    ({PORTFOLIO}: RootState): AssetHistoryPortfolioSelection => ({
      snapshotsByWalletId:
        PORTFOLIO.snapshotsByWalletId || EMPTY_SNAPSHOTS_BY_WALLET_ID,
      populateStatus: PORTFOLIO.populateStatus,
    }),
    shallowEqual,
  );
  const [selectedAssetBalance, setSelectedAssetBalance] = useState<
    number | undefined
  >(undefined);

  const isAssetBalanceChartLoading = useMemo(() => {
    return isPopulateLoadingForWallets({
      populateStatus,
      wallets: shared.assetWallets,
    });
  }, [populateStatus, shared.assetWallets]);

  useEffect(() => {
    setSelectedAssetBalance(undefined);
  }, [
    shared.assetContext.chain,
    shared.assetContext.currencyAbbreviation,
    shared.assetContext.tokenAddress,
  ]);

  useEffect(() => {
    if (
      !isFocused ||
      !shared.assetWallets.length ||
      populateStatus?.inProgress
    ) {
      return;
    }

    dispatch(
      maybePopulatePortfolioForWallets({
        wallets: shared.assetWallets,
        quoteCurrency: shared.resolvedQuoteCurrency,
      }),
    );
  }, [
    dispatch,
    isFocused,
    populateStatus?.inProgress,
    shared.assetWallets,
    shared.resolvedQuoteCurrency,
  ]);

  const refreshPortfolioSnapshots = useCallback(async () => {
    if (!shared.assetWallets.length) {
      return;
    }

    await dispatch(
      maybePopulatePortfolioForWallets({
        wallets: shared.assetWallets,
        quoteCurrency: shared.resolvedQuoteCurrency,
      }),
    );
  }, [dispatch, shared.assetWallets, shared.resolvedQuoteCurrency]);

  const {isRefreshing, onRefresh} = useAssetScreenRefresh(shared, {
    afterBaseRefresh: refreshPortfolioSnapshots,
  });

  const selectedAssetBalanceToDisplay = useMemo(() => {
    if (!shared.hasWalletsForAsset) {
      return undefined;
    }

    return selectedAssetBalance ?? shared.assetTotalFiatBalance;
  }, [
    selectedAssetBalance,
    shared.assetTotalFiatBalance,
    shared.hasWalletsForAsset,
  ]);

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

  const topValue = shared.hideAllBalances ? '****' : formattedAssetBalance;
  const topValueIsLarge = shouldUseCompactFiatAmountText(formattedAssetBalance);

  return (
    <ExchangeRateScreenLayout
      chartSection={
        shared.hideAllBalances ? null : (
          <BalanceHistoryChart
            wallets={shared.assetWallets}
            snapshotsByWalletId={snapshotsByWalletId}
            quoteCurrency={shared.resolvedQuoteCurrency}
            rates={shared.rates}
            fiatRateSeriesCache={shared.fiatRateSeriesCache}
            lineColor={shared.chartLineColor}
            gradientStartColor={shared.gradientBackgroundColor}
            showLoaderWhenNoSnapshots={
              isAssetBalanceChartLoading || isRefreshing
            }
            onSelectedBalanceChange={setSelectedAssetBalance}
            timeframeSelectorHorizontalInset={ScreenGutter}
          />
        )
      }
      isRefreshing={isRefreshing}
      marketPriceDisplay={marketPriceDisplay}
      onRefresh={onRefresh}
      shared={shared}
      topValue={topValue}
      topValueIsLarge={topValueIsLarge}
    />
  );
};

export default AssetBalanceHistoryScreen;

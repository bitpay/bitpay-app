import {useEffect, useMemo, useRef} from 'react';
import {useIsFocused} from '@react-navigation/native';
import {useStore} from 'react-redux';
import {HISTORIC_RATES_CACHE_DURATION} from '../../../../constants/wallet';
import {maybePopulatePortfolioForWallets} from '../../../../store/portfolio';
import type {PortfolioState} from '../../../../store/portfolio/portfolio.models';
import type {
  CachedFiatRateInterval,
  Rates,
} from '../../../../store/rate/rate.models';
import {FIAT_RATE_SERIES_CACHED_INTERVALS} from '../../../../store/rate/rate.models';
import type {RootState} from '../../../../store';
import {fetchFiatRateSeriesAllIntervals} from '../../../../store/wallet/effects';
import type {Key} from '../../../../store/wallet/wallet.models';
import {
  type AssetRowItem,
  buildAssetRowItemsFromPortfolioSnapshots,
  buildWalletIdsByAssetGroupKey,
  type GainLossMode,
  getDisplayAssetRowItems,
  getPopulateLoadingByAssetKey,
  getQuoteCurrency,
  getVisibleWalletsForKey,
  getVisibleWalletsFromKeys,
  isFiatLoadingForWallets,
} from '../../../../utils/portfolio/assets';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {
  getMissingHistoricalRateAssetRequests,
  hasHistoricalRateSeriesForAsset,
} from './portfolioAssetHistoryRequests';

type Args = {
  gainLossMode: GainLossMode;
  keyId?: string;
};

type Result = {
  visibleItems: AssetRowItem[];
  isFiatLoading: boolean;
  isPopulateLoadingByKey: Record<string, boolean> | undefined;
};

const EMPTY_SNAPSHOTS_BY_WALLET_ID: PortfolioState['snapshotsByWalletId'] = {};
const CACHED_INTERVALS =
  FIAT_RATE_SERIES_CACHED_INTERVALS as ReadonlyArray<CachedFiatRateInterval>;
const SUPPORT_TRANSITION_POPULATE_THROTTLE_MS = 15 * 1000;

const usePortfolioAssetRows = ({gainLossMode, keyId}: Args): Result => {
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const portfolio = useAppSelector(({PORTFOLIO}) => PORTFOLIO);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const rates = useAppSelector(({RATE}) => RATE.rates) as Rates;
  const lastDayRates = useAppSelector(({RATE}) => RATE.lastDayRates) as Rates;
  const fiatRateSeriesCache = useAppSelector(
    ({RATE}) => RATE.fiatRateSeriesCache,
  );
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;
  const isPopulateInProgress = !!portfolio.populateStatus?.inProgress;

  const snapshotsByWalletId =
    portfolio.snapshotsByWalletId ?? EMPTY_SNAPSHOTS_BY_WALLET_ID;

  const wallets = useMemo(() => {
    if (keyId && keys[keyId]) {
      return getVisibleWalletsForKey(keys[keyId]);
    }
    return getVisibleWalletsFromKeys(keys, homeCarouselConfig);
  }, [homeCarouselConfig, keyId, keys]);

  const walletIdsByAssetKey = useMemo(() => {
    if (!isPopulateInProgress) {
      return undefined;
    }
    return buildWalletIdsByAssetGroupKey(wallets);
  }, [isPopulateInProgress, wallets]);

  const quoteCurrency = getQuoteCurrency({
    portfolioQuoteCurrency: portfolio.quoteCurrency,
    defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
  });

  const isFiatLoading = useMemo(() => {
    return isFiatLoadingForWallets({
      quoteCurrency,
      wallets,
      snapshotsByWalletId,
      fiatRateSeriesCache,
    });
  }, [fiatRateSeriesCache, quoteCurrency, snapshotsByWalletId, wallets]);

  const items = useMemo(() => {
    return buildAssetRowItemsFromPortfolioSnapshots({
      snapshotsByWalletId,
      wallets,
      quoteCurrency,
      gainLossMode,
      rates,
      lastDayRates,
      fiatRateSeriesCache,
      collapseAcrossChains: true,
    });
  }, [
    fiatRateSeriesCache,
    gainLossMode,
    lastDayRates,
    quoteCurrency,
    rates,
    snapshotsByWalletId,
    wallets,
  ]);

  const visibleItems = useMemo(() => {
    return getDisplayAssetRowItems(items);
  }, [items]);

  const populateLoadingByKeyPrevRef = useRef<Record<string, boolean>>();
  const isPopulateLoadingByKey = useMemo(() => {
    if (!isPopulateInProgress || !walletIdsByAssetKey) {
      return undefined;
    }

    return getPopulateLoadingByAssetKey({
      items: visibleItems,
      walletIdsByAssetKey,
      populateStatus: portfolio.populateStatus,
      prev: populateLoadingByKeyPrevRef.current,
    });
  }, [
    isPopulateInProgress,
    portfolio.populateStatus,
    visibleItems,
    walletIdsByAssetKey,
  ]);

  useEffect(() => {
    populateLoadingByKeyPrevRef.current = isPopulateLoadingByKey;
  }, [isPopulateLoadingByKey]);

  const lastFetchAttemptByAssetRequestRef = useRef<Record<string, number>>({});
  const inFlightFetchByAssetRequestRef = useRef<Set<string>>(new Set());
  const unsupportedAssetRequestKeysRef = useRef<Set<string>>(new Set());
  const lastPopulateTriggerAtRef = useRef<number>(0);

  const historicalRateRequestItems = useMemo(() => {
    return visibleItems;
  }, [visibleItems]);

  const missingHistoricalAssetRequests = useMemo(() => {
    return getMissingHistoricalRateAssetRequests({
      fiatCode: quoteCurrency,
      items: historicalRateRequestItems,
      cache: fiatRateSeriesCache,
      intervals: CACHED_INTERVALS,
    });
  }, [fiatRateSeriesCache, historicalRateRequestItems, quoteCurrency]);

  useEffect(() => {
    const activeAssetRequestKeys = new Set(
      missingHistoricalAssetRequests.map(asset => asset.requestKey),
    );

    const nextLastFetchAttemptByAssetRequest: Record<string, number> = {};
    for (const assetRequestKey of Object.keys(
      lastFetchAttemptByAssetRequestRef.current,
    )) {
      if (activeAssetRequestKeys.has(assetRequestKey)) {
        nextLastFetchAttemptByAssetRequest[assetRequestKey] =
          lastFetchAttemptByAssetRequestRef.current[assetRequestKey];
      }
    }
    lastFetchAttemptByAssetRequestRef.current =
      nextLastFetchAttemptByAssetRequest;
  }, [missingHistoricalAssetRequests]);

  useEffect(() => {
    const activeAssetRequestKeys = new Set(
      missingHistoricalAssetRequests.map(asset => asset.requestKey),
    );

    const trackedUnsupported = unsupportedAssetRequestKeysRef.current;
    for (const assetRequestKey of Array.from(trackedUnsupported)) {
      if (!activeAssetRequestKeys.has(assetRequestKey)) {
        trackedUnsupported.delete(assetRequestKey);
      }
    }
    for (const assetRequestKey of activeAssetRequestKeys) {
      trackedUnsupported.add(assetRequestKey);
    }
  }, [missingHistoricalAssetRequests]);

  useEffect(() => {
    const inFlightFetchByAssetRequest = inFlightFetchByAssetRequestRef.current;
    const unsupportedAssetRequestKeys = unsupportedAssetRequestKeysRef.current;

    return () => {
      inFlightFetchByAssetRequest.clear();
      lastFetchAttemptByAssetRequestRef.current = {};
      unsupportedAssetRequestKeys.clear();
      lastPopulateTriggerAtRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (!isFocused || !missingHistoricalAssetRequests.length) {
      return;
    }

    let cancelled = false;
    let sweepInFlight = false;
    const minRetryMs = HISTORIC_RATES_CACHE_DURATION * 1000;
    const fiatCode = (quoteCurrency || 'USD').toUpperCase();

    const runSweep = async () => {
      if (cancelled || sweepInFlight) {
        return;
      }

      sweepInFlight = true;
      try {
        let hasSupportTransition = false;
        for (const assetRequest of missingHistoricalAssetRequests) {
          if (cancelled) {
            return;
          }

          const assetRequestKey = assetRequest.requestKey;
          const wasPreviouslyUnsupported =
            unsupportedAssetRequestKeysRef.current.has(assetRequestKey);
          unsupportedAssetRequestKeysRef.current.add(assetRequestKey);

          if (inFlightFetchByAssetRequestRef.current.has(assetRequestKey)) {
            continue;
          }

          const lastAttempt =
            lastFetchAttemptByAssetRequestRef.current[assetRequestKey] || 0;
          if (Date.now() - lastAttempt < minRetryMs) {
            continue;
          }

          inFlightFetchByAssetRequestRef.current.add(assetRequestKey);
          lastFetchAttemptByAssetRequestRef.current[assetRequestKey] =
            Date.now();
          try {
            await dispatch(
              fetchFiatRateSeriesAllIntervals({
                fiatCode,
                currencyAbbreviation: assetRequest.coin,
                chain: assetRequest.tokenAddress
                  ? assetRequest.chain
                  : undefined,
                tokenAddress: assetRequest.tokenAddress,
              }),
            );
          } finally {
            inFlightFetchByAssetRequestRef.current.delete(assetRequestKey);
          }

          const fiatRateSeriesCacheAfterFetch =
            store.getState().RATE?.fiatRateSeriesCache;
          const isSupportedAfterFetch = hasHistoricalRateSeriesForAsset({
            cache: fiatRateSeriesCacheAfterFetch,
            fiatCode,
            intervals: CACHED_INTERVALS,
            coin: assetRequest.coin,
            chain: assetRequest.chain,
            tokenAddress: assetRequest.tokenAddress,
          });

          if (isSupportedAfterFetch) {
            unsupportedAssetRequestKeysRef.current.delete(assetRequestKey);
            if (wasPreviouslyUnsupported) {
              hasSupportTransition = true;
            }
          }
        }

        if (hasSupportTransition) {
          const now = Date.now();
          const isPopulateAlreadyInProgress =
            !!store.getState().PORTFOLIO?.populateStatus?.inProgress;
          if (
            !isPopulateAlreadyInProgress &&
            now - lastPopulateTriggerAtRef.current >=
              SUPPORT_TRANSITION_POPULATE_THROTTLE_MS
          ) {
            lastPopulateTriggerAtRef.current = now;
            await dispatch(
              maybePopulatePortfolioForWallets({
                wallets,
                quoteCurrency,
              }),
            );
          }
        }
      } finally {
        sweepInFlight = false;
      }
    };

    runSweep().catch(() => {
      // Keep the sweep best-effort; failures are retried on next cycle.
    });
    const pollInterval = setInterval(() => {
      runSweep().catch(() => {
        // Keep the sweep best-effort; failures are retried on next cycle.
      });
    }, minRetryMs);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [
    dispatch,
    isFocused,
    missingHistoricalAssetRequests,
    quoteCurrency,
    store,
    wallets,
  ]);

  return {
    visibleItems,
    isFiatLoading,
    isPopulateLoadingByKey,
  };
};

export default usePortfolioAssetRows;

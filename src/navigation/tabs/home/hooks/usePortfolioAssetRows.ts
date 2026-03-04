import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useIsFocused} from '@react-navigation/native';
import {useStore} from 'react-redux';
import {HISTORIC_RATES_CACHE_DURATION} from '../../../../constants/wallet';
import {maybePopulatePortfolioForWallets} from '../../../../store/portfolio';
import type {PortfolioState} from '../../../../store/portfolio/portfolio.models';
import type {
  CachedFiatRateInterval,
  Rates,
} from '../../../../store/rate/rate.models';
import {
  FIAT_RATE_SERIES_CACHED_INTERVALS,
  hasValidSeriesForCoin,
} from '../../../../store/rate/rate.models';
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
  getVisibleWalletsFromKeys,
  isFiatLoadingForWallets,
} from '../../../../utils/portfolio/assets';
import {normalizeFiatRateSeriesCoin} from '../../../../utils/portfolio/core/pnl/rates';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';

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
      return getVisibleWalletsFromKeys({[keyId]: keys[keyId]});
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

  const lastFetchAttemptByQuoteCoinRef = useRef<Record<string, number>>({});
  const inFlightFetchByQuoteCoinRef = useRef<Set<string>>(new Set());
  const unsupportedQuoteCoinKeysRef = useRef<Set<string>>(new Set());
  const lastPopulateTriggerAtRef = useRef<number>(0);

  const shouldFetchAllIntervalsForCoin = useCallback(
    (
      coin: string,
      intervals: ReadonlyArray<CachedFiatRateInterval>,
    ): boolean => {
      return !hasValidSeriesForCoin({
        cache: fiatRateSeriesCache,
        fiatCodeUpper: (quoteCurrency || 'USD').toUpperCase(),
        normalizedCoin: coin,
        intervals,
      });
    },
    [fiatRateSeriesCache, quoteCurrency],
  );

  const missingHistoricalCoins = useMemo(() => {
    const coins = new Set<string>();
    for (const item of visibleItems) {
      const coin = normalizeFiatRateSeriesCoin(item.currencyAbbreviation);
      if (!coin) {
        continue;
      }
      if (shouldFetchAllIntervalsForCoin(coin, CACHED_INTERVALS)) {
        coins.add(coin);
      }
    }
    return Array.from(coins).sort((a, b) => a.localeCompare(b));
  }, [shouldFetchAllIntervalsForCoin, visibleItems]);

  const tokenParamsByCoin = useMemo(() => {
    const paramsByCoin: Record<
      string,
      {chain?: string; tokenAddress?: string}
    > = {};
    for (const item of visibleItems) {
      const tokenAddress = item.tokenAddress?.trim();
      const rawCoin = (item.currencyAbbreviation || '').toLowerCase();
      const normalizedCoin = normalizeFiatRateSeriesCoin(rawCoin);
      // Only attach token params when the coin key itself represents
      // the token symbol (e.g. usdc/usdc.e), not aliases like matic->pol.
      if (!tokenAddress || rawCoin !== normalizedCoin) {
        continue;
      }
      if (!paramsByCoin[normalizedCoin]) {
        paramsByCoin[normalizedCoin] = {
          chain: (item.chain || '').toLowerCase(),
          tokenAddress,
        };
      }
    }
    return paramsByCoin;
  }, [visibleItems]);

  useEffect(() => {
    const fiatCode = (quoteCurrency || 'USD').toUpperCase();
    const activeQuoteCoinKeys = new Set(
      missingHistoricalCoins.map(coin => `${fiatCode}:${coin}`),
    );

    const nextLastFetchAttemptByQuoteCoin: Record<string, number> = {};
    for (const quoteCoinKey of Object.keys(
      lastFetchAttemptByQuoteCoinRef.current,
    )) {
      if (activeQuoteCoinKeys.has(quoteCoinKey)) {
        nextLastFetchAttemptByQuoteCoin[quoteCoinKey] =
          lastFetchAttemptByQuoteCoinRef.current[quoteCoinKey];
      }
    }
    lastFetchAttemptByQuoteCoinRef.current = nextLastFetchAttemptByQuoteCoin;
  }, [missingHistoricalCoins, quoteCurrency]);

  useEffect(() => {
    const fiatCode = (quoteCurrency || 'USD').toUpperCase();
    const activeQuoteCoinKeys = new Set(
      missingHistoricalCoins.map(coin => `${fiatCode}:${coin}`),
    );

    const trackedUnsupported = unsupportedQuoteCoinKeysRef.current;
    for (const quoteCoinKey of Array.from(trackedUnsupported)) {
      if (!activeQuoteCoinKeys.has(quoteCoinKey)) {
        trackedUnsupported.delete(quoteCoinKey);
      }
    }
    for (const quoteCoinKey of activeQuoteCoinKeys) {
      trackedUnsupported.add(quoteCoinKey);
    }
  }, [missingHistoricalCoins, quoteCurrency]);

  useEffect(() => {
    const inFlightFetchByQuoteCoin = inFlightFetchByQuoteCoinRef.current;
    const unsupportedQuoteCoinKeys = unsupportedQuoteCoinKeysRef.current;

    return () => {
      inFlightFetchByQuoteCoin.clear();
      lastFetchAttemptByQuoteCoinRef.current = {};
      unsupportedQuoteCoinKeys.clear();
      lastPopulateTriggerAtRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (!isFocused || !missingHistoricalCoins.length) {
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
        for (const coin of missingHistoricalCoins) {
          if (cancelled) {
            return;
          }

          const quoteCoinKey = `${fiatCode}:${coin}`;
          const wasPreviouslyUnsupported =
            unsupportedQuoteCoinKeysRef.current.has(quoteCoinKey);
          unsupportedQuoteCoinKeysRef.current.add(quoteCoinKey);

          if (inFlightFetchByQuoteCoinRef.current.has(quoteCoinKey)) {
            continue;
          }

          const lastAttempt =
            lastFetchAttemptByQuoteCoinRef.current[quoteCoinKey] || 0;
          if (Date.now() - lastAttempt < minRetryMs) {
            continue;
          }

          inFlightFetchByQuoteCoinRef.current.add(quoteCoinKey);
          lastFetchAttemptByQuoteCoinRef.current[quoteCoinKey] = Date.now();
          try {
            const tokenParams = tokenParamsByCoin[coin];
            await dispatch(
              fetchFiatRateSeriesAllIntervals({
                fiatCode,
                currencyAbbreviation: coin,
                chain: tokenParams?.tokenAddress
                  ? tokenParams.chain
                  : undefined,
                tokenAddress: tokenParams?.tokenAddress,
              }),
            );
          } finally {
            inFlightFetchByQuoteCoinRef.current.delete(quoteCoinKey);
          }

          const fiatRateSeriesCacheAfterFetch =
            store.getState().RATE?.fiatRateSeriesCache;
          const isSupportedAfterFetch = hasValidSeriesForCoin({
            cache: fiatRateSeriesCacheAfterFetch,
            fiatCodeUpper: fiatCode,
            normalizedCoin: coin,
            intervals: CACHED_INTERVALS,
          });

          if (isSupportedAfterFetch) {
            unsupportedQuoteCoinKeysRef.current.delete(quoteCoinKey);
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
    missingHistoricalCoins,
    quoteCurrency,
    store,
    tokenParamsByCoin,
    wallets,
  ]);

  return {
    visibleItems,
    isFiatLoading,
    isPopulateLoadingByKey,
  };
};

export default usePortfolioAssetRows;

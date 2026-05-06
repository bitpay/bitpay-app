import {useEffect, useMemo, useState} from 'react';
import {HISTORIC_RATES_CACHE_DURATION} from '../../../constants/wallet';
import {FIAT_RATE_SERIES_TARGET_POINTS} from '../../../store/rate/rate.models';
import type {PnlTimeframe} from '../../core/pnl/analysisStreaming';
import type {StoredWallet} from '../../core/types';
import {
  areBalanceChartHistoricalRatesReady,
  getBalanceChartHistoricalRateCacheKeys,
  getBalanceChartHistoricalRateCacheRevision,
} from '../../../utils/portfolio/balanceChartData';
import {
  buildAssetPnlSummaryCacheKey,
  findCompatibleAssetPnlSummaryCacheEntry,
  getAssetPnlSummaryCacheEntry,
  loadAssetPnlSummary,
  normalizeAssetPnlSummaryIdentity,
  subscribeAssetPnlSummaryCache,
  type AssetPnlSummary,
  type AssetPnlSummaryIdentity,
} from '../assetPnlSummaryCache';
import {runPortfolioBalanceChartViewModelQuery} from '../common';
import usePortfolioHistoricalRateDepsCache from './usePortfolioHistoricalRateDepsCache';

export type AssetPnlSummarySpec = {
  key: string;
  assetKey: string;
  currencyAbbreviation: string;
  chain?: string;
  tokenAddress?: string;
  storedWallets: StoredWallet[];
  walletIds: string[];
  storedWalletRequestSig: string;
  quoteCurrency: string;
  timeframe: PnlTimeframe;
  currentRatesByAssetId: Record<string, number>;
  currentRatesSignature: string;
  currentSpotRatesSignature?: string;
  chartDataRevisionSig: string;
  asOfMs?: number;
  balanceOffset?: number;
  enabled?: boolean;
};

export type AssetPnlSummaryState = {
  key: string;
  cacheKey: string;
  identity: AssetPnlSummaryIdentity;
  summary?: AssetPnlSummary;
  loading: boolean;
  error?: Error;
  ready: boolean;
};

export function useAssetPnlSummaries(args: {
  specs: AssetPnlSummarySpec[];
  enabled?: boolean;
  maxPoints?: number;
  refreshToken?: string | number;
}): Record<string, AssetPnlSummaryState> {
  const enabled = args.enabled !== false;
  const [cacheRevision, setCacheRevision] = useState(0);

  useEffect(() => {
    return subscribeAssetPnlSummaryCache(() => {
      setCacheRevision(revision => revision + 1);
    });
  }, []);

  const historicalRateWallets = useMemo(() => {
    const byWalletId = new Map<string, StoredWallet>();

    for (const spec of args.specs) {
      for (const wallet of spec.storedWallets) {
        const walletId = String(wallet.summary.walletId || '');
        if (!walletId || byWalletId.has(walletId)) {
          continue;
        }
        byWalletId.set(walletId, wallet);
      }
    }

    return Array.from(byWalletId.values());
  }, [args.specs]);
  const historicalRateTimeframes = useMemo(() => {
    return Array.from(
      new Set(args.specs.map(spec => spec.timeframe).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
  }, [args.specs]);
  const quoteCurrency = args.specs[0]?.quoteCurrency || 'USD';
  const historicalRateDeps = usePortfolioHistoricalRateDepsCache({
    wallets: historicalRateWallets,
    quoteCurrency,
    timeframes: historicalRateTimeframes,
    maxAgeMs: HISTORIC_RATES_CACHE_DURATION * 1000,
    refreshToken: args.refreshToken,
    enabled:
      enabled &&
      historicalRateWallets.length > 0 &&
      historicalRateTimeframes.length > 0,
  });

  const statesByKey = useMemo<Record<string, AssetPnlSummaryState>>(() => {
    const next: Record<string, AssetPnlSummaryState> = {};

    for (const spec of args.specs) {
      const depKeys = getBalanceChartHistoricalRateCacheKeys({
        wallets: spec.storedWallets,
        quoteCurrency: spec.quoteCurrency,
        timeframes: [spec.timeframe],
      });
      const historicalRateCacheRevision =
        getBalanceChartHistoricalRateCacheRevision({
          depKeys,
          fiatRateSeriesCache: historicalRateDeps.cache,
        });
      const historicalRatesReady =
        !depKeys.length ||
        areBalanceChartHistoricalRatesReady({
          depKeys,
          fiatRateSeriesCache: historicalRateDeps.cache,
        }) ||
        !!historicalRateDeps.error;
      const identity = normalizeAssetPnlSummaryIdentity({
        assetKey: spec.assetKey,
        currencyAbbreviation: spec.currencyAbbreviation,
        chain: spec.chain,
        tokenAddress: spec.tokenAddress,
        walletIds: spec.walletIds,
        storedWalletRequestSig: spec.storedWalletRequestSig,
        quoteCurrency: spec.quoteCurrency,
        timeframe: spec.timeframe,
        currentRatesSignature: spec.currentRatesSignature,
        chartDataRevisionSig: spec.chartDataRevisionSig,
        summaryCacheRevisionSig: [
          spec.currentSpotRatesSignature || '',
          historicalRateCacheRevision,
        ].join('|'),
        asOfMs: spec.asOfMs,
        balanceOffset: spec.balanceOffset,
      });
      const cacheKey = buildAssetPnlSummaryCacheKey(identity);
      const exactCacheEntry = getAssetPnlSummaryCacheEntry(cacheKey);
      const shouldUseExactCacheEntry =
        historicalRatesReady || !!exactCacheEntry?.summary?.hasPnl;
      const compatibleCacheEntry =
        !shouldUseExactCacheEntry && !exactCacheEntry?.summary
          ? findCompatibleAssetPnlSummaryCacheEntry(identity)
          : undefined;
      const cacheEntry = shouldUseExactCacheEntry
        ? exactCacheEntry
        : compatibleCacheEntry;
      const specEnabled =
        enabled && spec.enabled !== false && spec.storedWallets.length > 0;
      const exactReady =
        !!exactCacheEntry?.summary ||
        (shouldUseExactCacheEntry && !!exactCacheEntry?.error);
      const ready = !!cacheEntry?.summary || !!cacheEntry?.error;
      const loading =
        specEnabled &&
        !exactReady &&
        (!historicalRatesReady || !!cacheEntry?.loading || !cacheEntry);

      next[spec.key] = {
        key: spec.key,
        cacheKey,
        identity,
        summary: cacheEntry?.summary,
        loading,
        error: cacheEntry?.error,
        ready,
      };
    }

    return next;
  }, [
    args.specs,
    cacheRevision,
    enabled,
    historicalRateDeps.cache,
    historicalRateDeps.error,
    historicalRateDeps.loading,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    for (const spec of args.specs) {
      if (spec.enabled === false || !spec.storedWallets.length) {
        continue;
      }

      const state = statesByKey[spec.key];
      const exactCacheEntry = state
        ? getAssetPnlSummaryCacheEntry(state.cacheKey)
        : undefined;
      if (
        !state ||
        exactCacheEntry?.summary ||
        state.error ||
        exactCacheEntry?.loading
      ) {
        continue;
      }

      const depKeys = getBalanceChartHistoricalRateCacheKeys({
        wallets: spec.storedWallets,
        quoteCurrency: spec.quoteCurrency,
        timeframes: [spec.timeframe],
      });
      const historicalRatesReady =
        !depKeys.length ||
        areBalanceChartHistoricalRatesReady({
          depKeys,
          fiatRateSeriesCache: historicalRateDeps.cache,
        }) ||
        !!historicalRateDeps.error;

      if (!historicalRatesReady) {
        continue;
      }

      loadAssetPnlSummary({
        identity: state.identity,
        query: () =>
          runPortfolioBalanceChartViewModelQuery({
            wallets: spec.storedWallets,
            quoteCurrency: spec.quoteCurrency,
            timeframe: spec.timeframe,
            maxPoints: args.maxPoints ?? FIAT_RATE_SERIES_TARGET_POINTS,
            currentRatesByAssetId: spec.currentRatesByAssetId,
            dataRevisionSig: spec.chartDataRevisionSig,
            walletIds: spec.walletIds,
            balanceOffset: spec.balanceOffset,
            asOfMs: spec.asOfMs,
            summaryCacheRevisionSig: state.identity.summaryCacheRevisionSig,
          }),
      });
    }
  }, [
    args.maxPoints,
    args.specs,
    enabled,
    historicalRateDeps.cache,
    historicalRateDeps.error,
    historicalRateDeps.loading,
    statesByKey,
  ]);

  return statesByKey;
}

export default useAssetPnlSummaries;
